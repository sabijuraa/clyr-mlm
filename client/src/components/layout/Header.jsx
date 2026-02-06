import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ShoppingBag, Menu, X, User, ChevronDown, Droplets, LayoutDashboard, FileText } from 'lucide-react';

export default function Header() {
  const { user, partner, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setUserMenuOpen(false); };

  return (
    <header className="bg-white border-b sticky top-0 z-40">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <Droplets className="w-7 h-7 text-clyr-teal group-hover:scale-110 transition-transform" />
          <span className="text-xl font-bold text-clyr-dark">CLYR</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/shop" className="text-sm font-medium text-gray-600 hover:text-clyr-teal transition-colors">Shop</Link>
          <Link to="/faq" className="text-sm font-medium text-gray-600 hover:text-clyr-teal transition-colors">FAQ</Link>
          {(user?.role === 'partner' || user?.role === 'admin') && (
            <Link to="/partner/dashboard" className="text-sm font-medium text-gray-600 hover:text-clyr-teal transition-colors">Partner</Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-sm font-medium text-gray-600 hover:text-clyr-teal transition-colors">Admin</Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link to="/cart" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ShoppingBag className="w-5 h-5 text-gray-600" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-clyr-teal text-white text-xs rounded-full flex items-center justify-center font-medium">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-7 h-7 rounded-full bg-clyr-teal text-white flex items-center justify-center text-xs font-bold">
                  {(user.firstName?.[0] || 'U').toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border py-2 animate-fadeIn" onMouseLeave={() => setUserMenuOpen(false)}>
                  <div className="px-4 py-2 border-b mb-1">
                    <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                    {partner && <p className="text-xs text-clyr-teal mt-0.5">Code: {partner.referral_code}</p>}
                  </div>
                  <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Mein Profil</Link>
                  <Link to="/orders" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Meine Bestellungen</Link>
                  <Link to="/documents" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Dokumente</Link>
                  {(user.role === 'partner' || user.role === 'admin') && (
                    <>
                      <div className="border-t my-1" />
                      <Link to="/partner/dashboard" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Partner Dashboard</Link>
                      <Link to="/partner/commissions" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Provisionen</Link>
                    </>
                  )}
                  {user.role === 'admin' && (
                    <>
                      <div className="border-t my-1" />
                      <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Admin Panel</Link>
                    </>
                  )}
                  <div className="border-t my-1" />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">Abmelden</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary text-sm py-1.5 px-4">Anmelden</Link>
          )}

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 space-y-3 animate-slideUp">
          <Link to="/shop" onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-2">Shop</Link>
          <Link to="/faq" onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-2">FAQ</Link>
          {user && <Link to="/orders" onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-2">Bestellungen</Link>}
          {user && <Link to="/profile" onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-2">Profil</Link>}
          {(user?.role === 'partner' || user?.role === 'admin') && (
            <Link to="/partner/dashboard" onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-2 text-clyr-teal">Partner Dashboard</Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="block text-sm font-medium py-2 text-clyr-teal">Admin Panel</Link>
          )}
        </div>
      )}
    </header>
  );
}
