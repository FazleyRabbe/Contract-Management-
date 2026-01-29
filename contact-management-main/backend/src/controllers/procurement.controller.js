const { Contract, AuditLog, User } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationMeta, parseSortQuery } = require('../utils/helpers');
const { CONTRACT_STATUS, AUDIT_ACTIONS, PAGINATION, ROLES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get all contracts pending procurement review
 * @route   GET /api/procurement/contracts
 * @access  Private (Procurement Manager)
 */
const getPendingContracts = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    sort,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const query = {
    status: CONTRACT_STATUS.PENDING_PROCUREMENT,
    isDeleted: false,
  };

  const sortObj = parseSortQuery(sort, ['createdAt', 'startDate', 'title']);

  const [contracts, total] = await Promise.all([
    Contract.find(query)
      .populate('client', 'firstName lastName email')
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
 * @desc    Get single contract for procurement review
 * @route   GET /api/procurement/contracts/:id
 * @access  Private (Procurement Manager)
 */
const getContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('client', 'firstName lastName email phone');

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  res.status(200).json(ApiResponse.success({ contract }));
});

/**
 * @desc    Approve contract (Procurement Manager)
 * @route   POST /api/procurement/contracts/:id/approve
 * @access  Private (Procurement Manager)
 */
const approveContract = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;

  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (contract.status !== CONTRACT_STATUS.PENDING_PROCUREMENT) {
    return next(ApiError.badRequest('Contract is not pending procurement review'));
  }

  // Update workflow tracking
  contract.workflow.procurement = {
    reviewedBy: req.userId,
    reviewedAt: new Date(),
    status: 'approved',
    notes: notes || null,
  };

  // Transition to next stage
  await contract.transitionTo(CONTRACT_STATUS.PENDING_LEGAL);

  // Log approval
  await AuditLog.log({
    action: AUDIT_ACTIONS.PROCUREMENT_APPROVE,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.PENDING_PROCUREMENT },
      after: { status: CONTRACT_STATUS.PENDING_LEGAL },
    },
    metadata: { ipAddress: req.ip, notes },
    description: 'Contract approved by Procurement Manager, sent to Legal Counsel',
  });

  logger.info(`Contract ${contract.referenceNumber} approved by Procurement Manager ${req.userId}`);

  res.status(200).json(
    ApiResponse.success({ contract }, 'Contract approved and sent to Legal Counsel')
  );
});

/**
 * @desc    Reject contract (Procurement Manager)
 * @route   POST /api/procurement/contracts/:id/reject
 * @access  Private (Procurement Manager)
 */
const rejectContract = asyncHandler(async (req, res, next) => {
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

  if (contract.status !== CONTRACT_STATUS.PENDING_PROCUREMENT) {
    return next(ApiError.badRequest('Contract is not pending procurement review'));
  }

  // Update workflow tracking
  contract.workflow.procurement = {
    reviewedBy: req.userId,
    reviewedAt: new Date(),
    status: 'rejected',
    notes: reason,
  };

  // Update rejection details
  contract.rejectedBy = req.userId;
  contract.rejectionStage = 'procurement';

  // Transition to rejected
  await contract.transitionTo(CONTRACT_STATUS.REJECTED, reason);

  // Log rejection
  await AuditLog.log({
    action: AUDIT_ACTIONS.PROCUREMENT_REJECT,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.PENDING_PROCUREMENT },
      after: { status: CONTRACT_STATUS.REJECTED },
    },
    metadata: { ipAddress: req.ip, reason },
    description: `Contract rejected by Procurement Manager: ${reason}`,
  });

  logger.info(`Contract ${contract.referenceNumber} rejected by Procurement Manager ${req.userId}`);

  res.status(200).json(
    ApiResponse.success({ contract, reason }, 'Contract rejected')
  );
});

/**
 * @desc    Edit contract (Procurement Manager can make changes before approving)
 * @route   PUT /api/procurement/contracts/:id
 * @access  Private (Procurement Manager)
 */
const editContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (contract.status !== CONTRACT_STATUS.PENDING_PROCUREMENT) {
    return next(ApiError.badRequest('Contract is not pending procurement review'));
  }

  const beforeState = contract.toObject();

  // Allowed fields for procurement manager to edit
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
    metadata: { ipAddress: req.ip, editedBy: 'procurement_manager' },
    description: `Contract edited by Procurement Manager`,
  });

  res.status(200).json(
    ApiResponse.success({ contract }, 'Contract updated successfully')
  );
});

/**
 * @desc    Get procurement dashboard stats
 * @route   GET /api/procurement/stats
 * @access  Private (Procurement Manager)
 */
const getStats = asyncHandler(async (req, res) => {
  const [pendingCount, approvedToday, rejectedToday] = await Promise.all([
    Contract.countDocuments({
      status: CONTRACT_STATUS.PENDING_PROCUREMENT,
      isDeleted: false,
    }),
    Contract.countDocuments({
      'workflow.procurement.status': 'approved',
      'workflow.procurement.reviewedAt': {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
      isDeleted: false,
    }),
    Contract.countDocuments({
      'workflow.procurement.status': 'rejected',
      'workflow.procurement.reviewedAt': {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
      isDeleted: false,
    }),
  ]);

  res.status(200).json(
    ApiResponse.success({
      pendingCount,
      approvedToday,
      rejectedToday,
    })
  );
});

/**
 * @desc    Get all client users for contract creation
 * @route   GET /api/procurement/clients
 * @access  Private (Procurement Manager)
 */
const getClients = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const query = {
    role: ROLES.CLIENT,
    isActive: true,
  };

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
    ];
  }

  const clients = await User.find(query)
    .select('firstName lastName email')
    .sort({ firstName: 1 })
    .lean();

  res.status(200).json(ApiResponse.success({ clients }));
});

/**
 * @desc    Create contract for a specific user (Procurement Manager)
 * @route   POST /api/procurement/contracts
 * @access  Private (Procurement Manager)
 */
const createContractForUser = asyncHandler(async (req, res, next) => {
  const {
    clientId,
    title,
    contractType,
    description,
    targetConditions,
    targetPersons,
    budget,
    startDate,
    endDate,
  } = req.body;

  let client = null;
  let clientName = 'No client assigned';

  // If clientId is provided, verify client exists
  if (clientId) {
    client = await User.findOne({
      _id: clientId,
      role: ROLES.CLIENT,
      isActive: true,
    });

    if (!client) {
      return next(ApiError.notFound('Client not found or inactive'));
    }
    clientName = `${client.firstName} ${client.lastName}`;
  }

  // Create contract data
  const contractData = {
    title,
    contractType,
    description,
    targetConditions,
    targetPersons,
    budget,
    startDate,
    endDate,
    status: CONTRACT_STATUS.PENDING_PROCUREMENT,
  };

  // Only add client if provided
  if (clientId) {
    contractData.client = clientId;
  }

  // Create contract
  const contract = await Contract.create(contractData);

  // Log contract creation
  await AuditLog.log({
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: { after: contract.toObject() },
    metadata: {
      ipAddress: req.ip,
      createdBy: 'procurement_manager',
      clientId: clientId || null,
    },
    description: `Contract created by Procurement Manager - ${clientName}`,
  });

  logger.info(`Contract ${contract.referenceNumber} created by Procurement Manager ${req.userId}${clientId ? ` for client ${clientId}` : ' without client'}`);

  res.status(201).json(
    ApiResponse.success({ contract }, 'Contract created successfully')
  );
});

module.exports = {
  getPendingContracts,
  getContract,
  approveContract,
  rejectContract,
  editContract,
  getStats,
  getClients,
  createContractForUser,
};
