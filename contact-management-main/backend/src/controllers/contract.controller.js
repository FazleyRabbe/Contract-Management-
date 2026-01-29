const { Contract, AuditLog, ServiceProviderRequest } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationMeta, parseSortQuery, buildSearchQuery, generateContractRef } = require('../utils/helpers');
const { CONTRACT_STATUS, AUDIT_ACTIONS, PAGINATION, ROLES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * @desc    Create a new contract
 * @route   POST /api/contracts
 * @access  Private (Client)
 */
const createContract = asyncHandler(async (req, res, next) => {
  const contractData = {
    ...req.body,
    client: req.userId,
    status: CONTRACT_STATUS.DRAFT,
    referenceNumber: generateContractRef(),
  };

  const contract = await Contract.create(contractData);

  // Log creation
  await AuditLog.log({
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: { after: contract.toObject() },
    metadata: { ipAddress: req.ip },
    description: `Contract "${contract.title}" created`,
  });

  logger.info(`Contract ${contract.referenceNumber} created by user ${req.userId}`);

  const response = ApiResponse.created(
    { contract },
    'Contract created successfully'
  );

  res.status(201).json(response);
});

/**
 * @desc    Get all contracts
 * @route   GET /api/contracts
 * @access  Private
 */
const getContracts = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    status,
    contractType,
    search,
    sort,
    startDateFrom,
    startDateTo,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  let query = { isDeleted: false };

  // Role-based filtering
  if (req.user.role === ROLES.CLIENT) {
    query.client = req.userId;
  } else if (req.user.role === ROLES.PROCUREMENT_MANAGER) {
    // Procurement managers see only pending_procurement contracts
    query.status = CONTRACT_STATUS.PENDING_PROCUREMENT;
  } else if (req.user.role === ROLES.LEGAL_COUNSEL) {
    // Legal counsel sees only pending_legal contracts
    query.status = CONTRACT_STATUS.PENDING_LEGAL;
  } else if (req.user.role === ROLES.CONTRACT_COORDINATOR) {
    // Coordinators see open_for_offers and offer_selected contracts
    query.status = { $in: [CONTRACT_STATUS.OPEN_FOR_OFFERS, CONTRACT_STATUS.OFFER_SELECTED] };
  }
  // Admin and service_provider see all contracts (no additional filter)

  // Status filter (override role-based status filter if explicitly requested)
  if (status) {
    query.status = status;
  }

  // Contract type filter
  if (contractType) {
    query.contractType = contractType;
  }

  // Date range filter
  if (startDateFrom || startDateTo) {
    query.startDate = {};
    if (startDateFrom) query.startDate.$gte = new Date(startDateFrom);
    if (startDateTo) query.startDate.$lte = new Date(startDateTo);
  }

  // Search filter
  if (search) {
    const searchQuery = buildSearchQuery(search, ['title', 'description', 'referenceNumber']);
    query = { ...query, ...searchQuery };
  }

  // Sort
  const sortObj = parseSortQuery(sort, ['createdAt', 'startDate', 'endDate', 'title']);

  // Execute query
  const [contracts, total] = await Promise.all([
    Contract.find(query)
      .populate('client', 'firstName lastName email')
      .populate('assignedProvider')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Contract.countDocuments(query),
  ]);

  const pagination = getPaginationMeta(total, pageNum, limitNum);

  res.status(200).json(ApiResponse.paginated(contracts, pagination));
});

/**
 * @desc    Get single contract
 * @route   GET /api/contracts/:id
 * @access  Private
 */
const getContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('client', 'firstName lastName email phone')
    .populate({
      path: 'assignedProvider',
      populate: { path: 'user', select: 'firstName lastName email avatar' },
    })
    .populate({
      path: 'workflow.coordinator.selectedOffer',
      select: 'offerAmount proposedTimeline description providerDetails status selectedAt',
      populate: {
        path: 'provider',
        select: 'name email category tags',
      },
    });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  // Check access - allow admin, client owner, and workflow roles
  const isOwner = contract.client._id.toString() === req.userId.toString();
  const isWorkflowRole = [
    ROLES.PROCUREMENT_MANAGER,
    ROLES.LEGAL_COUNSEL,
    ROLES.CONTRACT_COORDINATOR,
  ].includes(req.user.role);

  if (req.user.role !== ROLES.ADMIN && !isOwner && !isWorkflowRole) {
    return next(ApiError.forbidden('Access denied'));
  }

  // Increment view count
  await Contract.findByIdAndUpdate(req.params.id, {
    $inc: { 'metadata.viewCount': 1 },
  });

  res.status(200).json(ApiResponse.success({ contract }));
});

/**
 * @desc    Update contract
 * @route   PUT /api/contracts/:id
 * @access  Private (Client - own contracts only)
 */
const updateContract = asyncHandler(async (req, res, next) => {
  let contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  // Check ownership - allow admin, client owner, and workflow roles for their respective statuses
  const isOwner = contract.client.toString() === req.userId.toString();
  const isProcurementEdit = req.user.role === ROLES.PROCUREMENT_MANAGER &&
    contract.status === CONTRACT_STATUS.PENDING_PROCUREMENT;
  const isLegalEdit = req.user.role === ROLES.LEGAL_COUNSEL &&
    contract.status === CONTRACT_STATUS.PENDING_LEGAL;
  const isCoordinatorEdit = req.user.role === ROLES.CONTRACT_COORDINATOR;

  if (req.user.role !== ROLES.ADMIN && !isOwner && !isProcurementEdit && !isLegalEdit && !isCoordinatorEdit) {
    return next(ApiError.forbidden('Access denied'));
  }

  // Check if contract can be edited
  if (!contract.canBeEdited()) {
    return next(
      ApiError.badRequest('Contract cannot be edited in its current status')
    );
  }

  const beforeState = contract.toObject();

  // Update allowed fields
  const allowedUpdates = [
    'title',
    'contractType',
    'description',
    'targetConditions',
    'targetPersons',
    'budget',
    'startDate',
    'endDate',
  ];

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      contract[field] = req.body[field];
    }
  });

  await contract.save();

  // Log update
  await AuditLog.log({
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: { before: beforeState, after: contract.toObject() },
    metadata: { ipAddress: req.ip },
    description: `Contract "${contract.title}" updated`,
  });

  res.status(200).json(
    ApiResponse.success({ contract }, 'Contract updated successfully')
  );
});

/**
 * @desc    Delete contract (soft delete)
 * @route   DELETE /api/contracts/:id
 * @access  Private (Client - own contracts, Admin - any)
 */
const deleteContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  // Check ownership
  if (
    req.user.role !== ROLES.ADMIN &&
    contract.client.toString() !== req.userId.toString()
  ) {
    return next(ApiError.forbidden('Access denied'));
  }

  // Soft delete
  await Contract.softDelete(req.params.id, req.userId);

  // Log deletion
  await AuditLog.log({
    action: AUDIT_ACTIONS.DELETE,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    metadata: { ipAddress: req.ip },
    description: `Contract "${contract.title}" deleted`,
  });

  res.status(200).json(ApiResponse.success(null, 'Contract deleted successfully'));
});

/**
 * @desc    Submit contract for approval (new workflow - goes to Procurement Manager)
 * @route   POST /api/contracts/:id/submit
 * @access  Private (Client)
 */
const submitForApproval = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    client: req.userId,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (contract.status !== CONTRACT_STATUS.DRAFT) {
    return next(ApiError.badRequest('Only draft contracts can be submitted for approval'));
  }

  // New workflow: Submit to Procurement Manager first
  await contract.transitionTo(CONTRACT_STATUS.PENDING_PROCUREMENT);

  // Log status change
  await AuditLog.log({
    action: AUDIT_ACTIONS.STATUS_CHANGE,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.DRAFT },
      after: { status: CONTRACT_STATUS.PENDING_PROCUREMENT },
    },
    metadata: { ipAddress: req.ip },
    description: 'Contract submitted for procurement review',
  });

  logger.info(`Contract ${contract.referenceNumber} submitted for procurement review by client ${req.userId}`);

  res.status(200).json(
    ApiResponse.success({ contract }, 'Contract submitted for procurement review')
  );
});

/**
 * @desc    Approve contract (Admin only)
 * @route   POST /api/contracts/:id/approve
 * @access  Private (Admin)
 */
const approveContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (contract.status !== CONTRACT_STATUS.PENDING_APPROVAL) {
    return next(ApiError.badRequest('Only pending contracts can be approved'));
  }

  await contract.transitionTo(CONTRACT_STATUS.PUBLISHED);

  // Log approval
  await AuditLog.log({
    action: AUDIT_ACTIONS.APPROVE,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.PENDING_APPROVAL },
      after: { status: CONTRACT_STATUS.PUBLISHED },
    },
    metadata: { ipAddress: req.ip },
    description: 'Contract approved and published',
  });

  res.status(200).json(
    ApiResponse.success({ contract }, 'Contract approved and published')
  );
});

/**
 * @desc    Reject contract (Admin only)
 * @route   POST /api/contracts/:id/reject
 * @access  Private (Admin)
 */
const rejectContract = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (contract.status !== CONTRACT_STATUS.PENDING_APPROVAL) {
    return next(ApiError.badRequest('Only pending contracts can be rejected'));
  }

  // Move back to draft
  contract.status = CONTRACT_STATUS.DRAFT;
  await contract.save();

  // Log rejection
  await AuditLog.log({
    action: AUDIT_ACTIONS.REJECT,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.PENDING_APPROVAL },
      after: { status: CONTRACT_STATUS.DRAFT },
    },
    metadata: { ipAddress: req.ip, reason },
    description: `Contract rejected: ${reason || 'No reason provided'}`,
  });

  res.status(200).json(
    ApiResponse.success({ contract, reason }, 'Contract rejected')
  );
});

/**
 * @desc    Get contract statistics (Admin dashboard)
 * @route   GET /api/contracts/stats
 * @access  Private (Admin)
 */
const getContractStats = asyncHandler(async (req, res) => {
  const stats = await Contract.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBudgetMin: { $sum: '$budget.minimum' },
        totalBudgetMax: { $sum: '$budget.maximum' },
      },
    },
  ]);

  // Calculate totals
  const totalContracts = stats.reduce((acc, s) => acc + s.count, 0);
  const activeContracts = stats
    .filter((s) =>
      [CONTRACT_STATUS.IN_PROGRESS, CONTRACT_STATUS.PROVIDER_ASSIGNED, CONTRACT_STATUS.FINAL_APPROVED].includes(s._id)
    )
    .reduce((acc, s) => acc + s.count, 0);
  const pendingApproval =
    stats.find((s) => s._id === CONTRACT_STATUS.PENDING_APPROVAL)?.count || 0;
  const draftContracts =
    stats.find((s) => s._id === CONTRACT_STATUS.DRAFT)?.count || 0;
  const publishedContracts =
    stats.find((s) => s._id === CONTRACT_STATUS.PUBLISHED)?.count || 0;
  const completedContracts =
    stats.find((s) => s._id === CONTRACT_STATUS.COMPLETED)?.count || 0;

  // New workflow statuses
  const pendingProcurement =
    stats.find((s) => s._id === CONTRACT_STATUS.PENDING_PROCUREMENT)?.count || 0;
  const pendingLegal =
    stats.find((s) => s._id === CONTRACT_STATUS.PENDING_LEGAL)?.count || 0;
  const openForOffers =
    stats.find((s) => s._id === CONTRACT_STATUS.OPEN_FOR_OFFERS)?.count || 0;
  const offerSelected =
    stats.find((s) => s._id === CONTRACT_STATUS.OFFER_SELECTED)?.count || 0;
  const pendingFinalApproval =
    stats.find((s) => s._id === CONTRACT_STATUS.PENDING_FINAL_APPROVAL)?.count || 0;
  const finalApproved =
    stats.find((s) => s._id === CONTRACT_STATUS.FINAL_APPROVED)?.count || 0;
  const rejected =
    stats.find((s) => s._id === CONTRACT_STATUS.REJECTED)?.count || 0;

  res.status(200).json(
    ApiResponse.success({
      totalContracts,
      activeContracts,
      pendingApproval,
      draftContracts,
      publishedContracts,
      completedContracts,
      // New workflow stats
      pendingProcurement,
      pendingLegal,
      openForOffers,
      offerSelected,
      pendingFinalApproval,
      finalApproved,
      rejected,
      breakdown: stats,
    })
  );
});

/**
 * @desc    Get contract audit history
 * @route   GET /api/contracts/:id/history
 * @access  Private (Admin, Contract Owner)
 */
const getContractHistory = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findById(req.params.id);

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

  const history = await AuditLog.getEntityHistory('Contract', req.params.id);

  res.status(200).json(ApiResponse.success({ history }));
});

module.exports = {
  createContract,
  getContracts,
  getContract,
  updateContract,
  deleteContract,
  submitForApproval,
  approveContract,
  rejectContract,
  getContractStats,
  getContractHistory,
};
