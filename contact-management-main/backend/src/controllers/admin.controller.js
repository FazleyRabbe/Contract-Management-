const { User, Contract, ServiceProvider, AuditLog, Offer, Provider } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationMeta, parseSortQuery } = require('../utils/helpers');
const { ROLES, CONTRACT_STATUS, AUDIT_ACTIONS, PAGINATION } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin)
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Get contract statistics
  const contractStats = await Contract.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // Get user statistics
  const userStats = await User.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
      },
    },
  ]);

  // Get provider statistics
  const providerStats = await ServiceProvider.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalProviders: { $sum: 1 },
        avgRating: { $avg: '$rating.average' },
        totalCompletedTasks: { $sum: '$completedTasks' },
      },
    },
  ]);

  // Calculate contract totals
  const statusMap = {};
  contractStats.forEach((s) => {
    statusMap[s._id] = s.count;
  });

  const totalContracts = Object.values(statusMap).reduce((a, b) => a + b, 0);

  // Calculate user totals
  const roleMap = {};
  userStats.forEach((s) => {
    roleMap[s._id] = s.count;
  });

  // Format response
  const dashboardData = {
    contracts: {
      total: totalContracts,
      active:
        (statusMap[CONTRACT_STATUS.IN_PROGRESS] || 0) +
        (statusMap[CONTRACT_STATUS.PROVIDER_ASSIGNED] || 0),
      pendingApproval: statusMap[CONTRACT_STATUS.PENDING_APPROVAL] || 0,
      draft: statusMap[CONTRACT_STATUS.DRAFT] || 0,
      published: statusMap[CONTRACT_STATUS.PUBLISHED] || 0,
      completed: statusMap[CONTRACT_STATUS.COMPLETED] || 0,
      cancelled: statusMap[CONTRACT_STATUS.CANCELLED] || 0,
      // New workflow statuses
      pendingProcurement: statusMap[CONTRACT_STATUS.PENDING_PROCUREMENT] || 0,
      pendingLegal: statusMap[CONTRACT_STATUS.PENDING_LEGAL] || 0,
      openForOffers: statusMap[CONTRACT_STATUS.OPEN_FOR_OFFERS] || 0,
      offerSelected: statusMap[CONTRACT_STATUS.OFFER_SELECTED] || 0,
      pendingFinalApproval: statusMap[CONTRACT_STATUS.PENDING_FINAL_APPROVAL] || 0,
      finalApproved: statusMap[CONTRACT_STATUS.FINAL_APPROVED] || 0,
      rejected: statusMap[CONTRACT_STATUS.REJECTED] || 0,
    },
    users: {
      total: Object.values(roleMap).reduce((a, b) => a + b, 0),
      admins: roleMap[ROLES.ADMIN] || 0,
      clients: roleMap[ROLES.CLIENT] || 0,
      serviceProviders: roleMap[ROLES.SERVICE_PROVIDER] || 0,
      procurementManagers: roleMap[ROLES.PROCUREMENT_MANAGER] || 0,
      legalCounsels: roleMap[ROLES.LEGAL_COUNSEL] || 0,
      contractCoordinators: roleMap[ROLES.CONTRACT_COORDINATOR] || 0,
    },
    serviceProviders: providerStats[0] || {
      totalProviders: 0,
      avgRating: 0,
      totalCompletedTasks: 0,
    },
  };

  res.status(200).json(ApiResponse.success(dashboardData));
});

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getUsers = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    role,
    isActive,
    search,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const query = {};

  if (role) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query),
  ]);

  const pagination = getPaginationMeta(total, pageNum, limitNum);

  res.status(200).json(ApiResponse.paginated(users, pagination));
});

/**
 * @desc    Get single user
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin)
 */
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select(
    '-password -refreshToken'
  );

  if (!user) {
    return next(ApiError.notFound('User not found'));
  }

  // Get additional data based on role
  let additionalData = {};

  if (user.role === ROLES.SERVICE_PROVIDER) {
    const providerProfile = await ServiceProvider.findOne({ user: user._id });
    additionalData.providerProfile = providerProfile;
  }

  if (user.role === ROLES.CLIENT) {
    const contracts = await Contract.find({
      client: user._id,
      isDeleted: false,
    }).select('title status referenceNumber createdAt');
    additionalData.contracts = contracts;
  }

  res.status(200).json(ApiResponse.success({ user, ...additionalData }));
});

/**
 * @desc    Update user status (activate/deactivate)
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin)
 */
const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { isActive } = req.body;

  // Prevent self-deactivation
  if (req.params.id === req.userId.toString()) {
    return next(ApiError.badRequest('Cannot deactivate your own account'));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true, runValidators: true }
  ).select('-password -refreshToken');

  if (!user) {
    return next(ApiError.notFound('User not found'));
  }

  res.status(200).json(
    ApiResponse.success(
      { user },
      `User ${isActive ? 'activated' : 'deactivated'} successfully`
    )
  );
});

/**
 * @desc    Create admin user
 * @route   POST /api/admin/users
 * @access  Private (Admin)
 */
const createAdminUser = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  // Check if email exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(ApiError.conflict('Email already registered'));
  }

  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    role: ROLES.ADMIN,
    isEmailVerified: true,
  });

  user.password = undefined;

  res.status(201).json(
    ApiResponse.created({ user }, 'Admin user created successfully')
  );
});

/**
 * @desc    Get audit logs
 * @route   GET /api/admin/audit-logs
 * @access  Private (Admin)
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    entityType,
    action,
    userId,
    startDate,
    endDate,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const query = {};

  if (entityType) {
    query.entityType = entityType;
  }

  if (action) {
    query.action = action;
  }

  if (userId) {
    query.performedBy = userId;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('performedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  const pagination = getPaginationMeta(total, pageNum, limitNum);

  res.status(200).json(ApiResponse.paginated(logs, pagination));
});

/**
 * @desc    Get reports
 * @route   GET /api/admin/reports
 * @access  Private (Admin)
 */
const getReports = asyncHandler(async (req, res) => {
  const { type, startDate, endDate } = req.query;

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  let report = {};

  switch (type) {
    case 'contracts':
      report = await generateContractReport(dateFilter);
      break;
    case 'users':
      report = await generateUserReport(dateFilter);
      break;
    case 'providers':
      report = await generateProviderReport(dateFilter);
      break;
    default:
      // General overview report
      report = {
        contracts: await generateContractReport(dateFilter),
        users: await generateUserReport(dateFilter),
        providers: await generateProviderReport(dateFilter),
      };
  }

  res.status(200).json(ApiResponse.success({ report, type: type || 'overview' }));
});

// Helper function for contract reports
const generateContractReport = async (dateFilter) => {
  const matchStage = { isDeleted: false };
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }

  const report = await Contract.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          status: '$status',
          type: '$contractType',
        },
        count: { $sum: 1 },
        totalBudgetMin: { $sum: '$budget.minimum' },
        totalBudgetMax: { $sum: '$budget.maximum' },
        avgBudgetMin: { $avg: '$budget.minimum' },
        avgBudgetMax: { $avg: '$budget.maximum' },
      },
    },
    {
      $group: {
        _id: '$_id.status',
        byType: {
          $push: {
            type: '$_id.type',
            count: '$count',
            budget: {
              totalMin: '$totalBudgetMin',
              totalMax: '$totalBudgetMax',
              avgMin: '$avgBudgetMin',
              avgMax: '$avgBudgetMax',
            },
          },
        },
        totalCount: { $sum: '$count' },
      },
    },
  ]);

  return report;
};

// Helper function for user reports
const generateUserReport = async (dateFilter) => {
  const matchStage = {};
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }

  const report = await User.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          role: '$role',
          isActive: '$isActive',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.role',
        activeUsers: {
          $sum: { $cond: ['$_id.isActive', '$count', 0] },
        },
        inactiveUsers: {
          $sum: { $cond: ['$_id.isActive', 0, '$count'] },
        },
        totalUsers: { $sum: '$count' },
      },
    },
  ]);

  return report;
};

// Helper function for provider reports
const generateProviderReport = async (dateFilter) => {
  const matchStage = { isActive: true };
  if (Object.keys(dateFilter).length > 0) {
    matchStage.createdAt = dateFilter;
  }

  const report = await ServiceProvider.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalProviders: { $sum: 1 },
        avgRating: { $avg: '$rating.average' },
        totalCompletedTasks: { $sum: '$completedTasks' },
        avgCompletedTasks: { $avg: '$completedTasks' },
        verifiedProviders: {
          $sum: { $cond: ['$isVerified', 1, 0] },
        },
      },
    },
  ]);

  return report[0] || {
    totalProviders: 0,
    avgRating: 0,
    totalCompletedTasks: 0,
    avgCompletedTasks: 0,
    verifiedProviders: 0,
  };
};

/**
 * @desc    Get contracts pending final approval
 * @route   GET /api/admin/final-approval/contracts
 * @access  Private (Admin)
 */
const getPendingFinalApproval = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    sort,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const query = {
    status: CONTRACT_STATUS.PENDING_FINAL_APPROVAL,
    isDeleted: false,
  };

  const sortObj = parseSortQuery(sort, ['createdAt', 'title']);

  const [contracts, total] = await Promise.all([
    Contract.find(query)
      .populate('client', 'firstName lastName email phone')
      .populate('workflow.procurement.reviewedBy', 'firstName lastName')
      .populate('workflow.legal.reviewedBy', 'firstName lastName')
      .populate('workflow.coordinator.selectedBy', 'firstName lastName')
      .populate({
        path: 'workflow.coordinator.selectedOffer',
        select: 'offerAmount providerDetails proposedTimeline description status',
        populate: {
          path: 'provider',
          select: 'name email category organization phone rating',
        },
      })
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
 * @desc    Get single contract with full workflow details
 * @route   GET /api/admin/final-approval/contracts/:id
 * @access  Private (Admin)
 */
const getContractForFinalApproval = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('client', 'firstName lastName email phone city country')
    .populate('workflow.procurement.reviewedBy', 'firstName lastName email')
    .populate('workflow.legal.reviewedBy', 'firstName lastName email')
    .populate('workflow.coordinator.selectedBy', 'firstName lastName email')
    .populate({
      path: 'workflow.coordinator.selectedOffer',
      populate: {
        path: 'provider',
        select: 'name email category organization phone rating tags address',
      },
    });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  // Get all offers for this contract with full details
  const allOffers = await Offer.find({ contract: req.params.id })
    .populate('provider', 'name email category organization phone rating tags address')
    .sort({ createdAt: -1 });

  res.status(200).json(ApiResponse.success({ contract, allOffers }));
});

/**
 * @desc    Final approve contract
 * @route   POST /api/admin/final-approval/contracts/:id/approve
 * @access  Private (Admin)
 */
const finalApproveContract = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;

  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (contract.status !== CONTRACT_STATUS.PENDING_FINAL_APPROVAL) {
    return next(ApiError.badRequest('Contract is not pending final approval'));
  }

  // Update workflow tracking
  contract.workflow.finalApproval = {
    approvedBy: req.userId,
    approvedAt: new Date(),
    status: 'approved',
    notes: notes || null,
  };

  // Transition to final approved
  await contract.transitionTo(CONTRACT_STATUS.FINAL_APPROVED);

  // Update the selected provider's stats
  const selectedOffer = await Offer.findById(contract.workflow.coordinator.selectedOffer)
    .populate('provider');
  if (selectedOffer && selectedOffer.provider) {
    await selectedOffer.provider.incrementTasksCompleted();
  }

  // Log approval
  await AuditLog.log({
    action: AUDIT_ACTIONS.FINAL_APPROVE,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.PENDING_FINAL_APPROVAL },
      after: { status: CONTRACT_STATUS.FINAL_APPROVED },
    },
    metadata: { ipAddress: req.ip, notes },
    description: 'Contract final approved by Admin',
  });

  logger.info(`Contract ${contract.referenceNumber} final approved by Admin ${req.userId}`);

  res.status(200).json(
    ApiResponse.success({ contract }, 'Contract final approved successfully')
  );
});

/**
 * @desc    Reject contract at final stage
 * @route   POST /api/admin/final-approval/contracts/:id/reject
 * @access  Private (Admin)
 */
const finalRejectContract = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  if (!reason) {
    return next(ApiError.badRequest('Rejection reason is required'));
  }

  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (contract.status !== CONTRACT_STATUS.PENDING_FINAL_APPROVAL) {
    return next(ApiError.badRequest('Contract is not pending final approval'));
  }

  // Update workflow tracking
  contract.workflow.finalApproval = {
    approvedBy: req.userId,
    approvedAt: new Date(),
    status: 'rejected',
    notes: reason,
  };

  // Update rejection details
  contract.rejectedBy = req.userId;
  contract.rejectionStage = 'admin';

  // Transition to rejected
  await contract.transitionTo(CONTRACT_STATUS.REJECTED, reason);

  // Log rejection
  await AuditLog.log({
    action: AUDIT_ACTIONS.FINAL_REJECT,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.PENDING_FINAL_APPROVAL },
      after: { status: CONTRACT_STATUS.REJECTED },
    },
    metadata: { ipAddress: req.ip, reason },
    description: `Contract rejected by Admin: ${reason}`,
  });

  logger.info(`Contract ${contract.referenceNumber} rejected by Admin ${req.userId}`);

  res.status(200).json(
    ApiResponse.success({ contract, reason }, 'Contract rejected')
  );
});

/**
 * @desc    Create user with specific role
 * @route   POST /api/admin/users/create
 * @access  Private (Admin)
 */
const createUserWithRole = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, role } = req.body;

  // Validate role
  const validRoles = Object.values(ROLES);
  if (!validRoles.includes(role)) {
    return next(ApiError.badRequest('Invalid role specified'));
  }

  // Check if email exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(ApiError.conflict('Email already registered'));
  }

  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    role,
    isEmailVerified: true,
  });

  user.password = undefined;

  logger.info(`User ${user.email} created with role ${role} by Admin ${req.userId}`);

  res.status(201).json(
    ApiResponse.created({ user }, `${role} user created successfully`)
  );
});

/**
 * @desc    Get all external providers
 * @route   GET /api/admin/providers
 * @access  Private (Admin)
 */
const getProviders = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    search,
    verified,
    category,
    availability,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const query = { isActive: true };

  if (verified !== undefined) {
    query.verified = verified === 'true';
  }

  if (availability !== undefined) {
    query.availability = availability === 'true';
  }

  if (category) {
    query.category = category;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { organization: searchRegex },
    ];
  }

  const [providers, total] = await Promise.all([
    Provider.find(query)
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Provider.countDocuments(query),
  ]);

  const pagination = getPaginationMeta(total, pageNum, limitNum);

  res.status(200).json(ApiResponse.paginated(providers, pagination));
});

/**
 * @desc    Verify external provider
 * @route   POST /api/admin/providers/:id/verify
 * @access  Private (Admin)
 */
const verifyProvider = asyncHandler(async (req, res, next) => {
  const provider = await Provider.findById(req.params.id);

  if (!provider) {
    return next(ApiError.notFound('Provider not found'));
  }

  await provider.verify(req.userId);

  res.status(200).json(
    ApiResponse.success({ provider }, 'Provider verified successfully')
  );
});

module.exports = {
  getDashboardStats,
  getUsers,
  getUser,
  updateUserStatus,
  createAdminUser,
  getAuditLogs,
  getReports,
  getPendingFinalApproval,
  getContractForFinalApproval,
  finalApproveContract,
  finalRejectContract,
  createUserWithRole,
  getProviders,
  verifyProvider,
};
