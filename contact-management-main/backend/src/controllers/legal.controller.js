const { Contract, AuditLog } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationMeta, parseSortQuery } = require('../utils/helpers');
const { CONTRACT_STATUS, AUDIT_ACTIONS, PAGINATION } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get all contracts pending legal review
 * @route   GET /api/legal/contracts
 * @access  Private (Legal Counsel)
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
    status: CONTRACT_STATUS.PENDING_LEGAL,
    isDeleted: false,
  };

  const sortObj = parseSortQuery(sort, ['createdAt', 'startDate', 'title']);

  const [contracts, total] = await Promise.all([
    Contract.find(query)
      .populate('client', 'firstName lastName email')
      .populate('workflow.procurement.reviewedBy', 'firstName lastName')
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
 * @desc    Get single contract for legal review
 * @route   GET /api/legal/contracts/:id
 * @access  Private (Legal Counsel)
 */
const getContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('client', 'firstName lastName email phone')
    .populate('workflow.procurement.reviewedBy', 'firstName lastName email');

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  res.status(200).json(ApiResponse.success({ contract }));
});

/**
 * @desc    Approve contract (Legal Counsel)
 * @route   POST /api/legal/contracts/:id/approve
 * @access  Private (Legal Counsel)
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

  if (contract.status !== CONTRACT_STATUS.PENDING_LEGAL) {
    return next(ApiError.badRequest('Contract is not pending legal review'));
  }

  // Update workflow tracking
  contract.workflow.legal = {
    reviewedBy: req.userId,
    reviewedAt: new Date(),
    status: 'approved',
    notes: notes || null,
  };

  // Transition to open for offers
  await contract.transitionTo(CONTRACT_STATUS.OPEN_FOR_OFFERS);

  // Log approval
  await AuditLog.log({
    action: AUDIT_ACTIONS.LEGAL_APPROVE,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.PENDING_LEGAL },
      after: { status: CONTRACT_STATUS.OPEN_FOR_OFFERS },
    },
    metadata: { ipAddress: req.ip, notes },
    description: 'Contract approved by Legal Counsel, now open for provider offers',
  });

  logger.info(`Contract ${contract.referenceNumber} approved by Legal Counsel ${req.userId}`);

  res.status(200).json(
    ApiResponse.success({ contract }, 'Contract approved and now open for provider offers')
  );
});

/**
 * @desc    Reject contract (Legal Counsel)
 * @route   POST /api/legal/contracts/:id/reject
 * @access  Private (Legal Counsel)
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

  if (contract.status !== CONTRACT_STATUS.PENDING_LEGAL) {
    return next(ApiError.badRequest('Contract is not pending legal review'));
  }

  // Update workflow tracking
  contract.workflow.legal = {
    reviewedBy: req.userId,
    reviewedAt: new Date(),
    status: 'rejected',
    notes: reason,
  };

  // Update rejection details
  contract.rejectedBy = req.userId;
  contract.rejectionStage = 'legal';

  // Transition to rejected
  await contract.transitionTo(CONTRACT_STATUS.REJECTED, reason);

  // Log rejection
  await AuditLog.log({
    action: AUDIT_ACTIONS.LEGAL_REJECT,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.PENDING_LEGAL },
      after: { status: CONTRACT_STATUS.REJECTED },
    },
    metadata: { ipAddress: req.ip, reason },
    description: `Contract rejected by Legal Counsel: ${reason}`,
  });

  logger.info(`Contract ${contract.referenceNumber} rejected by Legal Counsel ${req.userId}`);

  res.status(200).json(
    ApiResponse.success({ contract, reason }, 'Contract rejected')
  );
});

/**
 * @desc    Edit contract (Legal Counsel can make changes before approving)
 * @route   PUT /api/legal/contracts/:id
 * @access  Private (Legal Counsel)
 */
const editContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (contract.status !== CONTRACT_STATUS.PENDING_LEGAL) {
    return next(ApiError.badRequest('Contract is not pending legal review'));
  }

  const beforeState = contract.toObject();

  // Allowed fields for legal counsel to edit
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
    metadata: { ipAddress: req.ip, editedBy: 'legal_counsel' },
    description: `Contract edited by Legal Counsel`,
  });

  res.status(200).json(
    ApiResponse.success({ contract }, 'Contract updated successfully')
  );
});

/**
 * @desc    Get legal dashboard stats
 * @route   GET /api/legal/stats
 * @access  Private (Legal Counsel)
 */
const getStats = asyncHandler(async (req, res) => {
  const [pendingCount, approvedToday, rejectedToday] = await Promise.all([
    Contract.countDocuments({
      status: CONTRACT_STATUS.PENDING_LEGAL,
      isDeleted: false,
    }),
    Contract.countDocuments({
      'workflow.legal.status': 'approved',
      'workflow.legal.reviewedAt': {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
      isDeleted: false,
    }),
    Contract.countDocuments({
      'workflow.legal.status': 'rejected',
      'workflow.legal.reviewedAt': {
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

module.exports = {
  getPendingContracts,
  getContract,
  approveContract,
  rejectContract,
  editContract,
  getStats,
};
