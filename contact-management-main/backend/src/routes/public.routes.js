const express = require('express');
const router = express.Router();
const {
  getOpenContracts,
  getContractDetails,
  submitOffer,
  getApprovedContracts,
  getContractTypes,
} = require('../controllers/public.controller');

// All routes are public (no authentication required)

// Get available contract types
router.get('/contract-types', getContractTypes);

// Get contracts open for offers
router.get('/contracts', getOpenContracts);

// Get single contract details
router.get('/contracts/:id', getContractDetails);

// Submit an offer for a contract
router.post('/contracts/:id/offers', submitOffer);

// Get list of final approved contracts
router.get('/approved-contracts', getApprovedContracts);

module.exports = router;
