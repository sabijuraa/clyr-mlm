/**
 * HELPER FUNCTIONS
 */

// Format date to German format
export const formatDate = (date, options = {}) => {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options
  }).format(new Date(date));
};

// Format date with time
export const formatDateTime = (date) => {
  return formatDate(date, { hour: '2-digit', minute: '2-digit' });
};

// Generate unique ID
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

// Truncate text
export const truncate = (str, length = 100) => {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + '...';
};

// Slugify text
export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Debounce function
export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// Get initials from name
export const getInitials = (firstName = '', lastName = '') => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

// Validate email
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validate IBAN (basic check)
export const isValidIBAN = (iban) => {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,}$/.test(cleaned);
};

// Class name merger (like clsx)
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};