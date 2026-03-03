// CLYR - Brand Configuration
// GROUP 6 #47: Correct company details - CLYR Solutions GmbH everywhere
// GROUP 6 #48: Distribution address - Holz 33, 5211 Lengau
const brandConfig = {
  company: {
    name: 'CLYR',
    legalName: 'CLYR Solutions GmbH',
    tagline: 'Klares Wasser. Klares Leben.',
    taglineEn: 'Clear Water. Clear Life.',
    description: 'Premium Wassersysteme fuer reines, frisches Trinkwasser und erfrischende Duscherlebnisse.',
    descriptionEn: 'Premium water systems for pure, fresh drinking water and refreshing shower experiences.',
    email: 'service@clyr.shop',
    phone: '+43 664 2520432',
    website: 'https://clyr.shop',
    // #47: Correct company address
    address: {
      street: 'Pappelweg 4b',
      city: 'Villach',
      zip: '9524',
      country: 'Oesterreich',
      countryCode: 'AT',
    },
  },

  // #48: Distribution / shipping address
  distribution: {
    name: 'CLYR Solutions GmbH',
    address: {
      street: 'Holz 33',
      city: 'Lengau',
      zip: '5211',
      country: 'Oesterreich',
      countryCode: 'AT',
    },
    note: 'Versand- und Lageradresse',
  },

  branding: {
    logo: '/images/clyr-logo.jpeg',
    logoAlt: 'CLYR Logo',
    primaryColor: '#1a1a1a',
    accentColor: '#0ea5e9',
  },

  // #47: Commission paying entity = CLYR Solutions GmbH
  affiliateCompany: {
    name: 'CLYR Solutions GmbH',
    legalName: 'CLYR Solutions GmbH',
    address: {
      street: 'Pappelweg 4b',
      city: 'Villach',
      zip: '9524',
      country: 'Oesterreich',
    },
    vatId: '',
    email: 'service@clyr.shop',
  },

  // #47: Fulfillment company = CLYR Solutions GmbH
  fulfillmentCompany: {
    name: 'CLYR Solutions GmbH',
    address: {
      street: 'Holz 33',
      city: 'Lengau',
      zip: '5211',
      country: 'Oesterreich',
    },
    vatId: '',
  },

  // #47: Legal entity = CLYR Solutions GmbH
  legal: {
    companyName: 'CLYR Solutions GmbH',
    address: {
      street: 'Pappelweg 4b',
      city: 'Villach',
      zip: '9524',
      country: 'Oesterreich',
    },
    vatId: '',
    registrationNumber: '',
    court: 'Landesgericht Villach',
    managingDirector: '',
    jurisdiction: 'Gerichtsstand: Villach, Oesterreich',
    applicableLaw: 'Es gilt oesterreichisches Recht.',
  },

  social: {
    facebook: 'https://www.facebook.com/share/1G4vZd8VaL/?mibextid=wwXIfr',
    instagram: 'https://www.instagram.com/clyr.solutions?igsh=MTVsbTE5cHkyOGhtdQ==',
    youtube: 'https://youtube.com/@clyr-water',
  },

  shipping: {
    countries: ['DE', 'AT', 'CH'],
    rates: {
      DE: { flat: 50.00 },
      AT: { flat: 69.00 },
      CH: { flat: 180.00 },
    },
  },

  vat: {
    DE: 0.19,
    AT: 0.20,
    CH: 0.081,
  },

  commission: {
    adminRate: 50,
    holdDays: 14,
    minPayout: 50,
    payoutDay: 1,
  },

  partner: {
    annualFee: 100,
    activeRequirement: 2,
  },

  subscriptions: {
    filterInterval: 12,
  },
};

export default brandConfig;
