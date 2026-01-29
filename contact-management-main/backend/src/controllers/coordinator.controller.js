const { Contract, Offer, AuditLog } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationMeta, parseSortQuery } = require('../utils/helpers');
const { CONTRACT_STATUS, OFFER_STATUS, AUDIT_ACTIONS, PAGINATION } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get all contracts for coordinator (open for offers or offer selected)
 * @route   GET /api/coordinator/contracts
 * @access  Private (Contract Coordinator)
 */
const getOpenContracts = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    sort,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const query = {
    status: { $in: [CONTRACT_STATUS.OPEN_FOR_OFFERS, CONTRACT_STATUS.OFFER_SELECTED] },
    isDeleted: false,
  };

  const sortObj = parseSortQuery(sort, ['createdAt', 'openForOffersAt', 'title']);

  const [contracts, total] = await Promise.all([
    Contract.find(query)
      .populate('client', 'firstName lastName email')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Contract.countDocuments(query),
  ]);

  // Get offer counts for each contract
  const contractsWithOfferCounts = await Promise.all(
    contracts.map(async (contract) => {
      const offerCount = await Offer.countDocuments({
        contract: contract._id,
        status: OFFER_STATUS.PENDING,
      });
      return { ...contract, pendingOfferCount: offerCount };
    })
  );

  const pagination = getPaginationMeta(total, pageNum, limitNum);

  res.status(200).json(ApiResponse.paginated(contractsWithOfferCounts, pagination));
});

/**
 * @desc    Get single contract with all offers
 * @route   GET /api/coordinator/contracts/:id
 * @access  Private (Contract Coordinator)
 */
const getContractWithOffers = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('client', 'firstName lastName email phone')
    .populate('workflow.procurement.reviewedBy', 'firstName lastName')
    .populate('workflow.legal.reviewedBy', 'firstName lastName');

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  // Get all offers for this contract
  const offers = await Offer.find({ contract: req.params.id })
    .populate('provider', 'name email category tags rating reviewsCount tasksCompleted rateMin rateMax availability verified')
    .sort({ createdAt: -1 });

  res.status(200).json(ApiResponse.success({ contract, offers }));
});

/**
 * @desc    Get offers for a contract
 * @route   GET /api/coordinator/contracts/:id/offers
 * @access  Private (Contract Coordinator)
 */
const getContractOffers = asyncHandler(async (req, res, next) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    status,
    sort,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const contract = await Contract.findById(req.params.id);
  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  const query = { contract: req.params.id };
  if (status) {
    query.status = status;
  }

  const sortObj = parseSortQuery(sort, ['createdAt', 'offerAmount.amount']);

  const [offers, total] = await Promise.all([
    Offer.find(query)
      .populate('provider', 'name email category tags rating reviewsCount tasksCompleted rateMin rateMax availability verified')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Offer.countDocuments(query),
  ]);

  const pagination = getPaginationMeta(total, pageNum, limitNum);

  res.status(200).json(ApiResponse.paginated(offers, pagination));
});

/**
 * @desc    Select an offer for a contract
 * @route   POST /api/coordinator/contracts/:id/select-offer/:offerId
 * @access  Private (Contract Coordinator)
 */
const selectOffer = asyncHandler(async (req, res, next) => {
  const { notes } = req.body;

  const contract = await Contract.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found'));
  }

  if (contract.status !== CONTRACT_STATUS.OPEN_FOR_OFFERS) {
    return next(ApiError.badRequest('Contract is not open for offers'));
  }

  const offer = await Offer.findOne({
    _id: req.params.offerId,
    contract: req.params.id,
  });

  if (!offer) {
    return next(ApiError.notFound('Offer not found'));
  }

  if (offer.status !== OFFER_STATUS.PENDING) {
    return next(ApiError.badRequest('Offer is not in pending status'));
  }

  // Select the offer
  await offer.select(req.userId, notes);

  // Reject all other pending offers for this contract
  await Offer.updateMany(
    {
      contract: req.params.id,
      _id: { $ne: offer._id },
      status: OFFER_STATUS.PENDING,
    },
    {
      status: OFFER_STATUS.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: 'Another offer was selected',
    }
  );

  // Update contract workflow
  contract.workflow.coordinator = {
    selectedBy: req.userId,
    selectedAt: new Date(),
    selectedOffer: offer._id,
    notes: notes || null,
  };

  // Transition contract to offer selected
  await contract.transitionTo(CONTRACT_STATUS.OFFER_SELECTED);

  // Then transition to pending final approval
  await contract.transitionTo(CONTRACT_STATUS.PENDING_FINAL_APPROVAL);

  // Log the selection
  await AuditLog.log({
    action: AUDIT_ACTIONS.OFFER_SELECT,
    entityType: 'Contract',
    entityId: contract._id,
    performedBy: req.userId,
    changes: {
      before: { status: CONTRACT_STATUS.OPEN_FOR_OFFERS },
      after: { status: CONTRACT_STATUS.PENDING_FINAL_APPROVAL, selectedOffer: offer._id },
    },
    metadata: {
      ipAddress: req.ip,
      offerId: offer._id,
      providerId: offer.provider,
      notes,
    },
    description: 'Offer selected by Contract Coordinator, sent to Admin for final approval',
  });

  logger.info(`Offer ${offer._id} selected for contract ${contract.referenceNumber} by Coordinator ${req.userId}`);

  res.status(200).json(
    ApiResponse.success(
      { contract, selectedOffer: offer },
      'Offer selected and sent to Admin for final approval'
    )
  );
});

/**
 * @desc    Get offer details
 * @route   GET /api/coordinator/offers/:id
 * @access  Private (Contract Coordinator)
 */
const getOfferDetails = asyncHandler(async (req, res, next) => {
  const offer = await Offer.findById(req.params.id)
    .populate('provider')
    .populate('contract', 'title referenceNumber status budget');

  if (!offer) {
    return next(ApiError.notFound('Offer not found'));
  }

  res.status(200).json(ApiResponse.success({ offer }));
});

/**
 * @desc    Get coordinator dashboard stats
 * @route   GET /api/coordinator/stats
 * @access  Private (Contract Coordinator)
 */
const getStats = asyncHandler(async (req, res) => {
  const [
    openContractsCount,
    totalPendingOffers,
    selectedToday,
  ] = await Promise.all([
    Contract.countDocuments({
      status: CONTRACT_STATUS.OPEN_FOR_OFFERS,
      isDeleted: false,
    }),
    Offer.countDocuments({
      status: OFFER_STATUS.PENDING,
    }),
    Contract.countDocuments({
      'workflow.coordinator.selectedAt': {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
      isDeleted: false,
    }),
  ]);

  res.status(200).json(
    ApiResponse.success({
      openContractsCount,
      totalPendingOffers,
      selectedToday,
    })
  );
});

module.exports = {
  getOpenContracts,
  getContractWithOffers,
  getContractOffers,
  selectOffer,
  getOfferDetails,
  getStats,
};
