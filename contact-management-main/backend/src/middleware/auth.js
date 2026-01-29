const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Protect routes - Verify JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Also check cookies
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(ApiError.unauthorized('Access denied. No token provided.'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return next(ApiError.unauthorized('User no longer exists.'));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(ApiError.unauthorized('Your account has been deactivated.'));
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(
        ApiError.unauthorized('Password recently changed. Please log in again.')
      );
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired. Please log in again.'));
    }
    logger.error('Auth middleware error:', error);
    return next(ApiError.internal('Authentication failed.'));
  }
};

/**
 * Restrict to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden('You do not have permission to perform this action.')
      );
    }
    next();
  };
};

/**
 * Optional authentication - attaches user if token exists
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
      }
    }

    next();
  } catch (error) {
    // If token verification fails, continue without user
    next();
  }
};

/**
 * Check if user owns the resource
 */
const checkOwnership = (Model, paramName = 'id', ownerField = 'user') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return next(ApiError.notFound('Resource not found.'));
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      // Check ownership
      const ownerId = resource[ownerField]?.toString();
      if (ownerId !== req.userId.toString()) {
        return next(
          ApiError.forbidden('You do not have permission to access this resource.')
        );
      }

      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      return next(ApiError.internal('Authorization check failed.'));
    }
  };
};

/**
 * Rate limiting by user
 */
const userRateLimit = new Map();

const limitRequests = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const userId = req.userId?.toString() || req.ip;
    const now = Date.now();

    if (!userRateLimit.has(userId)) {
      userRateLimit.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userLimit = userRateLimit.get(userId);

    if (now > userLimit.resetTime) {
      userRateLimit.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return next(ApiError.tooManyRequests('Too many requests. Please try again later.'));
    }

    userLimit.count++;
    next();
  };
};

module.exports = {
  protect,
  restrictTo,
  optionalAuth,
  checkOwnership,
  limitRequests,
};
