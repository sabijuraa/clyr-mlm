import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useBrand } from '../context/BrandContext';

import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  Wallet,
  LogOut,
  Menu,
  Bell,
  Globe,
  Shield,
  ArrowLeft,
  Settings,
  ChevronDown,
  FileText,
  Layout,
  Layers,
  Upload,
  Calculator,
  CreditCard,
  Palette,
  BookOpen,
  Mail,
  Scale,
  Building
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useLanguage();
  const { companyName } = useBrand();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // All admin navigation items
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Partner', icon: Users, path: '/admin/partners' },
    { label: 'Bestellungen', icon: ShoppingBag, path: '/admin/orders' },
    { label: 'Produkte', icon: Package, path: '/admin/products' },
    { label: 'Varianten', icon: Layers, path: '/admin/variants' },
    { label: 'Provisionen', icon: Wallet, path: '/admin/commissions' },
    { label: 'Rechnungen', icon: FileText, path: '/admin/invoices' },
    { label: 'Gutschriften', icon: CreditCard, path: '/admin/credit-notes' },
    { label: 'USt-Berichte', icon: Calculator, path: '/admin/vat-reports' },
    { label: 'Daten-Import', icon: Upload, path: '/admin/import' },
    { label: 'Website-Inhalt', icon: Layout, path: '/admin/cms' },
    { label: 'Branding & Design', icon: Palette, path: '/admin/branding' },
    { label: 'Academy', icon: BookOpen, path: '/admin/academy' },
    { label: 'Newsletter', icon: Mail, path: '/admin/newsletter' },
    { label: 'Rechtliches & FAQ', icon: Scale, path: '/admin/legal' },
    { label: 'Firmendaten', icon: Building, path: '/admin/company' },
    { label: 'Einstellungen', icon: Settings, path: '/admin/settings' },
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
      <aside className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-secondary-700 to-secondary-800 z-50 
        transform transition-transform duration-300 lg:translate-x-0 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-secondary-600">
            <NavLink to="/" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-secondary-600 
                flex items-center justify-center shadow-lg shadow-secondary-700/30">
                <Shield className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <span className="text-white font-heading text-lg font-bold block">Admin</span>
                <span className="text-primary-400 text-xs">{companyName}</span>
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
                    end={item.path === '/admin'}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-white text-secondary-700 shadow-lg' 
                        : 'text-secondary-200 hover:text-white hover:bg-secondary-600/50'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Back to Partner Dashboard */}
            <div className="mt-8 pt-4 border-t border-secondary-600">
              <NavLink
                to="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-secondary-200 
                  hover:text-white hover:bg-secondary-600/50 transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Partner Dashboard</span>
              </NavLink>
            </div>

            {/* Admin Info Card */}
            <div className="mt-4 p-4 rounded-2xl bg-secondary-600/50 border border-secondary-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-700 
                  flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Administrator</p>
                  <p className="text-secondary-300 text-xs">Full Access</p>
                </div>
              </div>
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

            {/* Title */}
            <div className="hidden lg:flex items-center gap-3">
              <span className="px-3 py-1 bg-secondary-700 text-white rounded-full text-sm font-bold">
                Admin
              </span>
              <h1 className="text-xl font-heading font-bold text-secondary-700">
                {t('admin.title')}
              </h1>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button onClick={toggle} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary-100">
                <Globe className="w-5 h-5 text-secondary-600" />
                <span className="text-sm font-medium uppercase text-secondary-700">{lang}</span>
              </button>

              <button className="relative p-2 rounded-xl hover:bg-secondary-100">
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
                    <p className="text-xs text-primary-500 font-medium">Administrator</p>
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
                        to="/admin/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-secondary-700 hover:bg-secondary-50"
                      >
                        <Settings className="w-4 h-4 text-primary-500" />
                        <span className="text-sm">Settings</span>
                      </NavLink>
                      <NavLink
                        to="/dashboard"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-secondary-700 hover:bg-secondary-50"
                      >
                        <ArrowLeft className="w-4 h-4 text-primary-500" />
                        <span className="text-sm">Partner Dashboard</span>
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

export default AdminLayout;