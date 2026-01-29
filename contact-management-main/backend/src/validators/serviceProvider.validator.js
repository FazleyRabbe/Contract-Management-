const { body, param, query } = require('express-validator');
const { VALIDATION } = require('../config/constants');

const createServiceProviderRequestValidator = [
  param('contractId')
    .isMongoId()
    .withMessage('Invalid contract ID'),

  body('serviceName')
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ max: 200 })
    .withMessage('Service name cannot exceed 200 characters'),

  body('budget.amount')
    .notEmpty()
    .withMessage('Budget amount is required')
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),

  body('budget.currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),

  body('numberOfPersons')
    .notEmpty()
    .withMessage('Number of persons is required')
    .isInt({ min: 1, max: 20 })
    .withMessage('Number of persons must be between 1 and 20'),

  body('timeline.startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Invalid start time format'),

  body('timeline.endTime')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('Invalid end time format')
    .custom((value, { req }) => {
      const endTime = new Date(value);
      const startTime = new Date(req.body.timeline?.startTime);
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),

  body('deliverables')
    .isArray({ min: 1 })
    .withMessage('At least one deliverable is required'),

  body('deliverables.*.title')
    .trim()
    .notEmpty()
    .withMessage('Deliverable title is required'),

  body('deliverables.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Deliverable description cannot exceed 500 characters'),

  body('deliverables.*.dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 1500 })
    .withMessage('Cover letter cannot exceed 1500 characters'),
];

const updateServiceProviderRequestValidator = [
  param('requestId')
    .isMongoId()
    .withMessage('Invalid request ID'),

  body('serviceName')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Service name cannot exceed 200 characters'),

  body('budget.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),

  body('numberOfPersons')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Number of persons must be between 1 and 20'),

  body('timeline.startTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid start time format'),

  body('timeline.endTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid end time format'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
];

const acceptRequestValidator = [
  param('requestId')
    .isMongoId()
    .withMessage('Invalid request ID'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

const rejectRequestValidator = [
  param('requestId')
    .isMongoId()
    .withMessage('Invalid request ID'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason cannot exceed 500 characters'),
];

const createReviewValidator = [
  param('contractId')
    .isMongoId()
    .withMessage('Invalid contract ID'),

  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: VALIDATION.MIN_RATING, max: VALIDATION.MAX_RATING })
    .withMessage(`Rating must be between ${VALIDATION.MIN_RATING} and ${VALIDATION.MAX_RATING}`),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),

  body('categories.communication')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),

  body('categories.quality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Quality rating must be between 1 and 5'),

  body('categories.timeliness')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Timeliness rating must be between 1 and 5'),

  body('categories.professionalism')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Professionalism rating must be between 1 and 5'),
];

const listProvidersValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long'),

  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Minimum rating must be between 0 and 5'),

  query('availability')
    .optional()
    .isIn(['available', 'busy', 'unavailable'])
    .withMessage('Invalid availability status'),

  query('sort')
    .optional()
    .trim(),
];

module.exports = {
  createServiceProviderRequestValidator,
  updateServiceProviderRequestValidator,
  acceptRequestValidator,
  rejectRequestValidator,
  createReviewValidator,
  listProvidersValidator,
};
