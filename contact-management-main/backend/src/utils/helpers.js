const crypto = require('crypto');

/**
 * Count words in a string
 */
const countWords = (str) => {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Generate a random token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate unique contract reference number
 */
const generateContractRef = () => {
  const prefix = 'CTR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Sanitize object - remove undefined/null values
 */
const sanitizeObject = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v != null && v !== '')
  );
};

/**
 * Calculate pagination metadata
 */
const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Parse sort query string to mongoose sort object
 */
const parseSortQuery = (sortQuery, allowedFields = []) => {
  if (!sortQuery) return { createdAt: -1 };

  const sortObj = {};
  const fields = sortQuery.split(',');

  fields.forEach((field) => {
    const order = field.startsWith('-') ? -1 : 1;
    const fieldName = field.replace(/^-/, '');

    if (allowedFields.length === 0 || allowedFields.includes(fieldName)) {
      sortObj[fieldName] = order;
    }
  });

  return Object.keys(sortObj).length > 0 ? sortObj : { createdAt: -1 };
};

/**
 * Build search query for MongoDB
 */
const buildSearchQuery = (searchTerm, fields) => {
  if (!searchTerm || fields.length === 0) return {};

  const searchRegex = new RegExp(searchTerm, 'i');
  return {
    $or: fields.map((field) => ({ [field]: searchRegex })),
  };
};

/**
 * Mask sensitive data for logging
 */
const maskSensitiveData = (obj, fields = ['password', 'token', 'secret']) => {
  const masked = { ...obj };
  fields.forEach((field) => {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  });
  return masked;
};

/**
 * Calculate date difference in days
 */
const dateDiffInDays = (date1, date2) => {
  const diffTime = Math.abs(new Date(date2) - new Date(date1));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Check if date is in the past
 */
const isDateInPast = (date) => {
  return new Date(date) < new Date();
};

/**
 * Format currency
 */
const formatCurrency = (amount, currency = 'EUR') => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
};

module.exports = {
  countWords,
  generateToken,
  generateContractRef,
  sanitizeObject,
  getPaginationMeta,
  parseSortQuery,
  buildSearchQuery,
  maskSensitiveData,
  dateDiffInDays,
  isDateInPast,
  formatCurrency,
};
