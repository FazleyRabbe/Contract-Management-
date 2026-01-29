import React from 'react';
import './Card.css';

const Card = ({ children, className = '', onClick, hoverable = false }) => {
  const classes = [
    'card',
    hoverable && 'card-hoverable',
    onClick && 'card-clickable',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', action }) => {
  return (
    <div className={`card-header ${className}`}>
      <div className="card-header-content">{children}</div>
      {action && <div className="card-header-action">{action}</div>}
    </div>
  );
};

const CardBody = ({ children, className = '' }) => {
  return <div className={`card-body ${className}`}>{children}</div>;
};

const CardFooter = ({ children, className = '' }) => {
  return <div className={`card-footer ${className}`}>{children}</div>;
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
