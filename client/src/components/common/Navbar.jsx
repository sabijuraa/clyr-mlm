import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, ShoppingCart, User, LogOut, LayoutDashboard, 
  ChevronDown, Settings, Globe, Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { lang, toggle } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Navigation links with correct routes
  const navLinks = [
    { to: '/', label: lang === 'de' ? 'Home' : 'Home' },
    { to: '/about', label: lang === 'de' ? 'Über uns' : 'About Us' },
    { to: '/products', label: lang === 'de' ? 'Produkte' : 'Products' },
    { to: '/partner/register', label: lang === 'de' ? 'Partner werden' : 'Become Partner' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white shadow-lg' 
        : 'bg-white/95 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo - Always use clyr-logo.png */}
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/images/clyr-logo.png" 
              alt="CLYR" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation - ALWAYS Charcoal text */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-medium transition-colors relative ${
                  location.pathname === link.to
                    ? 'text-primary-500'
                    : 'text-secondary-700 hover:text-primary-500'
                }`}
              >
                {link.label}
                {location.pathname === link.to && (
                  <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary-400 rounded-full" />
                )}
              </Link>
            ))}
            <a
              href="/api/downloads/CLYR-Broschuere.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              {lang === 'de' ? 'Broschüre' : 'Brochure'}
            </a>
          </div>

          {/* Right Side - Language, Cart & User */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggle}
              className="flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-secondary-100 text-secondary-700 transition-all font-medium text-sm"
              title={lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase">{lang === 'de' ? 'EN' : 'DE'}</span>
            </button>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-3 rounded-xl hover:bg-secondary-100 text-secondary-700 transition-all"
            >
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-secondary-100 text-secondary-700 transition-colors"
                >
                  <div className="w-9 h-9 bg-secondary-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user?.first_name?.[0] || 'U'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-secondary-700">{user?.first_name} {user?.last_name}</p>
                      <p className="text-sm text-secondary-500 truncate">{user?.email}</p>
                    </div>
                    
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 px-4 py-3 text-secondary-700 hover:bg-secondary-50 transition-colors"
                    >
                      <LayoutDashboard className="w-5 h-5 text-primary-500" />
                      Dashboard
                    </Link>
                    
                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 px-4 py-3 text-secondary-700 hover:bg-secondary-50 transition-colors"
                      >
                        <Settings className="w-5 h-5 text-primary-500" />
                        Admin Panel
                      </Link>
                    )}
                    
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        {lang === 'de' ? 'Abmelden' : 'Logout'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-secondary-700 text-white font-medium rounded-xl hover:bg-secondary-800 transition-all"
              >
                <User className="w-5 h-5" />
                {lang === 'de' ? 'Anmelden' : 'Login'}
              </Link>
            )}

            {/* Mobile Menu Button - ALWAYS Charcoal */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-3 rounded-xl hover:bg-secondary-100 text-secondary-700 transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="px-4 py-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`block px-4 py-3 rounded-xl font-medium transition-colors ${
                  location.pathname === link.to
                    ? 'bg-secondary-700 text-white'
                    : 'text-secondary-700 hover:bg-secondary-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Broschüre Download */}
            <a
              href="/api/downloads/CLYR-Broschuere.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-primary-500 hover:bg-primary-50 transition-colors"
            >
              <Download className="w-5 h-5" />
              {lang === 'de' ? 'Broschüre herunterladen' : 'Download Brochure'}
            </a>
            
            {/* Mobile Language Toggle */}
            <button
              onClick={toggle}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-secondary-700 hover:bg-secondary-50 transition-colors border border-secondary-200"
            >
              <Globe className="w-5 h-5" />
              {lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
            </button>
            
            {!isAuthenticated && (
              <Link
                to="/login"
                className="block w-full text-center px-4 py-3 bg-secondary-700 text-white font-medium rounded-xl hover:bg-secondary-800 transition-colors mt-4"
              >
                {lang === 'de' ? 'Anmelden' : 'Login'}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;