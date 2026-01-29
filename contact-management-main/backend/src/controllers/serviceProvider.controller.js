const {
  ServiceProvider,
  ServiceProviderRequest,
  Contract,
  Review,
  User,
  AuditLog,
} = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationMeta, parseSortQuery } = require('../utils/helpers');
const {
  CONTRACT_STATUS,
  SP_REQUEST_STATUS,
  AUDIT_ACTIONS,
  PAGINATION,
  ROLES,
} = require('../config/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get all service providers
 * @route   GET /api/service-providers
 * @access  Private
 */
const getServiceProviders = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    minRating,
    availability,
    sort,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  let query = { isActive: true };

  if (minRating) {
    query['rating.average'] = { $gte: parseFloat(minRating) };
  }

  if (availability) {
    query.availability = availability;
  }

  // Sort
  const sortObj = parseSortQuery(sort, [
    'rating.average',
    'completedTasks',
    'createdAt',
  ]);

  // Execute query
  const [providers, total] = await Promise.all([
    ServiceProvider.find(query)
      .populate('user', 'firstName lastName email avatar city country')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    ServiceProvider.countDocuments(query),
  ]);

  // Filter by search if provided (search in populated user fields)
  let filteredProviders = providers;
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filteredProviders = providers.filter(
      (p) =>
        searchRegex.test(p.user?.firstName) ||
        searchRegex.test(p.user?.lastName) ||
        searchRegex.test(p.coreRole) ||
        p.expertise?.some((e) => searchRegex.test(e))
    );
  }

  const pagination = getPaginationMeta(total, pageNum, limitNum);

  res.status(200).json(ApiResponse.paginated(filteredProviders, pagination));
});

/**
 * @desc    Get single service provider
 * @route   GET /api/service-providers/:id
 * @access  Private
 */
const getServiceProvider = asyncHandler(async (req, res, next) => {
  const provider = await ServiceProvider.findById(req.params.id)
    .populate('user', 'firstName lastName email avatar city country phone')
    .populate({
      path: 'workHistory.contractId',
      select: 'title referenceNumber',
    });

  if (!provider) {
    return next(ApiError.notFound('Service provider not found'));
  }

  // Get reviews
  const reviews = await Review.getProviderReviews(req.params.id);

  res.status(200).json(ApiResponse.success({ provider, reviews }));
});

/**
 * @desc    Create service provider request for a contract
 * @route   POST /api/contracts/:contractId/requests
 * @access  Private (Service Provider)
 */
const createRequest = asyncHandler(async (req, res, next) => {
  const { contractId } = req.params;

  // Check if contract exists and accepts requests
  const contract = await Contract.findOne({
    _id: contractId,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (!contract.acceptsRequests()) {
    return next(
      ApiError.badRequest('This contract is not accepting requests')
    );
  }

  // Get service provider profile
  const serviceProvider = await ServiceProvider.findOne({ user: req.userId });

  if (!serviceProvider) {
    return next(
      ApiError.badRequest('You must have a service provider profile to submit requests')
    );
  }

  // Check for existing request
  const existingRequest = await ServiceProviderRequest.findOne({
    contract: contractId,
    serviceProvider: serviceProvider._id,
  });

  if (existingRequest) {
    return next(
      ApiError.conflict('You have already submitted a request for this contract')
    );
  }

  // Create request
  const requestData = {
    ...req.body,
    contract: contractId,
    serviceProvider: serviceProvider._id,
    status: SP_REQUEST_STATUS.PENDING,
  };

  const request = await ServiceProviderRequest.create(requestData);

  // Update contract request count
  await Contract.findByIdAndUpdate(contractId, {
    $inc: { 'metadata.requestCount': 1 },
  });

  // Log request creation
  await AuditLog.log({
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'ServiceProviderRequest',
    entityId: request._id,
    performedBy: req.userId,
    metadata: { contractId },
    description: 'Service provider request submitted',
  });

  res.status(201).json(
    ApiResponse.created({ request }, 'Request submitted successfully')
  );
});

/**
 * @desc    Get requests for a contract
 * @route   GET /api/contracts/:contractId/requests
 * @access  Private (Contract Owner, Admin)
 */
const getContractRequests = asyncHandler(async (req, res, next) => {
  const { contractId } = req.params;

  const contract = await Contract.findById(contractId);

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  // Check access
  if (
    req.user.role !== ROLES.ADMIN &&
    contract.client.toString() !== req.userId.toString()
  ) {
    return next(ApiError.forbidden('Access denied'));
  }

  const requests = await ServiceProviderRequest.getContractRequests(contractId);

  res.status(200).json(ApiResponse.success({ requests }));
});

/**
 * @desc    Get provider's own requests
 * @route   GET /api/service-providers/my-requests
 * @access  Private (Service Provider)
 */
const getMyRequests = asyncHandler(async (req, res, next) => {
  const serviceProvider = await ServiceProvider.findOne({ user: req.userId });

  if (!serviceProvider) {
    return next(ApiError.notFound('Service provider profile not found'));
  }

  const requests = await ServiceProviderRequest.getProviderRequests(
    serviceProvider._id
  );

  res.status(200).json(ApiResponse.success({ requests }));
});

/**
 * @desc    Accept a service provider request
 * @route   POST /api/contracts/requests/:requestId/accept
 * @access  Private (Contract Owner)
 */
const acceptRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { notes } = req.body;

  const request = await ServiceProviderRequest.findById(requestId).populate('contract');

  if (!request) {
    return next(ApiError.notFound('Request not found'));
  }

  // Check ownership of contract
  if (
    req.user.role !== ROLES.ADMIN &&
    request.contract.client.toString() !== req.userId.toString()
  ) {
    return next(ApiError.forbidden('Access denied'));
  }

  if (request.status !== SP_REQUEST_STATUS.PENDING) {
    return next(ApiError.badRequest('Only pending requests can be accepted'));
  }

  // Accept the request
  await request.accept(notes);

  // Update contract
  const contract = await Contract.findById(request.contract._id);
  contract.assignedProvider = request.serviceProvider;
  contract.selectedRequest = request._id;
  await contract.transitionTo(CONTRACT_STATUS.PROVIDER_ASSIGNED);

  // Reject all other pending requests
  await ServiceProviderRequest.updateMany(
    {
      contract: request.contract._id,
      _id: { $ne: requestId },
      status: SP_REQUEST_STATUS.PENDING,
    },
    {
      status: SP_REQUEST_STATUS.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: 'Another provider was selected',
    }
  );

  // Log acceptance
  await AuditLog.log({
    action: AUDIT_ACTIONS.APPROVE,
    entityType: 'ServiceProviderRequest',
    entityId: request._id,
    performedBy: req.userId,
    metadata: { contractId: request.contract._id },
    description: 'Service provider request accepted',
  });

  res.status(200).json(
    ApiResponse.success({ request, contract }, 'Request accepted successfully')
  );
});

/**
 * @desc    Reject a service provider request
 * @route   POST /api/contracts/requests/:requestId/reject
 * @access  Private (Contract Owner)
 */
const rejectRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;
  const { reason } = req.body;

  const request = await ServiceProviderRequest.findById(requestId).populate('contract');

  if (!request) {
    return next(ApiError.notFound('Request not found'));
  }

  // Check ownership
  if (
    req.user.role !== ROLES.ADMIN &&
    request.contract.client.toString() !== req.userId.toString()
  ) {
    return next(ApiError.forbidden('Access denied'));
  }

  if (request.status !== SP_REQUEST_STATUS.PENDING) {
    return next(ApiError.badRequest('Only pending requests can be rejected'));
  }

  await request.reject(reason);

  // Log rejection
  await AuditLog.log({
    action: AUDIT_ACTIONS.REJECT,
    entityType: 'ServiceProviderRequest',
    entityId: request._id,
    performedBy: req.userId,
    metadata: { contractId: request.contract._id, reason },
    description: 'Service provider request rejected',
  });

  res.status(200).json(
    ApiResponse.success({ request }, 'Request rejected successfully')
  );
});

/**
 * @desc    Withdraw a request (by service provider)
 * @route   POST /api/contracts/requests/:requestId/withdraw
 * @access  Private (Service Provider)
 */
const withdrawRequest = asyncHandler(async (req, res, next) => {
  const { requestId } = req.params;

  const serviceProvider = await ServiceProvider.findOne({ user: req.userId });

  if (!serviceProvider) {
    return next(ApiError.notFound('Service provider profile not found'));
  }

  const request = await ServiceProviderRequest.findOne({
    _id: requestId,
    serviceProvider: serviceProvider._id,
  });

  if (!request) {
    return next(ApiError.notFound('Request not found'));
  }

  await request.withdraw();

  res.status(200).json(
    ApiResponse.success({ request }, 'Request withdrawn successfully')
  );
});

/**
 * @desc    Submit a review for completed contract
 * @route   POST /api/contracts/:contractId/review
 * @access  Private (Contract Owner)
 */
const submitReview = asyncHandler(async (req, res, next) => {
  const { contractId } = req.params;
  const { rating, comment, categories } = req.body;

  const contract = await Contract.findById(contractId);

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  // Check ownership
  if (contract.client.toString() !== req.userId.toString()) {
    return next(ApiError.forbidden('Only contract owner can submit review'));
  }

  // Check if contract is completed
  if (contract.status !== CONTRACT_STATUS.COMPLETED) {
    return next(ApiError.badRequest('Can only review completed contracts'));
  }

  // Check if already reviewed
  const existingReview = await Review.findOne({
    contract: contractId,
    client: req.userId,
  });

  if (existingReview) {
    return next(ApiError.conflict('You have already reviewed this contract'));
  }

  // Create review
  const review = await Review.create({
    contract: contractId,
    serviceProvider: contract.assignedProvider,
    client: req.userId,
    rating,
    comment,
    categories,
  });

  // Update contract with review
  contract.review = {
    rating,
    comment,
    createdAt: new Date(),
  };
  await contract.save();

  // Update service provider work history
  const serviceProvider = await ServiceProvider.findById(contract.assignedProvider);
  if (serviceProvider) {
    await serviceProvider.addWorkHistory({
      contractId: contract._id,
      clientId: req.userId,
      title: contract.title,
      completedAt: contract.completedAt,
      rating,
      review: comment,
    });
    await serviceProvider.incrementCompletedTasks();
  }

  res.status(201).json(
    ApiResponse.created({ review }, 'Review submitted successfully')
  );
});

/**
 * @desc    Get service provider stats (for admin dashboard)
 * @route   GET /api/service-providers/stats
 * @access  Private (Admin)
 */
const getProviderStats = asyncHandler(async (req, res) => {
  const [totalProviders, verifiedProviders, topProviders] = await Promise.all([
    ServiceProvider.countDocuments({ isActive: true }),
    ServiceProvider.countDocuments({ isActive: true, isVerified: true }),
    ServiceProvider.find({ isActive: true })
      .sort({ 'rating.average': -1, completedTasks: -1 })
      .limit(10)
      .populate('user', 'firstName lastName avatar')
      .lean(),
  ]);

  res.status(200).json(
    ApiResponse.success({
      totalProviders,
      verifiedProviders,
      topProviders,
    })
  );
});

module.exports = {
  getServiceProviders,
  getServiceProvider,
  createRequest,
  getContractRequests,
  getMyRequests,
  acceptRequest,
  rejectRequest,
  withdrawRequest,
  submitReview,
  getProviderStats,
};
