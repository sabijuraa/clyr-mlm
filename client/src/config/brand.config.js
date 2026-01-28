// CLYR - Brand Configuration
// Rebranded from Still und Laut / FreshLiving
const brandConfig = {
  company: {
    name: 'CLYR',
    tagline: 'Klares Wasser. Klares Leben.',
    taglineEn: 'Clear Water. Clear Life.',
    description: 'Premium Wassersysteme für reines, frisches Trinkwasser und erfrischende Duscherlebnisse.',
    descriptionEn: 'Premium water systems for pure, fresh drinking water and refreshing shower experiences.',
    email: 'info@clyr.at',
    phone: '+43 660 123 4567',
    website: 'https://clyr.at',
  },

  branding: {
    logo: '/images/clyr-logo.jpeg',
    logoAlt: 'CLYR Logo',
    primaryColor: '#1a1a1a',
    accentColor: '#0ea5e9',
  },

  // Company paying affiliates (Theresa / FreshLiving)
  affiliateCompany: {
    name: 'FreshLiving',
    legalName: 'Theresa Struger - FreshLiving',
    address: {
      street: 'Musterstraße 1',
      city: 'Wien',
      zip: '1010',
      country: 'Österreich',
    },
    vatId: 'ATU12345678',
    email: 'commissions@freshliving.at',
  },

  // Company shipping products (Partner in Germany)
  fulfillmentCompany: {
    name: 'MUTIMBAUCH Vertriebs GmbH',
    address: {
      street: 'Industriestraße 123',
      city: 'München',
      zip: '80333',
      country: 'Deutschland',
    },
    vatId: 'DE123456789',
    registrationNumber: 'HRB 123456',
    court: 'Amtsgericht München',
    creditreformUrl: 'https://firmeneintrag.creditreform.de/77883/7110538733/MUTIMBAUCH_VERTRIEBS_GMBH',
  },

  // Legal entity for imprint (invoices from this company)
  legal: {
    companyName: 'MUTIMBAUCH Vertriebs GmbH',
    address: {
      street: 'Industriestraße 123',
      city: 'München',
      zip: '80333',
      country: 'Deutschland',
    },
    vatId: 'DE123456789',
    registrationNumber: 'HRB 123456',
    court: 'Amtsgericht München',
    managingDirector: 'Name des Geschäftsführers',
  },

  social: {
    facebook: 'https://facebook.com/clyr.water',
    instagram: 'https://instagram.com/clyr.water',
    youtube: 'https://youtube.com/@clyr-water',
  },

  // Updated shipping costs per client requirements
  shipping: {
    countries: ['DE', 'AT', 'CH'],
    rates: {
      DE: { flat: 50.00 },
      AT: { flat: 69.00 },
      CH: { flat: 180.00 },
    },
  },

  // VAT rates per country
  vat: {
    DE: 0.19,
    AT: 0.20,
    CH: 0.00,
  },

  // Commission configuration
  commission: {
    adminRate: 50,
    holdDays: 14,
    minPayout: 50,
    payoutDay: 1,
  },

  // Partner registration
  partner: {
    annualFee: 100,
    activeRequirement: 2,
  },

  // Subscription products
  subscriptions: {
    filterInterval: 12,
  },
};

export default brandConfig;
