// All EU country VAT IDs supported for reverse charge (except Austria - company home country)
const EU_COUNTRIES = [
  'BE','BG','CY','CZ','DE','DK','EE','EL','ES','FI','FR','HR',
  'HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE',
  'SI','SK'
];

const VAT_CUTOFF_DATE = new Date('2026-07-01T00:00:00.000Z');

const VAT_RATES_AFTER_CUTOFF = {
  AT: 20,
  DE: 19,
  CH: 8.1,
  IT: 22,
};

// Standard country VAT rates before cutoff (for display/calculation)
const COUNTRY_VAT_RATES = {
  AT: 20,
  DE: 19,
  CH: 8.1,
  IT: 22,
};

export const normalizeCountry = (country) => String(country || '').trim().toUpperCase();

export const normalizeVatId = (vatId) => String(vatId || '').replace(/[\s.\-]/g, '').toUpperCase();

export const isBeforeVatCutoff = (date = new Date()) => new Date(date) < VAT_CUTOFF_DATE;

export const isVatIdFormatValid = (vatId, country) => {
  const id = normalizeVatId(vatId);
  const c = normalizeCountry(country) || id.slice(0, 2);

  if (!id) return false;
  if (c === 'DE') return /^DE[0-9]{9}$/.test(id);
  if (c === 'AT') return /^ATU[0-9]{8}$/.test(id);
  if (c === 'CH') return /^CHE[0-9]{9}(MWST|TVA|IVA)?$/.test(id);
  if (c === 'IT') return /^IT[0-9]{11}$/.test(id);
  // Generic EU format for other countries
  return /^[A-Z]{2}[A-Z0-9]{2,14}$/.test(id);
};

export const validateVatId = async (vatId, country) => {
  const normalized = normalizeVatId(vatId);
  const c = normalizeCountry(country) || normalized.slice(0, 2);

  if (!normalized) {
    return { valid: false, normalized, source: 'empty' };
  }

  if (!isVatIdFormatValid(normalized, c)) {
    return { valid: false, normalized, source: 'format' };
  }

  // For EU countries (not AT which is home country), try VIES
  const isEu = EU_COUNTRIES.includes(c);
  if (!isEu && c !== 'AT') {
    return { valid: true, normalized, source: 'format' };
  }

  try {
    const countryCode = normalized.slice(0, 2);
    const vatNumber = normalized.slice(2);
    const response = await fetch('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode, vatNumber }),
    });

    if (!response.ok) {
      return { valid: true, normalized, source: 'format_vies_unavailable' };
    }

    const data = await response.json();
    return { valid: data.valid === true, normalized, source: 'vies', raw: data };
  } catch {
    return { valid: true, normalized, source: 'format_vies_unavailable' };
  }
};

export const getVatIdValidation = async (vatId, country) => {
  const normalized = normalizeVatId(vatId);
  if (!normalized) {
    return { valid: false, normalized, source: 'empty', usableForReverseCharge: false };
  }

  const validation = await validateVatId(normalized, country);
  return {
    ...validation,
    usableForReverseCharge: validation.valid === true,
  };
};

export const calculateVatRule = ({ country, vatId, date = new Date(), vatIdValid = null } = {}) => {
  const c = normalizeCountry(country);
  const normalizedVatId = normalizeVatId(vatId);
  const hasVatId = !!normalizedVatId;
  const hasValidVatId = vatIdValid === null ? hasVatId && isVatIdFormatValid(normalizedVatId, c) : !!vatIdValid;

  // Reverse charge for ANY EU country (except AT = home country) with valid VAT ID
  const isEuCountry = EU_COUNTRIES.includes(c);
  if (isEuCountry && hasValidVatId) {
    return {
      country: c,
      vatRate: 0,
      vatType: 'reverse_charge',
      isReverseCharge: true,
      vatNote: 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfaengers',
    };
  }

  // Austria is the home country - always standard AT VAT rate (no reverse charge for AT)
  if (c === 'AT') {
    return {
      country: c,
      vatRate: 20,
      vatType: 'standard',
      isReverseCharge: false,
      vatNote: '',
    };
  }

  // Switzerland - not EU, fixed rate
  if (c === 'CH') {
    return {
      country: c,
      vatRate: 8.1,
      vatType: 'standard',
      isReverseCharge: false,
      vatNote: '',
    };
  }

  // For non-EU, non-AT countries: use country-specific rate if known
  const knownRate = COUNTRY_VAT_RATES[c];
  if (knownRate !== undefined) {
    return {
      country: c,
      vatRate: knownRate,
      vatType: 'standard',
      isReverseCharge: false,
      vatNote: '',
    };
  }

  // Before cutoff: standard 20%
  if (isBeforeVatCutoff(date)) {
    return {
      country: c,
      vatRate: 20,
      vatType: 'standard',
      isReverseCharge: false,
      vatNote: '',
    };
  }

  const vatRate = VAT_RATES_AFTER_CUTOFF[c] ?? 20;
  return {
    country: c,
    vatRate,
    vatType: 'standard',
    isReverseCharge: false,
    vatNote: '',
  };
};

export const splitGrossAmount = (grossAmount, vatRate) => {
  const gross = Math.round((parseFloat(grossAmount) || 0) * 100) / 100;
  const rate = parseFloat(vatRate) || 0;
  if (rate <= 0) {
    return { netAmount: gross, vatAmount: 0, grossAmount: gross };
  }

  const netAmount = Math.round((gross / (1 + rate / 100)) * 100) / 100;
  const vatAmount = Math.round((gross - netAmount) * 100) / 100;
  return { netAmount, vatAmount, grossAmount: gross };
};
