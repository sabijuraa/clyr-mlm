/**
 * Email validation
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
 */
export const isValidPassword = (password) => {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return {
    isValid: minLength && hasUppercase && hasLowercase && hasNumber,
    errors: {
      minLength: !minLength ? 'Mindestens 8 Zeichen' : null,
      uppercase: !hasUppercase ? 'Ein Großbuchstabe erforderlich' : null,
      lowercase: !hasLowercase ? 'Ein Kleinbuchstabe erforderlich' : null,
      number: !hasNumber ? 'Eine Zahl erforderlich' : null
    }
  };
};

/**
 * IBAN validation (basic format check)
 */
export const isValidIBAN = (iban) => {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  const regex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,}$/;
  return regex.test(cleaned) && cleaned.length >= 15 && cleaned.length <= 34;
};

/**
 * Phone number validation
 */
export const isValidPhone = (phone) => {
  if (!phone) return true; // Optional field
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const regex = /^\+?[0-9]{8,15}$/;
  return regex.test(cleaned);
};

/**
 * German/Austrian/Swiss postal code validation
 */
export const isValidPostalCode = (postalCode, country) => {
  if (!postalCode) return false;
  
  const patterns = {
    DE: /^[0-9]{5}$/,
    AT: /^[0-9]{4}$/,
    CH: /^[0-9]{4}$/
  };
  
  const pattern = patterns[country] || patterns.DE;
  return pattern.test(postalCode);
};

/**
 * VAT ID validation
 */
export const isValidVatId = (vatId, country) => {
  if (!vatId) return true; // Optional field
  
  const patterns = {
    DE: /^DE[0-9]{9}$/,
    AT: /^ATU[0-9]{8}$/,
    CH: /^CHE[0-9]{9}(MWST)?$/
  };
  
  const pattern = patterns[country];
  if (!pattern) return true;
  
  return pattern.test(vatId.replace(/[\s\.]/g, ''));
};

/**
 * Required field validation
 */
export const isRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

/**
 * Min length validation
 */
export const minLength = (value, min) => {
  return value && value.length >= min;
};

/**
 * Max length validation
 */
export const maxLength = (value, max) => {
  return !value || value.length <= max;
};

/**
 * URL validation
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Form validation helper
 */
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.entries(rules).forEach(([field, fieldRules]) => {
    const value = data[field];
    
    fieldRules.forEach(rule => {
      if (errors[field]) return; // Stop on first error
      
      if (rule.required && !isRequired(value)) {
        errors[field] = rule.message || 'Dieses Feld ist erforderlich';
      }
      
      if (rule.email && value && !isValidEmail(value)) {
        errors[field] = rule.message || 'Ungültige E-Mail-Adresse';
      }
      
      if (rule.minLength && value && !minLength(value, rule.minLength)) {
        errors[field] = rule.message || `Mindestens ${rule.minLength} Zeichen`;
      }
      
      if (rule.maxLength && !maxLength(value, rule.maxLength)) {
        errors[field] = rule.message || `Maximal ${rule.maxLength} Zeichen`;
      }
      
      if (rule.pattern && value && !rule.pattern.test(value)) {
        errors[field] = rule.message || 'Ungültiges Format';
      }
      
      if (rule.custom && !rule.custom(value, data)) {
        errors[field] = rule.message || 'Ungültiger Wert';
      }
    });
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  isValidEmail,
  isValidPassword,
  isValidIBAN,
  isValidPhone,
  isValidPostalCode,
  isValidVatId,
  isRequired,
  minLength,
  maxLength,
  isValidUrl,
  validateForm
};
