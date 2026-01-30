/**
 * CLYR APPLICATION CONFIGURATION
 * ==============================
 * Business logic settings for CLYR MLM Platform
 * 
 * BILLING COMPANY (for customers):
 * MUTIMBAUCH VERTRIEBS GMBH
 * Germany
 * https://firmeneintrag.creditreform.de/77883/7110538733/MUTIMBAUCH_VERTRIEBS_GMBH
 * 
 * COMMISSION PAYMENTS (for affiliates):
 * FreshLiving - Theresa Struger
 * Austria
 * 
 * === BASED ON THERESA'S MESSAGES (Jan 22, 2026) ===
 */

const appConfig = {
  // Supported Countries with VAT rates
  // Per Theresa: "People from germany have to pay 19% tax"
  // Per Theresa: "People from Austria have to pay 20% tax"
  // Per Theresa: "People from Austria WITH VAT UID dont have to pay any tax"
  // Per Theresa: "People from Switzerland pay without tax"
  countries: {
    DE: { 
      name: 'Deutschland', 
      code: 'DE', 
      vatRate: 0.19, 
      vatLabel: '19% MwSt.',
      // Germany: Always 19% tax (even with VAT ID)
      reverseCharge: false
    },
    AT: { 
      name: 'Österreich', 
      code: 'AT', 
      vatRate: 0.20, 
      vatLabel: '20% MwSt.',
      // Austria: 20% tax, but 0% with VAT UID (reverse charge)
      reverseCharge: true
    },
    CH: { 
      name: 'Schweiz', 
      code: 'CH', 
      vatRate: 0, 
      vatLabel: 'Keine MwSt.',
      // Switzerland: Always 0% tax (export)
      reverseCharge: false
    }
  },

  // Fixed Shipping Costs (per Theresa's messages)
  // Per Theresa: "Shipping costs 50€" (Germany)
  // Per Theresa: "Shipping costs 69€" (Austria)
  // Per Theresa: "Shipping costs 180€" (Switzerland)
  shipping: {
    DE: 50,    // Germany: €50 flat
    AT: 69,    // Austria: €69 flat  
    CH: 180    // Switzerland: €180 flat
  },

  // Partner/Affiliate Configuration
  partner: {
    annualFee: 100.00,        // Annual partner registration fee
    proRatedFee: true,        // Fee is pro-rated based on month of registration
    minPayoutThreshold: 50.00, // Minimum balance for payout request
    commissionHoldDays: 14,    // Days before commission is released
    payoutDay: 1               // Day of month for automatic payouts
  },

  // Rank System (commission rates 8% - 36%)
  ranks: [
    { 
      id: 1, 
      key: 'starter', 
      name: { de: 'Starter', en: 'Starter' }, 
      rate: 0.08,      // 8%
      minSales: 0, 
      bonus: 0, 
      color: '#94A3B8' 
    },
    { 
      id: 2, 
      key: 'consultant', 
      name: { de: 'Berater', en: 'Consultant' }, 
      rate: 0.22,      // 22%
      minSales: 1, 
      bonus: 0, 
      color: '#60A5FA' 
    },
    { 
      id: 3, 
      key: 'senior', 
      name: { de: 'Senior Berater', en: 'Senior Consultant' }, 
      rate: 0.26,      // 26%
      minSales: 11, 
      bonus: 0, 
      color: '#34D399' 
    },
    { 
      id: 4, 
      key: 'teamleader', 
      name: { de: 'Teamleiter', en: 'Team Leader' }, 
      rate: 0.30,      // 30%
      minSales: 21, 
      bonus: 500, 
      color: '#FBBF24' 
    },
    { 
      id: 5, 
      key: 'manager', 
      name: { de: 'Manager', en: 'Manager' }, 
      rate: 0.33,      // 33%
      minSales: 50, 
      bonus: 1000, 
      color: '#F97316' 
    },
    { 
      id: 6, 
      key: 'salesmanager', 
      name: { de: 'Verkaufsleiter', en: 'Sales Manager' }, 
      rate: 0.36,      // 36%
      minSales: 100, 
      bonus: 2000, 
      color: '#EF4444' 
    }
  ],

  // Admin (Theresa) gets 50% commission on all sales
  // Per Theresa: "So i need extra commission for admin ist me. I think it would be 50%"
  adminCommissionRate: 0.50,

  // Commission payment rules for affiliates:
  // Per Theresa: "Affiliates from Germany get commission without tax - They always need VAT UID"
  // Per Theresa: "Affiliates from Austria without VAT UID get commissions with VAT but not extra declared"
  // Per Theresa: "Affiliates from Austria with VAT UID get commissions with VAT extra declared"
  affiliateCommission: {
    DE: { 
      requiresVatId: true,    // Germany affiliates MUST have VAT UID
      vatIncluded: false,     // Commission without tax
      vatRate: 0              // No VAT on commission
    },
    AT: { 
      requiresVatId: false,   // Austria affiliates don't require VAT UID
      // Without VAT UID: VAT included but not separately declared
      // With VAT UID: VAT separately declared (reverse charge)
      vatIncluded: true,
      vatRate: 0.20
    },
    CH: { 
      requiresVatId: false, 
      vatIncluded: false,
      vatRate: 0
    }
  },

  // Supported Languages
  languages: [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ],

  // Currency Configuration
  currency: {
    code: 'EUR',
    symbol: '€',
    locale: 'de-DE'
  },

  // Main Products (per Theresa's messages)
  // Per Theresa: "STILLUNDLAUT Home Soda - Price without tax 3332,5"
  // Per Theresa: "Shower (now Aroma Sense) - Price without tax 126€"
  mainProducts: {
    sodaMachine: {
      name: 'CLYR Home Soda',
      priceNet: 3332.50,  // Price without tax
      description: 'Premium Soda Machine with different faucet options'
    },
    aromaDusche: {
      name: 'CLYR Aroma Dusche',
      priceNet: 126.00,   // Price without tax
      description: 'Shower with different aroma scents'
    }
  },

  // Service Products (per Theresa's messages)
  // Per Theresa: "Installation that is 400€ without tax"
  // Per Theresa: "Filter Abo that is the same every 12 months automatically"
  services: {
    installation: {
      name: 'Professionelle Installation',
      priceNet: 400.00,   // Price without tax
      description: 'Professional installation service'
    },
    filterAbo: {
      name: 'Filter-Abo',
      priceNet: 149.00,   // Price without tax (annual subscription)
      interval: 12,       // Auto-renewal every 12 months
      description: 'Annual filter subscription - auto-renews'
    }
  },

  // Billing Company Information (per Theresa's messages)
  // Per Theresa: "Billing for customers should come from this company"
  billingCompany: {
    name: 'MUTIMBAUCH VERTRIEBS GMBH',
    country: 'DE',
    creditreform: 'https://firmeneintrag.creditreform.de/77883/7110538733/MUTIMBAUCH_VERTRIEBS_GMBH'
  },

  // Commission Payment Company (per Theresa's messages)
  // Per Theresa: "Affiliates get paid from me - FreshLiving – Theresa Struger"
  commissionCompany: {
    name: 'FreshLiving',
    owner: 'Theresa Struger',
    country: 'AT'
  }
};

// ============ HELPER FUNCTIONS ============

/**
 * Calculate shipping cost for a country
 * @param {string} country - Country code (DE, AT, CH)
 * @returns {number} - Shipping cost in EUR
 */
export const calculateShipping = (country) => {
  return appConfig.shipping[country] || appConfig.shipping.DE;
};

/**
 * Calculate VAT based on country and VAT ID
 * @param {number} amount - Net amount
 * @param {string} country - Country code
 * @param {boolean} hasVatId - Whether customer has VAT ID
 * @returns {number} - VAT amount
 */
export const calculateVAT = (amount, country, hasVatId = false) => {
  const config = appConfig.countries[country];
  if (!config) return 0;
  
  // Switzerland: Always 0%
  if (country === 'CH') return 0;
  
  // Austria with VAT ID: 0% (reverse charge)
  if (country === 'AT' && hasVatId) return 0;
  
  // Germany: Always 19% (even with VAT ID)
  // Austria without VAT ID: 20%
  return amount * config.vatRate;
};

/**
 * Calculate order totals
 * @param {number} subtotal - Cart subtotal (net)
 * @param {string} country - Country code
 * @param {boolean} hasVatId - Whether customer has VAT ID
 * @returns {object} - Order totals
 */
export const calculateOrderTotals = (subtotal, country, hasVatId = false) => {
  const shipping = calculateShipping(country);
  const vat = calculateVAT(subtotal + shipping, country, hasVatId);
  const total = subtotal + shipping + vat;
  
  return {
    subtotal,
    shipping,
    vat,
    total,
    vatRate: appConfig.countries[country]?.vatRate || 0,
    hasReverseCharge: hasVatId && country === 'AT'
  };
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return new Intl.NumberFormat(appConfig.currency.locale, {
      style: 'currency',
      currency: appConfig.currency.code
    }).format(0);
  }
  return new Intl.NumberFormat(appConfig.currency.locale, {
    style: 'currency',
    currency: appConfig.currency.code
  }).format(amount);
};

/**
 * Calculate prorated partner fee based on registration month
 * @param {number} month - Month of registration (1-12)
 * @returns {number} - Prorated fee
 */
export const calculatePartnerFee = (month) => {
  const { annualFee, proRatedFee } = appConfig.partner;
  if (!proRatedFee) return annualFee;
  const monthsRemaining = 12 - month + 1;
  return Math.round((annualFee / 12) * monthsRemaining * 100) / 100;
};

/**
 * Get rank by ID
 * @param {number} id - Rank ID
 * @returns {object} - Rank object
 */
export const getRankById = (id) => {
  return appConfig.ranks.find(r => r.id === id) || appConfig.ranks[0];
};

/**
 * Get next rank for progression
 * @param {number} currentId - Current rank ID
 * @returns {object|null} - Next rank or null if at max
 */
export const getNextRank = (currentId) => {
  const idx = appConfig.ranks.findIndex(r => r.id === currentId);
  return idx >= 0 && idx < appConfig.ranks.length - 1 ? appConfig.ranks[idx + 1] : null;
};

/**
 * Get VAT label for display
 * @param {string} country - Country code
 * @param {boolean} hasVatId - Whether customer has VAT ID
 * @returns {string} - VAT label
 */
export const getVatLabel = (country, hasVatId = false) => {
  if (country === 'CH') return 'Keine MwSt.';
  if (country === 'AT' && hasVatId) return 'Reverse Charge';
  return appConfig.countries[country]?.vatLabel || '19% MwSt.';
};

export default appConfig;
