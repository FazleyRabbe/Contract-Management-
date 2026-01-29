import { format, parseISO, formatDistanceToNow } from 'date-fns';

// Format date
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '-';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, formatStr);
  } catch (error) {
    return '-';
  }
};

// Format date with time
export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

// Relative time
export const timeAgo = (date) => {
  if (!date) return '-';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(parsedDate, { addSuffix: true });
  } catch (error) {
    return '-';
  }
};

// Format currency
export const formatCurrency = (amount, currency = 'EUR') => {
  if (amount == null) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Format budget range
export const formatBudgetRange = (min, max, currency = 'EUR') => {
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

// Count words in text
export const countWords = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Get initials from name
export const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
};

// Get full name
export const getFullName = (firstName, lastName) => {
  return [firstName, lastName].filter(Boolean).join(' ');
};

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Format status for display
export const formatStatus = (status) => {
  if (!status) return '-';
  return status
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
};

// Get status color class
export const getStatusColor = (status) => {
  const colorMap = {
    draft: 'badge-gray',
    // New workflow statuses
    pending_procurement: 'badge-warning',
    pending_legal: 'badge-warning',
    open_for_offers: 'badge-info',
    offer_selected: 'badge-info',
    pending_final_approval: 'badge-warning',
    final_approved: 'badge-success',
    // Legacy statuses
    pending_approval: 'badge-warning',
    published: 'badge-info',
    searching_provider: 'badge-info',
    provider_assigned: 'badge-info',
    in_progress: 'badge-success',
    completed: 'badge-success',
    cancelled: 'badge-error',
    // Request/Offer statuses
    pending: 'badge-warning',
    accepted: 'badge-success',
    rejected: 'badge-error',
    withdrawn: 'badge-gray',
    selected: 'badge-success',
  };
  return colorMap[status] || 'badge-gray';
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Generate query string from params
export const toQueryString = (params) => {
  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value != null && value !== '')
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  return new URLSearchParams(filteredParams).toString();
};

// Parse query string to object
export const parseQueryString = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Deep clone object
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
export const isEmpty = (obj) => {
  if (!obj) return true;
  return Object.keys(obj).length === 0;
};
