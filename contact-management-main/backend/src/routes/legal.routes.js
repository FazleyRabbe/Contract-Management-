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
} = require('../controllers/legal.controller');

// All routes require authentication and Legal Counsel role
router.use(protect);
router.use(restrictTo(ROLES.LEGAL_COUNSEL, ROLES.ADMIN));

// Dashboard stats
router.get('/stats', getStats);

// Contract management
router.get('/contracts', getPendingContracts);
router.get('/contracts/:id', getContract);
router.put('/contracts/:id', editContract);
router.post('/contracts/:id/approve', approveContract);
router.post('/contracts/:id/reject', rejectContract);

module.exports = router;
