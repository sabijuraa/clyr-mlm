/**
 * APPLICATION CONFIGURATION
 * =========================
 * Business logic settings, shipping, VAT, ranks, commissions
 */

const appConfig = {
  // Supported Countries with VAT
  countries: {
    DE: { name: 'Deutschland', code: 'DE', vatRate: 0.19, vatLabel: '19% MwSt.' },
    AT: { name: 'Österreich', code: 'AT', vatRate: 0.20, vatLabel: '20% MwSt.' },
    CH: { name: 'Schweiz', code: 'CH', vatRate: 0, vatLabel: '0% MwSt.' }
  },

  // Shipping Costs
  shipping: {
    DE: { small: 9.90, large: 39.39, threshold: 100 },
    AT: { small: 9.90, large: 69.90, threshold: 100 },
    CH: { flat: 170.00 }
  },

  // Partner Configuration
  partner: {
    annualFee: 100.00,
    proRatedFee: true,
    minPayoutThreshold: 50.00,
    commissionHoldDays: 14,
    payoutDay: 1
  },

  // Rank System
  ranks: [
    { id: 1, key: 'starter', name: { de: 'Starter', en: 'Starter' }, rate: 0.08, minSales: 0, bonus: 0, color: '#94A3B8' },
    { id: 2, key: 'consultant', name: { de: 'Berater', en: 'Consultant' }, rate: 0.22, minSales: 1, bonus: 0, color: '#60A5FA' },
    { id: 3, key: 'senior', name: { de: 'Senior Berater', en: 'Senior Consultant' }, rate: 0.26, minSales: 11, bonus: 0, color: '#34D399' },
    { id: 4, key: 'teamleader', name: { de: 'Teamleiter', en: 'Team Leader' }, rate: 0.30, minSales: 21, bonus: 500, color: '#FBBF24' },
    { id: 5, key: 'manager', name: { de: 'Manager', en: 'Manager' }, rate: 0.33, minSales: 50, bonus: 1000, color: '#F97316' },
    { id: 6, key: 'salesmanager', name: { de: 'Verkaufsleiter', en: 'Sales Manager' }, rate: 0.36, minSales: 100, bonus: 2000, color: '#EF4444' }
  ],

  // Admin gets 46% on all sales
  adminCommissionRate: 0.46,

  // Languages
  languages: [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ],

  // Currency
  currency: {
    code: 'EUR',
    symbol: '€',
    locale: 'de-DE'
  }
};

// Helper: Calculate shipping
export const calculateShipping = (country, cartTotal, hasLargeItem = false) => {
  const config = appConfig.shipping[country];
  if (!config) return 0;
  if (country === 'CH') return config.flat;
  return (hasLargeItem || cartTotal >= config.threshold) ? config.large : config.small;
};

// Helper: Calculate VAT
export const calculateVAT = (amount, country, hasVatId = false) => {
  const config = appConfig.countries[country];
  if (!config) return 0;
  if (hasVatId && country !== 'DE') return 0; // Reverse charge
  return amount * config.vatRate;
};

// Helper: Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat(appConfig.currency.locale, {
    style: 'currency',
    currency: appConfig.currency.code
  }).format(amount);
};

// Helper: Calculate prorated partner fee
export const calculatePartnerFee = (month) => {
  const { annualFee, proRatedFee } = appConfig.partner;
  if (!proRatedFee) return annualFee;
  const monthsRemaining = 12 - month + 1;
  return Math.round((annualFee / 12) * monthsRemaining * 100) / 100;
};

// Helper: Get rank by ID
export const getRankById = (id) => appConfig.ranks.find(r => r.id === id) || appConfig.ranks[0];

// Helper: Get next rank
export const getNextRank = (currentId) => {
  const idx = appConfig.ranks.findIndex(r => r.id === currentId);
  return idx >= 0 && idx < appConfig.ranks.length - 1 ? appConfig.ranks[idx + 1] : null;
};

export default appConfig;