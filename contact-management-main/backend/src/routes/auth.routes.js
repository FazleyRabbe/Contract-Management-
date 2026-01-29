const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  updateProfileValidator,
} = require('../validators/auth.validator');

// Public routes
router.post('/register', registerValidator, validate, authController.register);
router.post('/login', loginValidator, validate, authController.login);
router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.put('/reset-password/:token', resetPasswordValidator, validate, authController.resetPassword);
router.post('/refresh-token', authController.refreshAccessToken);

// Protected routes
router.use(protect);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);
router.put('/profile', updateProfileValidator, validate, authController.updateProfile);
router.put('/change-password', changePasswordValidator, validate, authController.changePassword);

module.exports = router;
