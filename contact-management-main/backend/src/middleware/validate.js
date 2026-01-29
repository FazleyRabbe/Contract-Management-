const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware to validate request using express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    return next(
      new ApiError(400, 'Validation failed', true, JSON.stringify(errorMessages))
    );
  }

  next();
};

module.exports = validate;
