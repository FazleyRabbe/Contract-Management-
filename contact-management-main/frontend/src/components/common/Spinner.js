import React from 'react';
import './Spinner.css';

const Spinner = ({ size = 'md', className = '' }) => {
  const classes = ['spinner', `spinner-${size}`, className]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} />;
};

export const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-screen">
      <Spinner size="lg" />
      <p className="loading-message">{message}</p>
    </div>
  );
};

export const LoadingOverlay = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <Spinner size="lg" />
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  );
};

export default Spinner;
