import React, { forwardRef } from 'react';
import './Select.css';

const Select = forwardRef(
  (
    {
      label,
      name,
      options = [],
      placeholder = 'Select an option',
      error,
      helperText,
      disabled = false,
      required = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const selectClasses = [
      'select-field',
      error && 'select-error',
      disabled && 'select-disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="select-wrapper">
        {label && (
          <label htmlFor={name} className="select-label">
            {label}
            {required && <span className="select-required">*</span>}
          </label>
        )}
        <div className="select-container">
          <select
            ref={ref}
            id={name}
            name={name}
            disabled={disabled}
            className={selectClasses}
            {...props}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="select-arrow">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>
        {error && <span className="select-error-text">{error}</span>}
        {helperText && !error && (
          <span className="select-helper-text">{helperText}</span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
