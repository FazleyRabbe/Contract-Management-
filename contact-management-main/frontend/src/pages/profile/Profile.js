import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  FiUser,
  FiPhone,
  FiMapPin,
  FiLock,
  FiEye,
  FiEyeOff,
  FiEdit2,
  FiSave,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Select, Card } from '../../components/common';
import { COUNTRY_CODES } from '../../utils/constants';
import './Profile.css';

// Profile info validation schema
const profileSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters'),
  city: yup.string().max(100, 'City name cannot exceed 100 characters'),
  country: yup.string().max(100, 'Country name cannot exceed 100 characters'),
  countryCode: yup.string(),
  phoneNumber: yup
    .string()
    .matches(/^$|^\d{6,15}$/, 'Phone number must be 6-15 digits'),
});

// Password change validation schema
const passwordSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      city: user?.city || '',
      country: user?.country || 'Germany',
      countryCode: user?.phone?.countryCode || '+49',
      phoneNumber: user?.phone?.number || '',
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm({
    resolver: yupResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const countryCodeOptions = COUNTRY_CODES.map((c) => ({
    value: c.code,
    label: `${c.code} (${c.country})`,
  }));

  const onProfileSubmit = async (data) => {
    setProfileLoading(true);

    const profileData = {
      firstName: data.firstName,
      lastName: data.lastName,
      city: data.city,
      country: data.country,
      phone: {
        countryCode: data.countryCode,
        number: data.phoneNumber,
      },
    };

    const result = await updateProfile(profileData);
    setProfileLoading(false);

    if (result.success) {
      setIsEditingProfile(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    setPasswordLoading(true);

    const result = await changePassword(
      data.currentPassword,
      data.newPassword,
      data.confirmPassword
    );

    setPasswordLoading(false);

    if (result.success) {
      setIsChangingPassword(false);
      resetPassword();
    }
  };

  const cancelProfileEdit = () => {
    setIsEditingProfile(false);
    resetProfile({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      city: user?.city || '',
      country: user?.country || 'Germany',
      countryCode: user?.phone?.countryCode || '+49',
      phoneNumber: user?.phone?.number || '',
    });
  };

  const cancelPasswordChange = () => {
    setIsChangingPassword(false);
    resetPassword();
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getRoleBadge = (role) => {
    const roleLabels = {
      admin: 'Administrator',
      client: 'Client',
      service_provider: 'Service Provider',
    };
    return roleLabels[role] || role;
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="profile-content">
        {/* Profile Avatar Section */}
        <Card className="profile-avatar-card">
          <div className="avatar-section">
            <div className="profile-avatar">
              {getInitials(user?.firstName, user?.lastName)}
            </div>
            <div className="avatar-info">
              <h2>{user?.firstName} {user?.lastName}</h2>
              <p className="user-email">{user?.email}</p>
              <span className={`role-badge role-${user?.role}`}>
                {getRoleBadge(user?.role)}
              </span>
            </div>
          </div>
        </Card>

        {/* Profile Information Section */}
        <Card className="profile-section">
          <div className="section-header">
            <div>
              <h3>Profile Information</h3>
              <p>Update your personal details</p>
            </div>
            {!isEditingProfile && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
              >
                <FiEdit2 /> Edit
              </Button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="profile-form">
              <div className="form-row">
                <Input
                  label="First Name"
                  placeholder="John"
                  icon={<FiUser />}
                  error={profileErrors.firstName?.message}
                  required
                  {...registerProfile('firstName')}
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  icon={<FiUser />}
                  error={profileErrors.lastName?.message}
                  required
                  {...registerProfile('lastName')}
                />
              </div>

              <div className="form-row">
                <Input
                  label="City"
                  placeholder="Berlin"
                  icon={<FiMapPin />}
                  error={profileErrors.city?.message}
                  {...registerProfile('city')}
                />
                <Input
                  label="Country"
                  placeholder="Germany"
                  icon={<FiMapPin />}
                  error={profileErrors.country?.message}
                  {...registerProfile('country')}
                />
              </div>

              <div className="form-row phone-row">
                <div className="country-code-select">
                  <Select
                    label="Code"
                    options={countryCodeOptions}
                    {...registerProfile('countryCode')}
                  />
                </div>
                <div className="phone-input">
                  <Input
                    label="Phone Number"
                    placeholder="1234567890"
                    icon={<FiPhone />}
                    error={profileErrors.phoneNumber?.message}
                    {...registerProfile('phoneNumber')}
                  />
                </div>
              </div>

              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={cancelProfileEdit}>
                  <FiX /> Cancel
                </Button>
                <Button type="submit" loading={profileLoading}>
                  <FiSave /> Save Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="profile-info-display">
              <div className="info-row">
                <div className="info-item">
                  <label>First Name</label>
                  <span>{user?.firstName || '-'}</span>
                </div>
                <div className="info-item">
                  <label>Last Name</label>
                  <span>{user?.lastName || '-'}</span>
                </div>
              </div>
              <div className="info-row">
                <div className="info-item">
                  <label>Email</label>
                  <span>{user?.email || '-'}</span>
                </div>
                <div className="info-item">
                  <label>Phone</label>
                  <span>
                    {user?.phone?.number
                      ? `${user.phone.countryCode} ${user.phone.number}`
                      : '-'}
                  </span>
                </div>
              </div>
              <div className="info-row">
                <div className="info-item">
                  <label>City</label>
                  <span>{user?.city || '-'}</span>
                </div>
                <div className="info-item">
                  <label>Country</label>
                  <span>{user?.country || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Change Password Section */}
        <Card className="profile-section">
          <div className="section-header">
            <div>
              <h3>Change Password</h3>
              <p>Update your password to keep your account secure</p>
            </div>
            {!isChangingPassword && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsChangingPassword(true)}
              >
                <FiLock /> Change
              </Button>
            )}
          </div>

          {isChangingPassword ? (
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="password-form">
              <div className="password-field">
                <Input
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  icon={<FiLock />}
                  error={passwordErrors.currentPassword?.message}
                  required
                  {...registerPassword('currentPassword')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>

              <div className="form-row">
                <div className="password-field">
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    icon={<FiLock />}
                    error={passwordErrors.newPassword?.message}
                    required
                    {...registerPassword('newPassword')}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                <div className="password-field">
                  <Input
                    label="Confirm New Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    icon={<FiLock />}
                    error={passwordErrors.confirmPassword?.message}
                    required
                    {...registerPassword('confirmPassword')}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="password-requirements">
                <p>Password must contain:</p>
                <ul>
                  <li>At least 8 characters</li>
                  <li>Uppercase and lowercase letters</li>
                  <li>At least one number</li>
                  <li>At least one special character (@$!%*?&)</li>
                </ul>
              </div>

              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={cancelPasswordChange}>
                  <FiX /> Cancel
                </Button>
                <Button type="submit" loading={passwordLoading}>
                  <FiSave /> Update Password
                </Button>
              </div>
            </form>
          ) : (
            <div className="password-info">
              <p>
                <FiLock className="info-icon" />
                Your password was last updated on account creation. For security, we recommend changing your password periodically.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Profile;
