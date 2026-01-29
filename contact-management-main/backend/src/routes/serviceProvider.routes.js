const express = require('express');
const router = express.Router();
const serviceProviderController = require('../controllers/serviceProvider.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { listProvidersValidator } = require('../validators/serviceProvider.validator');
const { ROLES } = require('../config/constants');

// All routes require authentication
router.use(protect);

// Service provider statistics (Admin only)
router.get(
  '/stats',
  restrictTo(ROLES.ADMIN),
  serviceProviderController.getProviderStats
);

// Get provider's own requests
router.get(
  '/my-requests',
  restrictTo(ROLES.SERVICE_PROVIDER),
  serviceProviderController.getMyRequests
);

// List all service providers
router.get(
  '/',
  listProvidersValidator,
  validate,
  serviceProviderController.getServiceProviders
);

// Get single service provider
router.get('/:id', serviceProviderController.getServiceProvider);

module.exports = router;
