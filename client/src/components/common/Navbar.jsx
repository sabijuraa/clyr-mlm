import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  User, 
  Menu, 
  X, 
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Settings,
  Shield,
  Droplets
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { useBrand } from '../../context/BrandContext';
import brandConfig from '../../config/brand.config';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { lang, setLang } = useLanguage();
  const { companyName, logoUrl } = useBrand();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isUserMenuOpen && !e.target.closest('.user-menu-container')) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  const scrollToSection = (sectionId) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: sectionId } });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { to: '/produkte', label: lang === 'de' ? 'Produkte' : 'Products', isRoute: true },
    { to: '/partner-werden', label: lang === 'de' ? 'Partner werden' : 'Become Partner', isRoute: true },
    { id: 'about', label: lang === 'de' ? 'Über uns' : 'About Us', isRoute: false },
    { id: 'contact', label: lang === 'de' ? 'Kontakt' : 'Contact', isRoute: false },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName || 'CLYR'} className="h-10 w-auto" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center">
                  <Droplets className="w-6 h-6 text-sky-400" />
                </div>
              </div>
            )}
            <span className="font-bold text-xl text-neutral-900 hidden sm:block tracking-tight">
              {companyName || 'CLYR'}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link, index) => (
              link.isRoute ? (
                <Link
                  key={index}
                  to={link.to}
                  className={`font-medium transition-colors ${
                    location.pathname === link.to 
                      ? 'text-sky-600' 
                      : 'text-neutral-700 hover:text-sky-600'
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  key={index}
                  onClick={() => scrollToSection(link.id)}
                  className="font-medium text-neutral-700 hover:text-sky-600 transition-colors"
                >
                  {link.label}
                </button>
              )
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              className="hidden sm:flex items-center gap-1 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-sky-600 transition-colors rounded-lg hover:bg-neutral-100"
            >
              {lang === 'de' ? '🇩🇪 DE' : '🇬🇧 EN'}
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Cart */}
            <Link 
              to="/warenkorb"
              className="relative p-2 text-neutral-700 hover:text-sky-600 transition-colors"
            >
              <ShoppingBag className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-sky-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative user-menu-container">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-full bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                >
                  <User className="w-5 h-5" />
                </button>
                
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-neutral-100 py-2"
                    >
                      {/* Show Admin Dashboard link for admins */}
                      {user.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-sky-50 hover:text-sky-600"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-sky-50 hover:text-sky-600"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                      <Link
                        to="/dashboard/profil"
                        className="flex items-center gap-2 px-4 py-2 text-neutral-700 hover:bg-sky-50 hover:text-sky-600"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        {lang === 'de' ? 'Einstellungen' : 'Settings'}
                      </Link>
                      <hr className="my-2 border-neutral-100" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        {lang === 'de' ? 'Abmelden' : 'Logout'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white font-medium rounded-full hover:bg-sky-600 transition-colors"
              >
                <User className="w-4 h-4" />
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-neutral-700"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-neutral-100"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link, index) => (
                link.isRoute ? (
                  <Link
                    key={index}
                    to={link.to}
                    className="block py-2 font-medium text-neutral-700 hover:text-sky-600"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <button
                    key={index}
                    onClick={() => scrollToSection(link.id)}
                    className="block w-full text-left py-2 font-medium text-neutral-700 hover:text-sky-600"
                  >
                    {link.label}
                  </button>
                )
              ))}
              
              {/* Language Toggle Mobile */}
              <button
                onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
                className="block py-2 font-medium text-neutral-700 hover:text-sky-600"
              >
                {lang === 'de' ? '🇬🇧 English' : '🇩🇪 Deutsch'}
              </button>
              
              {!user && (
                <Link
                  to="/login"
                  className="block py-2 font-medium text-sky-600"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
