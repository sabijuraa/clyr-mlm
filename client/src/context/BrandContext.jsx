import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { brandingAPI } from '../services/api';
import brandConfig from '../config/brand.config';

// Default branding configuration - CLYR
const defaultBranding = {
  company: {
    name: brandConfig.company?.name || 'CLYR',
    legalName: brandConfig.company?.legalName || 'CLYR Solutions GmbH',
    tagline: brandConfig.company?.tagline || 'Klares Wasser. Klares Leben.',
    taglineEn: brandConfig.company?.taglineEn || 'Clear Water. Clear Life.',
    description: brandConfig.company?.description || 'Premium Wassersysteme fuer reines, frisches Trinkwasser.',
    descriptionEn: brandConfig.company?.descriptionEn || 'Premium water systems for pure, fresh drinking water.',
    email: brandConfig.company?.email || 'service@clyr.shop',
    phone: brandConfig.company?.phone || '+43 660 123 4567',
    website: brandConfig.company?.website || 'https://clyr.shop',
  },
  colors: {
    primary: '#0ea5e9',
    primaryHover: '#0284c7',
    primaryLight: '#e0f2fe',
    secondary: '#171717',
    secondaryHover: '#262626',
  },
  logo: brandConfig.branding?.logo || '/images/clyr-logo.jpeg',
  logoAlt: brandConfig.branding?.logoAlt || 'CLYR Logo',
  legal: {
    companyName: brandConfig.legal?.companyName || 'CLYR Solutions GmbH',
    street: brandConfig.legal?.address?.street || 'Pappelweg 4b',
    city: brandConfig.legal?.address?.city || 'St. Magdalen',
    zip: brandConfig.legal?.address?.zip || '9524',
    country: brandConfig.legal?.address?.country || 'Oesterreich',
    vatId: brandConfig.legal?.vatId || '',
    registrationNumber: brandConfig.legal?.registrationNumber || '',
    court: brandConfig.legal?.court || 'Landesgericht Villach',
    managingDirector: brandConfig.legal?.managingDirector || '',
    jurisdiction: brandConfig.legal?.jurisdiction || 'Gerichtsstand: Villach, Oesterreich',
  },
  affiliateCompany: {
    name: brandConfig.affiliateCompany?.name || 'CLYR Solutions GmbH',
    legalName: brandConfig.affiliateCompany?.legalName || 'CLYR Solutions GmbH',
    address: brandConfig.affiliateCompany?.address || {
      street: 'Pappelweg 4b',
      city: 'St. Magdalen',
      zip: '9524',
      country: 'Oesterreich',
    },
    vatId: brandConfig.affiliateCompany?.vatId || '',
    email: brandConfig.affiliateCompany?.email || 'service@clyr.shop',
  },
  // #48: Distribution address
  distribution: brandConfig.distribution || {
    name: 'CLYR Solutions GmbH',
    address: {
      street: 'Holz 33',
      city: 'Lengau',
      zip: '5211',
      country: 'Oesterreich',
    },
  },
  social: {
    facebook: brandConfig.social?.facebook || 'https://facebook.com/clyr.water',
    instagram: brandConfig.social?.instagram || 'https://instagram.com/clyr.water',
    youtube: brandConfig.social?.youtube || 'https://youtube.com/@clyr-water',
  },
  shipping: brandConfig.shipping || {
    countries: ['DE', 'AT', 'CH'],
    rates: {
      DE: { flat: 50.00 },
      AT: { flat: 69.00 },
      CH: { flat: 180.00 },
    },
  },
  vat: brandConfig.vat || {
    DE: 0.19,
    AT: 0.20,
    CH: 0.081,
  },
  commission: brandConfig.commission || {
    adminRate: 50,
    holdDays: 14,
    minPayout: 50,
    payoutDay: 1,
  },
};

const BrandContext = createContext(null);

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};

export const BrandProvider = ({ children }) => {
  const [branding, setBranding] = useState(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [cssVars, setCssVars] = useState({});

  // Load branding from API on mount (allows admin customization)
  useEffect(() => {
    const loadBranding = async () => {
      try {
        const response = await brandingAPI.get();
        if (response.data && Object.keys(response.data).length > 0) {
          setBranding(prev => ({
            ...prev,
            ...response.data
          }));
        }
      } catch (err) {
        // Silently fail - use defaults
        console.log('Using default CLYR branding');
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, []);

  // Apply CSS variables when branding changes
  useEffect(() => {
    if (branding.colors) {
      const root = document.documentElement;
      
      // Convert hex to RGB for CSS variables
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result 
          ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
          : null;
      };

      const vars = {
        '--color-primary': branding.colors.primary,
        '--color-primary-hover': branding.colors.primaryHover,
        '--color-primary-light': branding.colors.primaryLight,
        '--color-secondary': branding.colors.secondary,
        '--color-secondary-hover': branding.colors.secondaryHover,
        '--color-primary-rgb': hexToRgb(branding.colors.primary),
      };

      Object.entries(vars).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(key, value);
        }
      });

      setCssVars(vars);
    }
  }, [branding.colors]);

  const refreshBranding = useCallback(async () => {
    try {
      const response = await brandingAPI.get();
      if (response.data) {
        setBranding(prev => ({
          ...prev,
          ...response.data
        }));
      }
    } catch (err) {
      console.error('Failed to refresh branding:', err);
    }
  }, []);

  const value = {
    ...branding,
    loading,
    refreshBranding,
    cssVars,
    // Helper getters
    companyName: branding.company.name,
    logoUrl: branding.logo,
    primaryColor: branding.colors.primary,
    secondaryColor: branding.colors.secondary,
    // Shipping and VAT helpers
    getShippingRate: (country) => branding.shipping?.rates?.[country]?.flat || 0,
    getVatRate: (country) => branding.vat?.[country] || 0,
  };

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
};

export default BrandContext;
