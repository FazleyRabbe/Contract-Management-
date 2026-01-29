const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getOpenContracts,
  getContractWithOffers,
  getContractOffers,
  selectOffer,
  getOfferDetails,
  getStats,
} = require('../controllers/coordinator.controller');

// All routes require authentication and Contract Coordinator role
router.use(protect);
router.use(restrictTo(ROLES.CONTRACT_COORDINATOR, ROLES.ADMIN));

// Dashboard stats
router.get('/stats', getStats);

// Contract and offer management
router.get('/contracts', getOpenContracts);
router.get('/contracts/:id', getContractWithOffers);
router.get('/contracts/:id/offers', getContractOffers);
router.post('/contracts/:id/select-offer/:offerId', selectOffer);

// Offer details
router.get('/offers/:id', getOfferDetails);

module.exports = router;
