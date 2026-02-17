import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useBrand } from '../context/BrandContext';

import {
  LayoutDashboard,
  Users,
  Link2,
  Wallet,
  UserCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Globe,
  ChevronDown,
  TrendingUp,
  ShoppingBag,
  Banknote,
  BookOpen,
  ShieldAlert,
  Ticket
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useLanguage();
  const { companyName } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // #12: Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Updated routes to English
  const navItems = [
    { label: t('dashboard.menu.overview'), icon: LayoutDashboard, path: '/dashboard' },
    { label: t('dashboard.menu.team'), icon: Users, path: '/dashboard/team' },
    { label: t('dashboard.menu.links'), icon: Link2, path: '/dashboard/links' },
    { label: 'Gutscheine', icon: Ticket, path: '/dashboard/vouchers' },
    { label: t('dashboard.menu.commissions'), icon: Wallet, path: '/dashboard/commissions' },
    { label: 'Auszahlungen', icon: Banknote, path: '/dashboard/payouts' },
    { label: 'Academy', icon: BookOpen, path: '/dashboard/academy' },
    { label: 'Vertrag', icon: ShieldAlert, path: '/dashboard/compliance' },
    { label: t('dashboard.menu.customers'), icon: UserCircle, path: '/dashboard/customers' },
    { label: t('dashboard.menu.orders'), icon: ShoppingBag, path: '/dashboard/orders' },
    { label: t('dashboard.menu.profile'), icon: Settings, path: '/dashboard/profile' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-secondary-900/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Charcoal gradient */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-secondary-800 z-50 
        transform transition-transform duration-300 lg:translate-x-0 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-secondary-600">
            <NavLink to="/" className="flex items-center gap-3">
              <img src="/images/clyr-logo.png" alt={companyName} className="w-11 h-11 rounded-xl object-contain bg-white p-1" />
              <div>
                <span className="text-white font-heading text-lg font-bold block">
                  {companyName}
                </span>
                <span className="text-primary-400 text-xs">Partner Portal</span>
              </div>
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/dashboard'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-white text-secondary-700 shadow-lg' 
                        : 'text-secondary-200 hover:text-white hover:bg-secondary-600/50'}
                    `}
                  >
                    <item.icon className={`w-5 h-5 ${({ isActive }) => isActive ? 'text-primary-500' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Rank Card - Charcoal with teal accents */}
            <div className="mt-8 p-4 rounded-2xl bg-secondary-600/50 border border-secondary-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-700 
                  flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">{user?.rank_name || user?.rank?.name || 'Starter'}</p>
                  <p className="text-secondary-300 text-xs">Current Rank</p>
                </div>
              </div>
              <div className="h-2 bg-secondary-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-secondary-500 to-primary-500 rounded-full transition-all duration-500"
                  style={{ width: '65%' }}
                />
              </div>
              <p className="text-primary-400 text-xs mt-2">65% to next rank</p>
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-secondary-600">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-secondary-200 
                hover:text-white hover:bg-secondary-600/50 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-72 min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-secondary-200 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Mobile Toggle */}
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-secondary-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-secondary-700" />
            </button>

            {/* Welcome */}
            <div className="hidden lg:block">
              <h1 className="text-2xl font-heading font-bold text-secondary-700">
                {t('dashboard.welcome')}, {user?.firstName}!
              </h1>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Language */}
              <button
                onClick={toggle}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary-100 transition-colors"
              >
                <Globe className="w-5 h-5 text-secondary-600" />
                <span className="text-sm font-medium uppercase text-secondary-700">{lang}</span>
              </button>

              {/* Notifications */}
              <button className="relative p-2 rounded-xl hover:bg-secondary-100 transition-colors">
                <Bell className="w-5 h-5 text-secondary-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary-700 
                    flex items-center justify-center shadow-lg shadow-secondary-700/20">
                    <span className="text-white font-semibold text-sm">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-secondary-700">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-secondary-500">{user?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-secondary-400 hidden md:block" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-secondary-100 py-2 z-50"
                    >
                      <NavLink
                        to="/dashboard/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-secondary-700 hover:bg-secondary-50"
                      >
                        <Settings className="w-4 h-4 text-primary-500" />
                        <span className="text-sm">{t('dashboard.menu.profile')}</span>
                      </NavLink>
                      <hr className="my-2 border-secondary-100" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">{t('nav.logout')}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
