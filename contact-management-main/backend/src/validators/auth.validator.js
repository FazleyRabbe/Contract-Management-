const { body, param } = require('express-validator');
const { VALIDATION, DEFAULT_COUNTRY_CODE } = require('../config/constants');

const registerValidator = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name contains invalid characters'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name contains invalid characters'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: VALIDATION.MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country name cannot exceed 100 characters'),

  body('phone.countryCode')
    .optional()
    .trim()
    .matches(/^\+\d{1,4}$/)
    .withMessage('Invalid country code format')
    .default(DEFAULT_COUNTRY_CODE),

  body('phone.number')
    .optional()
    .trim()
    .matches(/^\d{6,15}$/)
    .withMessage('Phone number must be 6-15 digits'),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

const resetPasswordValidator = [
  param('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: VALIDATION.MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: VALIDATION.MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];

const updateProfileValidator = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name contains invalid characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name contains invalid characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country name cannot exceed 100 characters'),

  body('phone.countryCode')
    .optional()
    .trim()
    .matches(/^\+\d{1,4}$/)
    .withMessage('Invalid country code format'),

  body('phone.number')
    .optional()
    .trim()
    .matches(/^\d{6,15}$/)
    .withMessage('Phone number must be 6-15 digits'),
];

module.exports = {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  updateProfileValidator,
};
