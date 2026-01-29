import React, { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(
  (
    {
      label,
      type = 'text',
      name,
      placeholder,
      error,
      helperText,
      icon,
      iconPosition = 'left',
      disabled = false,
      required = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputClasses = [
      'input-field',
      error && 'input-error',
      icon && iconPosition === 'left' && 'input-with-icon-left',
      icon && iconPosition === 'right' && 'input-with-icon-right',
      disabled && 'input-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="input-wrapper">
        {label && (
          <label htmlFor={name} className="input-label">
            {label}
            {required && <span className="input-required">*</span>}
          </label>
        )}
        <div className="input-container">
          {icon && iconPosition === 'left' && (
            <span className="input-icon input-icon-left">{icon}</span>
          )}
          <input
            ref={ref}
            type={type}
            id={name}
            name={name}
            placeholder={placeholder}
            disabled={disabled}
            className={inputClasses}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <span className="input-icon input-icon-right">{icon}</span>
          )}
        </div>
        {error && <span className="input-error-text">{error}</span>}
        {helperText && !error && (
          <span className="input-helper-text">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
