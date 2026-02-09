import { Link, useNavigate } from 'react-router-dom';
import { 
  Facebook, Instagram, Youtube, Mail, Phone, MapPin,
  Shield, Truck, Headphones, Award, Package
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import brandConfig from '../../config/brand.config';
import NewsletterSignup from './NewsletterSignup';

const Footer = () => {
  const { lang } = useLanguage();
  const currentYear = new Date().getFullYear();

  // #12: Scroll-to-top link component
  const FooterLink = ({ to, children }) => (
    <Link to={to} onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
      className="text-gray-400 hover:text-primary-400 transition-colors inline-flex items-center gap-1">
      {children}
    </Link>
  );

  const footerLinks = {
    products: {
      title: lang === 'de' ? 'Produkte' : 'Products',
      links: [
        { to: '/products', label: lang === 'de' ? 'Alle Produkte' : 'All Products' },
        { to: '/products?category=water-systems', label: 'CLYR Home Soda' },
        { to: '/products?category=shower', label: 'CLYR Aroma Dusche' },
        { to: '/products?category=accessories', label: lang === 'de' ? 'Zubehör' : 'Accessories' },
      ]
    },
    company: {
      title: lang === 'de' ? 'Unternehmen' : 'Company',
      links: [
        { to: '/', label: lang === 'de' ? 'Home' : 'Home' },
        { to: '/about', label: lang === 'de' ? 'Über uns' : 'About Us' },
        { to: '/faq', label: 'FAQ' },
        { to: '/partner/register', label: lang === 'de' ? 'Partner werden' : 'Become Partner' },
        { to: '/login', label: lang === 'de' ? 'Partner Login' : 'Partner Login' },
        { to: '/customer/login', label: lang === 'de' ? 'Kundenbereich' : 'Customer Portal' },
      ]
    },
    legal: {
      title: lang === 'de' ? 'Rechtliches' : 'Legal',
      links: [
        { to: '/imprint', label: lang === 'de' ? 'Impressum' : 'Imprint' },
        { to: '/privacy', label: lang === 'de' ? 'Datenschutz' : 'Privacy Policy' },
        { to: '/terms', label: lang === 'de' ? 'AGB' : 'Terms & Conditions' },
        { to: '/withdrawal', label: lang === 'de' ? 'Widerruf' : 'Withdrawal' },
      ]
    }
  };

  const socialLinks = [
    { icon: Facebook, href: brandConfig.social?.facebook || '#', label: 'Facebook' },
    { icon: Instagram, href: brandConfig.social?.instagram || '#', label: 'Instagram' },
    { icon: Youtube, href: brandConfig.social?.youtube || '#', label: 'YouTube' },
  ];

  return (
    <footer className="bg-secondary-800">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <img 
                src="/images/clyr-logo.png" 
                alt="CLYR" 
                className="h-12 w-auto rounded-lg bg-white p-1"
              />
            </Link>
            <p className="text-gray-400 mb-6 max-w-sm leading-relaxed">
              {lang === 'de' 
                ? 'Premium Wassersysteme für reines, gefiltertes Wasser direkt aus Ihrem Wasserhahn. Klares Wasser. Klares Leben.'
                : 'Premium water systems for pure, filtered water straight from your tap. Clear water. Clear life.'}
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 bg-secondary-700 rounded-lg flex items-center justify-center hover:bg-primary-500 transition-colors group"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                </a>
              ))}
            </div>

            {/* Newsletter Signup (#44) */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-300 mb-2">
                {lang === 'de' ? 'Newsletter abonnieren' : 'Subscribe to newsletter'}
              </p>
              <NewsletterSignup />
            </div>
          </div>

          {/* Links Columns */}
          {Object.values(footerLinks).map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold text-white mb-5 text-lg">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <FooterLink to={link.to}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="mt-16 pt-10 border-t border-secondary-700">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <a 
              href={`tel:${brandConfig.company.phone}`}
              className="flex items-center gap-4 p-4 bg-secondary-700 rounded-xl hover:bg-secondary-600 transition-colors group"
            >
              <div className="w-12 h-12 bg-secondary-600 group-hover:bg-primary-500 rounded-lg flex items-center justify-center transition-colors">
                <Phone className="w-5 h-5 text-primary-400 group-hover:text-white transition-colors" />
              </div>
              <div>
                <div className="text-sm text-secondary-500 mb-1">{lang === 'de' ? 'Telefon' : 'Phone'}</div>
                <span className="text-white font-medium">{brandConfig.company.phone}</span>
              </div>
            </a>
            <a 
              href={`mailto:${brandConfig.company.email}`}
              className="flex items-center gap-4 p-4 bg-secondary-700 rounded-xl hover:bg-secondary-600 transition-colors group"
            >
              <div className="w-12 h-12 bg-secondary-600 group-hover:bg-primary-500 rounded-lg flex items-center justify-center transition-colors">
                <Mail className="w-5 h-5 text-primary-400 group-hover:text-white transition-colors" />
              </div>
              <div>
                <div className="text-sm text-secondary-500 mb-1">E-Mail</div>
                <span className="text-white font-medium">{brandConfig.company.email}</span>
              </div>
            </a>
            {/* #47: Correct company address */}
            <div className="flex items-center gap-4 p-4 bg-secondary-700 rounded-xl">
              <div className="w-12 h-12 bg-secondary-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <div className="text-sm text-secondary-500 mb-1">CLYR Solutions GmbH</div>
                <span className="text-white font-medium text-sm">{brandConfig.company.address.street}, {brandConfig.company.address.zip} {brandConfig.company.address.city}</span>
              </div>
            </div>
            {/* #48: Distribution address */}
            <div className="flex items-center gap-4 p-4 bg-secondary-700 rounded-xl">
              <div className="w-12 h-12 bg-secondary-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <div className="text-sm text-secondary-500 mb-1">{lang === 'de' ? 'Versandadresse' : 'Shipping Address'}</div>
                <span className="text-white font-medium text-sm">{brandConfig.distribution.address.street}, {brandConfig.distribution.address.zip} {brandConfig.distribution.address.city}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="bg-secondary-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-8">
            {[
              { icon: Shield, text: lang === 'de' ? '2 Jahre Garantie' : '2 Year Warranty' },
              { icon: Truck, text: lang === 'de' ? 'Schnelle Lieferung' : 'Fast Delivery' },
              { icon: Headphones, text: lang === 'de' ? 'Premium Support' : 'Premium Support' },
              { icon: Award, text: lang === 'de' ? 'Zertifizierte Qualität' : 'Certified Quality' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-secondary-500 text-sm">
                <item.icon className="w-4 h-4 text-primary-400" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-secondary-950 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-secondary-500">
            <div>
              <p>&copy; {currentYear} CLYR Solutions GmbH. {lang === 'de' ? 'Alle Rechte vorbehalten.' : 'All rights reserved.'}</p>
              <p className="text-xs text-secondary-600 mt-1">
                {lang === 'de'
                  ? 'Es gilt oesterreichisches Recht. Gerichtsstand: Villach, Oesterreich.'
                  : 'Austrian law applies. Jurisdiction: Villach, Austria.'}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <FooterLink to="/privacy">{lang === 'de' ? 'Datenschutz' : 'Privacy'}</FooterLink>
              <FooterLink to="/terms">{lang === 'de' ? 'AGB' : 'Terms'}</FooterLink>
              <FooterLink to="/imprint">{lang === 'de' ? 'Impressum' : 'Imprint'}</FooterLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;