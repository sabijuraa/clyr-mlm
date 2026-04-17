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
    primary: '#3e5c66',
    primaryHover: '#2d4851',
    primaryLight: '#e0f2eb',
    secondary: '#a8e0d0',
    secondaryHover: '#8fd4c0',
  },
  logo: brandConfig.branding?.logo || '/images/clyr-logo.png',
  logoAlt: brandConfig.branding?.logoAlt || 'CLYR Logo',
  legal: {
    companyName: brandConfig.legal?.companyName || 'CLYR Solutions GmbH',
    street: brandConfig.legal?.address?.street || 'Pappelweg 4b',
    city: brandConfig.legal?.address?.city || 'Villach',
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
      city: 'Villach',
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
          const d = response.data;
          // Build colors from flat fields — never overwrite nested objects with undefined
          const colors = {
            primary:       d.primary_color   || d.colors?.primary   || '#0d9488',
            primaryHover:  d.primary_color   || d.colors?.primaryHover || '#0f766e',
            primaryLight:  d.colors?.primaryLight  || '#ccfbf1',
            secondary:     d.secondary_color || d.colors?.secondary  || '#1a3a4a',
            secondaryHover:d.secondary_color || d.colors?.secondaryHover || '#1a3a4a',
          };
          setBranding(prev => ({
            ...prev,
            // Only update flat fields — never touch nested objects like company, legal, etc.
            colors,
            logo: d.logo_light_url || d.logo || prev.logo,
            logoAlt: prev.logoAlt,
            company: prev.company, // preserve company from brand.config
            legal: prev.legal,
            social: d.social ? { ...prev.social, ...d.social } : prev.social,
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

  // Apply CSS variables + inject style override when branding changes
  useEffect(() => {
    if (branding.colors) {
      const root = document.documentElement;
      const primary = branding.colors.primary || '#3e5c66';
      const secondary = branding.colors.secondary || '#a8e0d0';
      const primaryLight = branding.colors.primaryLight || '#e0f2eb';
      
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result 
          ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
          : null;
      };

      // HSL-based shade helper: treats colors properly at all lightness levels.
      // Converts hex → HSL → adjusts lightness → back to hex.
      // This way shading a dark color gives a darker/lighter version, not black/white.
      const hexToHsl = (hex) => {
        const h = hex.replace('#','');
        const r = parseInt(h.slice(0,2), 16) / 255;
        const g = parseInt(h.slice(2,4), 16) / 255;
        const b = parseInt(h.slice(4,6), 16) / 255;
        const max = Math.max(r,g,b), min = Math.min(r,g,b);
        let hh, s, l = (max + min) / 2;
        if (max === min) { hh = s = 0; }
        else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: hh = (g - b) / d + (g < b ? 6 : 0); break;
            case g: hh = (b - r) / d + 2; break;
            case b: hh = (r - g) / d + 4; break;
          }
          hh /= 6;
        }
        return { h: hh * 360, s: s * 100, l: l * 100 };
      };
      const hslToHex = (h, s, l) => {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
        return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
      };
      
      // Build Tailwind-like scale using absolute lightness levels (not relative to base)
      // Scale 500 = the base color. Lighter numbers = lighter. Darker numbers = darker.
      // Target lightness values match Tailwind's typical scale.
      const buildScale = (hex) => {
        const hsl = hexToHsl(hex);
        const targets = {
          50:  Math.min(97, Math.max(hsl.l + 45, 92)),
          100: Math.min(94, Math.max(hsl.l + 38, 85)),
          200: Math.min(88, Math.max(hsl.l + 28, 75)),
          300: Math.min(80, Math.max(hsl.l + 18, 65)),
          400: Math.min(72, Math.max(hsl.l + 9,  55)),
          500: hsl.l,
          600: Math.max(hsl.l - 7,  Math.min(hsl.l, 35)),
          700: Math.max(hsl.l - 14, Math.min(hsl.l, 27)),
          800: Math.max(hsl.l - 20, Math.min(hsl.l, 20)),
          900: Math.max(hsl.l - 27, Math.min(hsl.l, 12)),
        };
        // Reduce saturation slightly for very light shades (more pastel)
        // Keep saturation for dark shades
        return Object.fromEntries(Object.entries(targets).map(([k, L]) => {
          const sat = k === '50' || k === '100' ? Math.min(hsl.s, 40) : hsl.s;
          return [k, hslToHex(hsl.h, sat, L)];
        }));
      };
      
      // Simple shade helper kept for hover states (-8% lightness)
      const shade = (hex, pct) => {
        const hsl = hexToHsl(hex);
        return hslToHex(hsl.h, hsl.s, Math.max(0, Math.min(100, hsl.l + pct)));
      };

      // Generate full scale (50-900) for primary + secondary
      const pScale = buildScale(primary);
      const sScale = buildScale(secondary);

      const vars = {
        '--color-primary': primary,
        '--color-primary-hover': branding.colors.primaryHover || shade(primary, -8),
        '--color-primary-light': primaryLight,
        '--color-secondary': secondary,
        '--color-secondary-hover': branding.colors.secondaryHover || shade(secondary, -8),
        '--color-primary-rgb': hexToRgb(primary),
      };

      Object.entries(vars).forEach(([key, value]) => {
        if (value) root.style.setProperty(key, value);
      });

      // Build comprehensive override CSS - covers ALL Tailwind shades, gradients, hover, focus
      const styleId = 'clyr-brand-override';
      let styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }

      // Generate rules for all shades (50-900) for bg, text, border, from, via, to, hover, group-hover
      const genRules = (name, scale) => {
        let css = '';
        Object.entries(scale).forEach(([shade, color]) => {
          css += `
            .bg-${name}-${shade} { background-color: ${color} !important; }
            .text-${name}-${shade} { color: ${color} !important; }
            .border-${name}-${shade} { border-color: ${color} !important; }
            .from-${name}-${shade} { --tw-gradient-from: ${color} !important; --tw-gradient-to: ${color}00 !important; --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important; }
            .via-${name}-${shade} { --tw-gradient-to: ${color}00 !important; --tw-gradient-stops: var(--tw-gradient-from), ${color}, var(--tw-gradient-to) !important; }
            .to-${name}-${shade} { --tw-gradient-to: ${color} !important; }
            .hover\\:bg-${name}-${shade}:hover { background-color: ${color} !important; }
            .hover\\:text-${name}-${shade}:hover { color: ${color} !important; }
            .hover\\:border-${name}-${shade}:hover { border-color: ${color} !important; }
            .focus\\:ring-${name}-${shade}:focus { --tw-ring-color: ${color} !important; }
            .focus\\:border-${name}-${shade}:focus { border-color: ${color} !important; }
            .ring-${name}-${shade} { --tw-ring-color: ${color} !important; }
            .placeholder-${name}-${shade}::placeholder { color: ${color} !important; }
            .divide-${name}-${shade} > * + * { border-color: ${color} !important; }
            .fill-${name}-${shade} { fill: ${color} !important; }
            .stroke-${name}-${shade} { stroke: ${color} !important; }
          `;
        });
        // Default (no shade) = 500
        css += `
          .bg-${name} { background-color: ${scale[500]} !important; }
          .text-${name} { color: ${scale[500]} !important; }
          .border-${name} { border-color: ${scale[500]} !important; }
        `;
        return css;
      };

      styleEl.textContent = `
        :root {
          --color-primary: ${primary} !important;
          --color-secondary: ${secondary} !important;
          --color-primary-light: ${primaryLight} !important;
        }
        ${genRules('primary', pScale)}
        ${genRules('secondary', sScale)}
      `;

      setCssVars(vars);
    }
  }, [branding.colors]);

  const refreshBranding = useCallback(async () => {
    try {
      const response = await brandingAPI.get();
      if (response.data) {
        const d = response.data;
        const colors = {
          primary:       d.primary_color   || d.colors?.primary   || '#3e5c66',
          primaryHover:  d.primary_color   || d.colors?.primaryHover || '#2d4851',
          primaryLight:  d.accent_color    || d.colors?.primaryLight  || '#e0f2eb',
          secondary:     d.secondary_color || d.colors?.secondary  || '#a8e0d0',
          secondaryHover:d.secondary_color || d.colors?.secondaryHover || '#8fd4c0',
        };
        setBranding(prev => ({
          ...prev,
          colors,
          logo: d.logo_light_url || d.logo || prev.logo,
          company: prev.company,
          legal: prev.legal,
          social: d.social ? { ...prev.social, ...d.social } : prev.social,
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
