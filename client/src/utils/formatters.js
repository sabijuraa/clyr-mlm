/**
 * Format currency in EUR
 */
export const formatCurrency = (amount, options = {}) => {
  const { 
    locale = 'de-DE', 
    currency = 'EUR',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(amount || 0);
};

/**
 * Format date
 */
export const formatDate = (date, options = {}) => {
  const {
    locale = 'de-DE',
    format = 'medium' // 'short', 'medium', 'long', 'full'
  } = options;

  if (!date) return '-';

  const dateObj = new Date(date);
  
  if (format === 'relative') {
    return formatRelativeDate(dateObj);
  }

  const formatOptions = {
    short: { day: '2-digit', month: '2-digit', year: '2-digit' },
    medium: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  };

  return new Intl.DateTimeFormat(locale, formatOptions[format]).format(dateObj);
};

/**
 * Format date with time
 */
export const formatDateTime = (date, options = {}) => {
  const { locale = 'de-DE' } = options;

  if (!date) return '-';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

/**
 * Format relative date (e.g., "vor 2 Tagen")
 */
export const formatRelativeDate = (date) => {
  const now = new Date();
  const dateObj = new Date(date);
  const diffMs = now - dateObj;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Minute${diffMins !== 1 ? 'n' : ''}`;
  if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours !== 1 ? 'n' : ''}`;
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
  
  return formatDate(date, { format: 'medium' });
};

/**
 * Format percentage
 */
export const formatPercent = (value, decimals = 0) => {
  return `${(value || 0).toFixed(decimals)}%`;
};

/**
 * Format number with thousands separator
 */
export const formatNumber = (value, options = {}) => {
  const { locale = 'de-DE', decimals = 0 } = options;
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value || 0);
};

/**
 * Format phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '-';
  
  // Remove all non-digits except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Format based on pattern
  if (cleaned.startsWith('+43')) {
    // Austrian format
    return cleaned.replace(/(\+43)(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
  } else if (cleaned.startsWith('+49')) {
    // German format
    return cleaned.replace(/(\+49)(\d{3})(\d+)/, '$1 $2 $3');
  }
  
  return phone;
};

/**
 * Format IBAN
 */
export const formatIBAN = (iban) => {
  if (!iban) return '-';
  return iban.replace(/(.{4})/g, '$1 ').trim();
};

/**
 * Mask IBAN (show only first 4 and last 4 characters)
 */
export const maskIBAN = (iban) => {
  if (!iban) return '-';
  return `${iban.substring(0, 4)}****${iban.slice(-4)}`;
};

/**
 * Format order status to German
 */
export const formatOrderStatus = (status) => {
  const statusMap = {
    pending: 'Ausstehend',
    processing: 'In Bearbeitung',
    shipped: 'Versendet',
    delivered: 'Zugestellt',
    completed: 'Abgeschlossen',
    cancelled: 'Storniert',
    refunded: 'Erstattet'
  };
  return statusMap[status] || status;
};

/**
 * Format payment status to German
 */
export const formatPaymentStatus = (status) => {
  const statusMap = {
    pending: 'Ausstehend',
    paid: 'Bezahlt',
    failed: 'Fehlgeschlagen',
    refunded: 'Erstattet',
    partially_refunded: 'Teilweise erstattet'
  };
  return statusMap[status] || status;
};

/**
 * Format commission type to German
 */
export const formatCommissionType = (type) => {
  const typeMap = {
    direct: 'Direkt-Provision',
    difference: 'Differenz-Provision',
    leadership_bonus: 'Leadership Bonus',
    team_volume_bonus: 'Team-Umsatz Bonus',
    rank_bonus: 'Rang-Bonus',
    bonus_pool: 'Bonus Pool',
    leadership_cash_bonus: 'Führungsprämie',
    admin: 'Admin-Provision'
  };
  return typeMap[type] || type;
};

/**
 * Format commission status to German
 */
export const formatCommissionStatus = (status) => {
  const statusMap = {
    pending: 'Ausstehend',
    held: 'Zurückgehalten',
    released: 'Freigegeben',
    paid: 'Ausgezahlt',
    cancelled: 'Storniert',
    reversed: 'Rückgängig'
  };
  return statusMap[status] || status;
};

/**
 * Format partner status to German
 */
export const formatPartnerStatus = (status) => {
  const statusMap = {
    pending: 'Ausstehend',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    suspended: 'Gesperrt'
  };
  return statusMap[status] || status;
};

/**
 * Get status color class
 */
export const getStatusColor = (status, type = 'order') => {
  const colors = {
    // Order status
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
    // Payment status
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    partially_refunded: 'bg-orange-100 text-orange-800',
    // Commission status
    held: 'bg-yellow-100 text-yellow-800',
    released: 'bg-green-100 text-green-800',
    reversed: 'bg-red-100 text-red-800',
    // Partner status
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800'
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export default {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeDate,
  formatPercent,
  formatNumber,
  formatPhone,
  formatIBAN,
  maskIBAN,
  formatOrderStatus,
  formatPaymentStatus,
  formatCommissionType,
  formatCommissionStatus,
  formatPartnerStatus,
  getStatusColor
};