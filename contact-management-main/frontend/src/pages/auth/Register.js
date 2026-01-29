import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { FiMail, FiLock, FiUser, FiPhone, FiMapPin, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Select } from '../../components/common';
import { COUNTRY_CODES } from '../../utils/constants';
import './Auth.css';

const schema = yup.object({
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
  email: yup
    .string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  city: yup.string().max(100, 'City name cannot exceed 100 characters'),
  country: yup.string().max(100, 'Country name cannot exceed 100 characters'),
  countryCode: yup.string(),
  phoneNumber: yup
    .string()
    .matches(/^$|^\d{6,15}$/, 'Phone number must be 6-15 digits'),
});

const Register = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      city: '',
      country: 'Germany',
      countryCode: '+49',
      phoneNumber: '',
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);

    const userData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      city: data.city,
      country: data.country,
      phone: {
        countryCode: data.countryCode,
        number: data.phoneNumber,
      },
    };

    const result = await registerUser(userData);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    }
  };

  const countryCodeOptions = COUNTRY_CODES.map((c) => ({
    value: c.code,
    label: `${c.code} (${c.country})`,
  }));

  return (
    <div className="auth-page">
      <div className="auth-container register">
        <div className="auth-card wide">
          <div className="auth-header">
            <Link to="/" className="auth-logo">
              <span className="logo-icon">CM</span>
            </Link>
            <h1 className="auth-title">Create an account</h1>
            <p className="auth-subtitle">
              Get started with Contract Management Platform
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <div className="form-row">
              <Input
                label="First Name"
                placeholder="John"
                icon={<FiUser />}
                error={errors.firstName?.message}
                required
                {...register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                icon={<FiUser />}
                error={errors.lastName?.message}
                required
                {...register('lastName')}
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              icon={<FiMail />}
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <div className="form-row">
              <div className="password-field">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  icon={<FiLock />}
                  error={errors.password?.message}
                  required
                  {...register('password')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              <div className="password-field">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  icon={<FiLock />}
                  error={errors.confirmPassword?.message}
                  required
                  {...register('confirmPassword')}
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

            <div className="form-row">
              <Input
                label="City"
                placeholder="Berlin"
                icon={<FiMapPin />}
                error={errors.city?.message}
                {...register('city')}
              />
              <Input
                label="Country"
                placeholder="Germany"
                icon={<FiMapPin />}
                error={errors.country?.message}
                {...register('country')}
              />
            </div>

            <div className="form-row phone-row">
              <div className="country-code-select">
                <Select
                  label="Code"
                  options={countryCodeOptions}
                  {...register('countryCode')}
                />
              </div>
              <div className="phone-input">
                <Input
                  label="Phone Number"
                  placeholder="1234567890"
                  icon={<FiPhone />}
                  error={errors.phoneNumber?.message}
                  {...register('phoneNumber')}
                />
              </div>
            </div>

            <div className="terms-checkbox">
              <label>
                <input type="checkbox" required />
                <span>
                  I agree to the{' '}
                  <Link to="/terms">Terms of Service</Link> and{' '}
                  <Link to="/privacy">Privacy Policy</Link>
                </span>
              </label>
            </div>

            <Button type="submit" fullWidth loading={loading}>
              Create Account
            </Button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
