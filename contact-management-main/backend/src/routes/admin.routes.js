const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { body, query } = require('express-validator');
const { ROLES } = require('../config/constants');

// All routes require authentication and admin role
router.use(protect);
router.use(restrictTo(ROLES.ADMIN));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put(
  '/users/:id/status',
  [body('isActive').isBoolean().withMessage('isActive must be a boolean')],
  validate,
  adminController.updateUserStatus
);
router.post(
  '/users',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validate,
  adminController.createAdminUser
);

// Audit logs
router.get(
  '/audit-logs',
  [
    query('entityType')
      .optional()
      .isIn(['Contract', 'User', 'ServiceProvider', 'ServiceProviderRequest', 'Offer'])
      .withMessage('Invalid entity type'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  adminController.getAuditLogs
);

// Reports
router.get(
  '/reports',
  [
    query('type')
      .optional()
      .isIn(['contracts', 'users', 'providers'])
      .withMessage('Invalid report type'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validate,
  adminController.getReports
);

// Final approval workflow
router.get('/final-approval/contracts', adminController.getPendingFinalApproval);
router.get('/final-approval/contracts/:id', adminController.getContractForFinalApproval);
router.post('/final-approval/contracts/:id/approve', adminController.finalApproveContract);
router.post(
  '/final-approval/contracts/:id/reject',
  [body('reason').trim().notEmpty().withMessage('Rejection reason is required')],
  validate,
  adminController.finalRejectContract
);

// Create user with any role
router.post(
  '/users/create',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('role').notEmpty().withMessage('Role is required'),
  ],
  validate,
  adminController.createUserWithRole
);

// External providers management
router.get('/providers', adminController.getProviders);
router.post('/providers/:id/verify', adminController.verifyProvider);

module.exports = router;
