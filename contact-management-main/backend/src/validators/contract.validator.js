const { body, param, query } = require('express-validator');
const { CONTRACT_TYPES, VALIDATION } = require('../config/constants');
const { countWords } = require('../utils/helpers');

const createContractValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Contract title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('contractType')
    .notEmpty()
    .withMessage('Contract type is required')
    .isIn(Object.values(CONTRACT_TYPES))
    .withMessage('Invalid contract type'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .custom((value) => {
      if (countWords(value) > VALIDATION.DESCRIPTION_MAX_WORDS) {
        throw new Error(`Description cannot exceed ${VALIDATION.DESCRIPTION_MAX_WORDS} words`);
      }
      return true;
    }),

  body('targetConditions')
    .optional()
    .trim()
    .custom((value) => {
      if (value && countWords(value) > VALIDATION.TARGET_CONDITIONS_MAX_WORDS) {
        throw new Error(`Target conditions cannot exceed ${VALIDATION.TARGET_CONDITIONS_MAX_WORDS} words`);
      }
      return true;
    }),

  body('targetPersons')
    .notEmpty()
    .withMessage('Target persons is required')
    .isInt({ min: VALIDATION.MIN_TARGET_PERSONS, max: VALIDATION.MAX_TARGET_PERSONS })
    .withMessage(`Target persons must be between ${VALIDATION.MIN_TARGET_PERSONS} and ${VALIDATION.MAX_TARGET_PERSONS}`),

  body('budget.minimum')
    .notEmpty()
    .withMessage('Minimum budget is required')
    .isFloat({ min: 0 })
    .withMessage('Minimum budget must be a positive number'),

  body('budget.maximum')
    .notEmpty()
    .withMessage('Maximum budget is required')
    .isFloat({ min: 0 })
    .withMessage('Maximum budget must be a positive number')
    .custom((value, { req }) => {
      if (parseFloat(value) < parseFloat(req.body.budget?.minimum)) {
        throw new Error('Maximum budget must be greater than or equal to minimum budget');
      }
      return true;
    }),

  body('budget.currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),

  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format')
    .custom((value) => {
      const startDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),

  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      const endDate = new Date(value);
      const startDate = new Date(req.body.startDate);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
];

const updateContractValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid contract ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('contractType')
    .optional()
    .isIn(Object.values(CONTRACT_TYPES))
    .withMessage('Invalid contract type'),

  body('description')
    .optional()
    .trim()
    .custom((value) => {
      if (value && countWords(value) > VALIDATION.DESCRIPTION_MAX_WORDS) {
        throw new Error(`Description cannot exceed ${VALIDATION.DESCRIPTION_MAX_WORDS} words`);
      }
      return true;
    }),

  body('targetConditions')
    .optional()
    .trim()
    .custom((value) => {
      if (value && countWords(value) > VALIDATION.TARGET_CONDITIONS_MAX_WORDS) {
        throw new Error(`Target conditions cannot exceed ${VALIDATION.TARGET_CONDITIONS_MAX_WORDS} words`);
      }
      return true;
    }),

  body('targetPersons')
    .optional()
    .isInt({ min: VALIDATION.MIN_TARGET_PERSONS, max: VALIDATION.MAX_TARGET_PERSONS })
    .withMessage(`Target persons must be between ${VALIDATION.MIN_TARGET_PERSONS} and ${VALIDATION.MAX_TARGET_PERSONS}`),

  body('budget.minimum')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum budget must be a positive number'),

  body('budget.maximum')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum budget must be a positive number'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
];

const contractIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid contract ID'),
];

const listContractsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .trim(),

  query('contractType')
    .optional()
    .isIn(Object.values(CONTRACT_TYPES))
    .withMessage('Invalid contract type'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long'),

  query('sort')
    .optional()
    .trim(),

  query('startDateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),

  query('startDateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
];

const submitForApprovalValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid contract ID'),
];

const approveContractValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid contract ID'),
];

const rejectContractValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid contract ID'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Rejection reason cannot exceed 500 characters'),
];

module.exports = {
  createContractValidator,
  updateContractValidator,
  contractIdValidator,
  listContractsValidator,
  submitForApprovalValidator,
  approveContractValidator,
  rejectContractValidator,
};
