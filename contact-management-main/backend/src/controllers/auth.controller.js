const crypto = require('crypto');
const { User, AuditLog } = require('../models');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { ROLES, AUDIT_ACTIONS } = require('../config/constants');

/**
 * @desc    Register a new client user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, city, country, phone } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(ApiError.conflict('Email already registered'));
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    city,
    country,
    phone,
    role: ROLES.CLIENT,
  });

  // Generate tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  // Log registration
  await AuditLog.log({
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'User',
    entityId: user._id,
    performedBy: user._id,
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
    description: 'New client registration',
  });

  // Remove password from response
  user.password = undefined;
  user.refreshToken = undefined;

  const response = ApiResponse.created(
    {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
      accessToken,
      refreshToken,
    },
    'Registration successful'
  );

  res.status(201).json(response);
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user with password
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return next(ApiError.unauthorized('Invalid email or password'));
  }

  // Check if account is locked
  if (user.isLocked) {
    return next(
      ApiError.unauthorized('Account temporarily locked. Try again later.')
    );
  }

  // Check if user is active
  if (!user.isActive) {
    return next(ApiError.unauthorized('Your account has been deactivated'));
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    await user.incrementLoginAttempts();
    return next(ApiError.unauthorized('Invalid email or password'));
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Generate tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  logger.info(`User ${user.email} logged in successfully`);

  // Remove sensitive data
  user.password = undefined;
  user.refreshToken = undefined;

  const response = ApiResponse.success(
    {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        city: user.city,
        country: user.country,
        phone: user.phone,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    },
    'Login successful'
  );

  res.status(200).json(response);
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Clear refresh token
  await User.findByIdAndUpdate(req.userId, { refreshToken: null });

  logger.info(`User ${req.user.email} logged out`);

  res.status(200).json(ApiResponse.success(null, 'Logout successful'));
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  const response = ApiResponse.success({
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      city: user.city,
      country: user.country,
      phone: user.phone,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    },
  });

  res.status(200).json(response);
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const allowedUpdates = ['firstName', 'lastName', 'city', 'country', 'phone'];
  const updates = {};

  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.userId, updates, {
    new: true,
    runValidators: true,
  });

  const response = ApiResponse.success(
    {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        city: user.city,
        country: user.country,
        phone: user.phone,
      },
    },
    'Profile updated successfully'
  );

  res.status(200).json(response);
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.userId).select('+password');

  // Check current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    return next(ApiError.unauthorized('Current password is incorrect'));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Log password change
  await AuditLog.log({
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'User',
    entityId: user._id,
    performedBy: user._id,
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
    description: 'Password changed',
  });

  // Generate new tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  const response = ApiResponse.success(
    { accessToken, refreshToken },
    'Password changed successfully'
  );

  res.status(200).json(response);
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Return success even if user not found for security
    return res.status(200).json(
      ApiResponse.success(null, 'If your email is registered, you will receive a password reset link')
    );
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // In production, send email here
  // For now, just log the token (would be removed in production)
  logger.info(`Password reset token for ${email}: ${resetToken}`);

  // TODO: Send email with reset link
  // const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const response = ApiResponse.success(
    null,
    'If your email is registered, you will receive a password reset link'
  );

  res.status(200).json(response);
});

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(ApiError.badRequest('Invalid or expired reset token'));
  }

  // Update password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  await user.save();

  // Log password reset
  await AuditLog.log({
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'User',
    entityId: user._id,
    performedBy: user._id,
    metadata: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
    description: 'Password reset via email',
  });

  // Generate new tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  const response = ApiResponse.success(
    { accessToken, refreshToken },
    'Password reset successful'
  );

  res.status(200).json(response);
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(ApiError.badRequest('Refresh token is required'));
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = require('jsonwebtoken').verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );
  } catch (error) {
    return next(ApiError.unauthorized('Invalid refresh token'));
  }

  // Find user
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== refreshToken) {
    return next(ApiError.unauthorized('Invalid refresh token'));
  }

  if (!user.isActive) {
    return next(ApiError.unauthorized('Account deactivated'));
  }

  // Generate new tokens
  const newAccessToken = user.generateAuthToken();
  const newRefreshToken = user.generateRefreshToken();
  await user.save({ validateBeforeSave: false });

  const response = ApiResponse.success({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });

  res.status(200).json(response);
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
};
