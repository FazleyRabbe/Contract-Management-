const { Contract, Offer, Provider, AuditLog } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPaginationMeta, parseSortQuery } = require('../utils/helpers');
const { CONTRACT_STATUS, OFFER_STATUS, AUDIT_ACTIONS, PAGINATION } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * @desc    Get all contracts open for offers (Public API)
 * @route   GET /api/public/contracts
 * @access  Public
 */
const getOpenContracts = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    contractType,
    search,
    sort,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  // Only return contracts that are open for offers
  const query = {
    status: CONTRACT_STATUS.OPEN_FOR_OFFERS,
    isDeleted: false,
  };

  // Optional contract type filter
  if (contractType) {
    query.contractType = contractType;
  }

  // Optional search
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const sortObj = parseSortQuery(sort, ['createdAt', 'openForOffersAt', 'title']);

  const [contracts, total] = await Promise.all([
    Contract.find(query)
      .select('referenceNumber title contractType description targetConditions targetPersons budget startDate endDate openForOffersAt metadata.offerCount')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Contract.countDocuments(query),
  ]);

  const pagination = getPaginationMeta(total, pageNum, limitNum);

  res.status(200).json(ApiResponse.paginated(contracts, pagination, 'Contracts open for offers'));
});

/**
 * @desc    Get single contract details (Public API)
 * @route   GET /api/public/contracts/:id
 * @access  Public
 */
const getContractDetails = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findOne({
    _id: req.params.id,
    status: CONTRACT_STATUS.OPEN_FOR_OFFERS,
    isDeleted: false,
  }).select('referenceNumber title contractType description targetConditions targetPersons budget startDate endDate openForOffersAt metadata.offerCount attachments');

  if (!contract) {
    return next(ApiError.notFound('Contract not found or not open for offers'));
  }

  // Increment view count
  await Contract.findByIdAndUpdate(req.params.id, {
    $inc: { 'metadata.viewCount': 1 },
  });

  res.status(200).json(ApiResponse.success({ contract }));
});

/**
 * @desc    Submit an offer for a contract (Public API)
 * @route   POST /api/public/contracts/:id/offers
 * @access  Public
 */
const submitOffer = asyncHandler(async (req, res, next) => {
  const {
    // Provider information
    providerEmail,
    name,
    companyName,
    role,
    organization,
    category,
    tags,
    rateMin,
    rateMax,
    phone,
    address,
    // Offer information
    offerAmount,
    proposedStartDate,
    proposedEndDate,
    description,
    deliverables,
    terms,
  } = req.body;

  // Validate required fields
  if (!providerEmail || !name || !category) {
    return next(ApiError.badRequest('Provider email, name, and category are required'));
  }

  if (!offerAmount || !proposedStartDate || !proposedEndDate || !description) {
    return next(ApiError.badRequest('Offer amount, proposed dates, and description are required'));
  }

  // Check if contract exists and is open for offers
  const contract = await Contract.findOne({
    _id: req.params.id,
    status: CONTRACT_STATUS.OPEN_FOR_OFFERS,
    isDeleted: false,
  });

  if (!contract) {
    return next(ApiError.notFound('Contract not found or not open for offers'));
  }

  // Find or create provider
  let provider = await Provider.findOne({ email: providerEmail.toLowerCase() });
  let isNewProvider = false;

  if (!provider) {
    // Create new provider
    provider = await Provider.create({
      email: providerEmail.toLowerCase(),
      name,
      organization: organization || null,
      category,
      tags: tags || [],
      rateMin: rateMin || 0,
      rateMax: rateMax || 0,
      phone: phone || {},
      address: address || {},
    });

    isNewProvider = true;
    logger.info(`New provider created: ${provider.email}`);
  }

  // Check if this provider already submitted an offer for this contract
  const existingOffer = await Offer.findOne({
    contract: req.params.id,
    provider: provider._id,
  });

  if (existingOffer) {
    return next(ApiError.badRequest('You have already submitted an offer for this contract'));
  }

  // Create the offer
  const offer = await Offer.create({
    contract: req.params.id,
    provider: provider._id,
    providerDetails: {
      companyName: companyName || name,
      role: role || category,
      email: providerEmail.toLowerCase(),
      phone: phone || {},
      category: category,
    },
    offerAmount: {
      amount: offerAmount,
      currency: req.body.currency || 'EUR',
    },
    proposedTimeline: {
      startDate: new Date(proposedStartDate),
      endDate: new Date(proposedEndDate),
    },
    description,
    deliverables: deliverables || [],
    terms: terms || null,
    status: OFFER_STATUS.PENDING,
  });

  // Increment offer count on contract
  await Contract.findByIdAndUpdate(req.params.id, {
    $inc: { 'metadata.offerCount': 1 },
  });

  // Log the offer submission
  await AuditLog.log({
    action: AUDIT_ACTIONS.OFFER_SUBMIT,
    entityType: 'Offer',
    entityId: offer._id,
    performedBy: null, // Public API, no user
    changes: { after: offer.toObject() },
    metadata: {
      ipAddress: req.ip,
      contractId: contract._id,
      providerId: provider._id,
      providerEmail: provider.email,
    },
    description: `New offer submitted by provider ${provider.name} for contract ${contract.referenceNumber}`,
  });

  logger.info(`Offer ${offer._id} submitted by provider ${provider.email} for contract ${contract.referenceNumber}`);

  res.status(201).json(
    ApiResponse.created(
      {
        offer: {
          id: offer._id,
          status: offer.status,
          createdAt: offer.createdAt,
        },
        provider: {
          id: provider._id,
          name: provider.name,
          email: provider.email,
          isNew: isNewProvider,
        },
        contract: {
          id: contract._id,
          referenceNumber: contract.referenceNumber,
          title: contract.title,
        },
      },
      'Offer submitted successfully'
    )
  );
});

/**
 * @desc    Get list of final approved contracts (Public API)
 * @route   GET /api/public/approved-contracts
 * @access  Public
 */
const getApprovedContracts = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    contractType,
    sort,
  } = req.query;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  // Only return contracts that are final approved
  const query = {
    status: CONTRACT_STATUS.FINAL_APPROVED,
    isDeleted: false,
  };

  // Optional contract type filter
  if (contractType) {
    query.contractType = contractType;
  }

  const sortObj = parseSortQuery(sort, ['workflow.finalApproval.approvedAt', 'createdAt', 'title']);

  const [contracts, total] = await Promise.all([
    Contract.find(query)
      .select('referenceNumber title contractType description targetPersons budget startDate endDate workflow.finalApproval.approvedAt')
      .populate({
        path: 'workflow.coordinator.selectedOffer',
        select: 'offerAmount proposedTimeline',
        populate: {
          path: 'provider',
          select: 'name',
        },
      })
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Contract.countDocuments(query),
  ]);

  const pagination = getPaginationMeta(total, pageNum, limitNum);

  res.status(200).json(ApiResponse.paginated(contracts, pagination, 'Final approved contracts'));
});

/**
 * @desc    Get contract types available
 * @route   GET /api/public/contract-types
 * @access  Public
 */
const getContractTypes = asyncHandler(async (req, res) => {
  const { CONTRACT_TYPES } = require('../config/constants');

  res.status(200).json(
    ApiResponse.success({ contractTypes: Object.values(CONTRACT_TYPES) })
  );
});

module.exports = {
  getOpenContracts,
  getContractDetails,
  submitOffer,
  getApprovedContracts,
  getContractTypes,
};
