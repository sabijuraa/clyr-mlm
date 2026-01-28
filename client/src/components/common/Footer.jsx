import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  CreditCard,
  Shield,
  Truck,
  RotateCcw,
  Droplets
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useBrand } from '../../context/BrandContext';
import brandConfig from '../../config/brand.config';

const Footer = () => {
  const { lang } = useLanguage();
  const { companyName, logoUrl, company, legal, social } = useBrand();
  const currentYear = new Date().getFullYear();

  const shopLinks = [
    { to: '/produkte', label: lang === 'de' ? 'Alle Produkte' : 'All Products' },
    { to: '/produkte?category=wassersysteme', label: lang === 'de' ? 'Wassersysteme' : 'Water Systems' },
    { to: '/produkte?category=duschen', label: lang === 'de' ? 'Aroma Duschen' : 'Aroma Showers' },
    { to: '/produkte?category=zubehoer', label: lang === 'de' ? 'Zubehör' : 'Accessories' },
  ];

  const companyLinks = [
    { to: '/partner-werden', label: lang === 'de' ? 'Partner werden' : 'Become Partner' },
    { to: '/impressum', label: lang === 'de' ? 'Impressum' : 'Imprint' },
    { to: '/datenschutz', label: lang === 'de' ? 'Datenschutz' : 'Privacy Policy' },
    { to: '/agb', label: lang === 'de' ? 'AGB' : 'Terms & Conditions' },
    { to: '/widerruf', label: lang === 'de' ? 'Widerrufsrecht' : 'Right of Withdrawal' },
  ];

  const socialLinks = [
    { icon: Facebook, href: brandConfig.social?.facebook || '#', label: 'Facebook' },
    { icon: Instagram, href: brandConfig.social?.instagram || '#', label: 'Instagram' },
    { icon: Youtube, href: brandConfig.social?.youtube || '#', label: 'YouTube' },
  ];

  return (
    <footer className="bg-neutral-900 text-neutral-300">

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={companyName || 'CLYR'}
                  className="h-12 w-auto brightness-0 invert"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <Droplets className="w-7 h-7 text-sky-400" />
                  </div>
                  <span className="text-2xl font-bold text-white tracking-tight">CLYR</span>
                </div>
              )}
            </Link>

            <p className="text-neutral-400 text-sm leading-relaxed mb-6">
              {lang === 'de'
                ? brandConfig.company?.description || 'Premium Wassersysteme für reines, frisches Trinkwasser und erfrischende Duscherlebnisse.'
                : brandConfig.company?.descriptionEn || 'Premium water systems for pure, fresh drinking water and refreshing shower experiences.'}
            </p>

            <div className="flex gap-3">
              {socialLinks.map((socialItem, i) => (
                <a
                  key={i}
                  href={socialItem.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center hover:bg-sky-600 transition-colors"
                  aria-label={socialItem.label}
                >
                  <socialItem.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold text-white mb-5">{lang === 'de' ? 'Shop' : 'Shop'}</h4>
            <ul className="space-y-3">
              {shopLinks.map((link, i) => (
                <li key={i}>
                  <Link to={link.to} className="text-sm text-neutral-400 hover:text-sky-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-white mb-5">{lang === 'de' ? 'Unternehmen' : 'Company'}</h4>
            <ul className="space-y-3">
              {companyLinks.map((link, i) => (
                <li key={i}>
                  <Link to={link.to} className="text-sm text-neutral-400 hover:text-sky-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-5">{lang === 'de' ? 'Kontakt' : 'Contact'}</h4>
            <ul className="space-y-4">
              <li>
                <a
                  href={`tel:${brandConfig.company?.phone || '+43 660 123 4567'}`}
                  className="flex items-center gap-3 text-sm text-neutral-400 hover:text-sky-400 transition-colors"
                >
                  <Phone className="w-4 h-4 text-sky-500" />
                  {brandConfig.company?.phone || '+43 660 123 4567'}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${brandConfig.company?.email || 'info@clyr.at'}`}
                  className="flex items-center gap-3 text-sm text-neutral-400 hover:text-sky-400 transition-colors"
                >
                  <Mail className="w-4 h-4 text-sky-500" />
                  {brandConfig.company?.email || 'info@clyr.at'}
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-sm text-neutral-400">
                  <MapPin className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                  <div>
                    {brandConfig.fulfillmentCompany?.name || 'MUTIMBAUCH Vertriebs GmbH'}<br />
                    {brandConfig.fulfillmentCompany?.address?.street || 'Industriestraße 123'}<br />
                    {brandConfig.fulfillmentCompany?.address?.zip || '80333'} {brandConfig.fulfillmentCompany?.address?.city || 'München'}
                  </div>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Trust badges */}
      <div className="border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                <Truck className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{lang === 'de' ? 'Schneller Versand' : 'Fast Shipping'}</p>
                <p className="text-xs text-neutral-500">{lang === 'de' ? '3-7 Werktage' : '3-7 business days'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                <Shield className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{lang === 'de' ? '2 Jahre Garantie' : '2 Year Warranty'}</p>
                <p className="text-xs text-neutral-500">{lang === 'de' ? 'Auf alle Produkte' : 'On all products'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{lang === 'de' ? 'Sichere Zahlung' : 'Secure Payment'}</p>
                <p className="text-xs text-neutral-500">SSL, Stripe</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{lang === 'de' ? '14 Tage Rückgabe' : '14 Day Returns'}</p>
                <p className="text-xs text-neutral-500">{lang === 'de' ? 'Ohne Angabe von Gründen' : 'No questions asked'}</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-neutral-500">
              © {currentYear} {brandConfig.fulfillmentCompany?.name || 'MUTIMBAUCH Vertriebs GmbH'}. {lang === 'de' ? 'Alle Rechte vorbehalten.' : 'All rights reserved.'}
            </p>
            <div className="flex items-center gap-6 text-sm text-neutral-500">
              <span>USt-IdNr: {brandConfig.fulfillmentCompany?.vatId || 'DE123456789'}</span>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
