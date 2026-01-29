const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contract.controller');
const serviceProviderController = require('../controllers/serviceProvider.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createContractValidator,
  updateContractValidator,
  contractIdValidator,
  listContractsValidator,
  approveContractValidator,
  rejectContractValidator,
} = require('../validators/contract.validator');
const {
  createServiceProviderRequestValidator,
  acceptRequestValidator,
  rejectRequestValidator,
  createReviewValidator,
} = require('../validators/serviceProvider.validator');
const { ROLES } = require('../config/constants');

// All routes require authentication
router.use(protect);

// Contract statistics (Admin only)
router.get(
  '/stats',
  restrictTo(ROLES.ADMIN),
  contractController.getContractStats
);

// List and create contracts
router
  .route('/')
  .get(listContractsValidator, validate, contractController.getContracts)
  .post(
    restrictTo(ROLES.CLIENT),
    createContractValidator,
    validate,
    contractController.createContract
  );

// Single contract operations
router
  .route('/:id')
  .get(contractIdValidator, validate, contractController.getContract)
  .put(updateContractValidator, validate, contractController.updateContract)
  .delete(contractIdValidator, validate, contractController.deleteContract);

// Contract workflow
router.post(
  '/:id/submit',
  restrictTo(ROLES.CLIENT),
  contractIdValidator,
  validate,
  contractController.submitForApproval
);

router.post(
  '/:id/approve',
  restrictTo(ROLES.ADMIN),
  approveContractValidator,
  validate,
  contractController.approveContract
);

router.post(
  '/:id/reject',
  restrictTo(ROLES.ADMIN),
  rejectContractValidator,
  validate,
  contractController.rejectContract
);

// Contract history
router.get(
  '/:id/history',
  contractIdValidator,
  validate,
  contractController.getContractHistory
);

// Service provider requests for a contract
router
  .route('/:contractId/requests')
  .get(serviceProviderController.getContractRequests)
  .post(
    restrictTo(ROLES.SERVICE_PROVIDER),
    createServiceProviderRequestValidator,
    validate,
    serviceProviderController.createRequest
  );

// Accept/Reject requests
router.post(
  '/requests/:requestId/accept',
  restrictTo(ROLES.CLIENT, ROLES.ADMIN),
  acceptRequestValidator,
  validate,
  serviceProviderController.acceptRequest
);

router.post(
  '/requests/:requestId/reject',
  restrictTo(ROLES.CLIENT, ROLES.ADMIN),
  rejectRequestValidator,
  validate,
  serviceProviderController.rejectRequest
);

router.post(
  '/requests/:requestId/withdraw',
  restrictTo(ROLES.SERVICE_PROVIDER),
  serviceProviderController.withdrawRequest
);

// Reviews
router.post(
  '/:contractId/review',
  restrictTo(ROLES.CLIENT),
  createReviewValidator,
  validate,
  serviceProviderController.submitReview
);

module.exports = router;
