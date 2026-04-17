/**
 * CLYR APPLICATION CONFIGURATION
 * ==============================
 * Business logic settings for CLYR MLM Platform
 * 
 * COMPANY: CLYR Solutions GmbH
 * Pappelweg 4b, 9524 Villach, Oesterreich
 * service@clyr.shop | www.clyr.shop
 * 
 * DISTRIBUTION ADDRESS: Holz 33, 5211 Lengau, Oesterreich
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
      // Germany B2C: 19% MwSt. / B2B with VAT ID: 0% Reverse Charge
      reverseCharge: true
    },
    AT: { 
      name: 'Oesterreich', 
      code: 'AT', 
      vatRate: 0.20, 
      vatLabel: '20% MwSt.',
      // Austria (home country): Always 20% MwSt.
      reverseCharge: false
    },
    CH: { 
      name: 'Schweiz', 
      code: 'CH', 
      vatRate: 0.081, 
      vatLabel: '8.1% MwSt.',
      // Switzerland: 8.1% Swiss MwSt.
      reverseCharge: false
    }
  },

  // Shipping Costs (per Theresa 2026-02-17)
  // Soda System: big shipping / Small items: small shipping
  // Montage: 0€ / Mixed order: only large rate applies
  shipping: {
    DE: { large: 70, small: 14.90 },
    AT: { large: 55, small: 9.90 },
    CH: { large: 180, small: 35 }
  },

  // Partner/Affiliate Configuration
  partner: {
    annualFee: 100.00,        // Annual partner registration fee
    proRatedFee: true,        // Fee is pro-rated based on month of registration
    minPayoutThreshold: 50.00, // Minimum balance for payout request
    commissionHoldDays: 14,    // Days before commission is released
    payoutDay: 1               // Day of month for automatic payouts
  },

  // Rank System — CORRECT per CLYR Vergütungsplan
  // R1-R6 for partners, R7 admin-only (Theresa)
  ranks: [
    { 
      id: 1, 
      key: 'starter', 
      name: { de: 'Starter', en: 'Starter' }, 
      rate: 0.08,      // 8% → €266 on €3,332.50
      minSales: 0,
      criteria: { de: 'Registrierung', en: 'Registration' },
      bonus: 0, 
      color: '#94A3B8' 
    },
    { 
      id: 2, 
      key: 'consultant', 
      name: { de: 'Berater', en: 'Consultant' }, 
      rate: 0.19,      // 19% → €633
      minSales: 1,
      criteria: { de: '1-10 kumulative persönliche Verkäufe', en: '1-10 cumulative personal sales' },
      bonus: 0, 
      color: '#60A5FA' 
    },
    { 
      id: 3, 
      key: 'senior', 
      name: { de: 'Fachberater', en: 'Senior Consultant' }, 
      rate: 0.21,      // 21% → €699
      minSales: 11,
      criteria: { de: '11-20 kumulative persönliche Verkäufe', en: '11-20 cumulative personal sales' },
      bonus: 0, 
      color: '#34D399' 
    },
    { 
      id: 4, 
      key: 'teamleader', 
      name: { de: 'Teamleiter', en: 'Team Leader' }, 
      rate: 0.25,      // 25% → €833
      minSales: 5,
      minTeamSales: 15,
      consecutiveMonths: 3,
      criteria: { de: '≥5 persönliche + 15 Team-Verkäufe/Monat × 3 Monate', en: '≥5 personal + 15 team sales/month × 3 months' },
      bonus: 500, 
      color: '#FBBF24' 
    },
    { 
      id: 5, 
      key: 'manager', 
      name: { de: 'Manager', en: 'Manager' }, 
      rate: 0.28,      // 28% → €933
      minTeamSales: 30,
      consecutiveMonths: 3,
      criteria: { de: '30 Team-Verkäufe/Monat × 3 Monate', en: '30 team sales/month × 3 months' },
      bonus: 1000, 
      color: '#F97316' 
    },
    { 
      id: 6, 
      key: 'salesmanager', 
      name: { de: 'Sales Manager', en: 'Sales Manager' }, 
      rate: 0.31,      // 31% → €1,033
      minTeamSales: 50,
      consecutiveMonths: 3,
      criteria: { de: '50 Team-Verkäufe/Monat × 3 Monate', en: '50 team sales/month × 3 months' },
      bonus: 2000, 
      color: '#EF4444' 
    },
    {
      id: 7,
      key: 'direktor',
      name: { de: 'Direktor', en: 'Director' },
      rate: 0.34,      // 34% — Admin only (Theresa)
      adminOnly: true,
      criteria: { de: 'Nur Geschäftsführung', en: 'Admin only' },
      bonus: 0,
      color: '#7C3AED'
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
    locale: 'en-US'
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
    name: 'CLYR Solutions GmbH',
    country: 'AT',
    address: 'Pappelweg 4b, 9524 Villach'
  },

  // Commission Payment Company - CLYR Solutions GmbH
  commissionCompany: {
    name: 'CLYR Solutions GmbH',
    country: 'AT',
    email: 'service@clyr.shop'
  }
};

// ============ HELPER FUNCTIONS ============

/**
 * Calculate shipping cost for a country
 * Soda System = large shipping, small products = small shipping
 * Montage/services = 0€, Mixed = large rate only
 */
export const calculateShipping = (country, items = []) => {
  const config = appConfig.shipping[country] || appConfig.shipping.DE;
  
  // Legacy flat rate support
  if (typeof config === 'number') return config;
  
  // Only services? No shipping
  const hasPhysical = items.length === 0 || items.some(item => !item.is_service && !item.isService);
  if (!hasPhysical) return 0;
  
  const hasLargeItem = items.some(item => item.is_large_item || item.isLargeItem);
  return hasLargeItem ? (config.large || 70) : (config.small || 14.90);
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
  
  // Reverse Charge: Any EU country with valid VAT ID = 0%
  if (hasVatId && config.reverseCharge) return 0;
  
  // Austria with VAT ID: 0% (reverse charge)
  if (country === 'AT' && hasVatId) return 0;
  
  // Standard VAT rates
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
    hasReverseCharge: hasVatId && (country === 'AT' || (appConfig.countries[country]?.reverseCharge && hasVatId))
  };
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof num !== 'number' || isNaN(num)) {
    return new Intl.NumberFormat(appConfig.currency.locale, {
      style: 'currency',
      currency: appConfig.currency.code
    }).format(0);
  }
  return new Intl.NumberFormat(appConfig.currency.locale, {
    style: 'currency',
    currency: appConfig.currency.code
  }).format(num);
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
  const partnerRanks = appConfig.ranks.filter(r => !r.adminOnly);
  const idx = partnerRanks.findIndex(r => r.id === currentId);
  return idx >= 0 && idx < partnerRanks.length - 1 ? partnerRanks[idx + 1] : null;
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