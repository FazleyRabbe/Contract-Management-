const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { ROLES } = require('../config/constants');
const {
  getPendingContracts,
  getContract,
  approveContract,
  rejectContract,
  editContract,
  getStats,
  getClients,
  createContractForUser,
} = require('../controllers/procurement.controller');

// All routes require authentication and Procurement Manager role
router.use(protect);
router.use(restrictTo(ROLES.PROCUREMENT_MANAGER, ROLES.ADMIN));

// Dashboard stats
router.get('/stats', getStats);

// Get clients for contract creation
router.get('/clients', getClients);

// Contract management
router.get('/contracts', getPendingContracts);
router.post('/contracts', createContractForUser);
router.get('/contracts/:id', getContract);
router.put('/contracts/:id', editContract);
router.post('/contracts/:id/approve', approveContract);
router.post('/contracts/:id/reject', rejectContract);

module.exports = router;
