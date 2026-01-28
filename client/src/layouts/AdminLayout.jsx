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
  ChevronDown
} from 'lucide-react';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useLanguage();
  const { companyName, logoUrl } = useBrand();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: t('admin.menu.dashboard'), icon: LayoutDashboard, path: '/admin' },
    { label: t('admin.menu.partners'), icon: Users, path: '/admin/partner' },
    { label: t('admin.menu.orders'), icon: ShoppingBag, path: '/admin/bestellungen' },
    { label: t('admin.menu.products'), icon: Package, path: '/admin/produkte' },
    { label: 'Einstellungen', icon: Settings, path: '/admin/einstellungen' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-teal-800 to-teal-900 z-50 
        transform transition-transform duration-300 lg:translate-x-0 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-teal-700">
            <NavLink to="/admin" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-600 
                flex items-center justify-center shadow-lg shadow-teal-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-white font-heading text-lg font-bold block">Admin</span>
                <span className="text-teal-400 text-xs">{companyName}</span>
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
                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/25' 
                        : 'text-teal-200 hover:text-white hover:bg-teal-700/50'}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Back to Partner Dashboard */}
            <div className="mt-8 pt-4 border-t border-teal-700">
              <NavLink
                to="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-teal-200 
                  hover:text-white hover:bg-teal-700/50 transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Partner Dashboard</span>
              </NavLink>
            </div>

            {/* Admin Info Card */}
            <div className="mt-4 p-4 rounded-2xl bg-teal-700/50 border border-teal-600/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 
                  flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">Administrator</p>
                  <p className="text-teal-300 text-xs">Vollzugriff</p>
                </div>
              </div>
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-teal-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-teal-200 
                hover:text-white hover:bg-teal-700/50 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Top Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-gray-200 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Mobile Toggle */}
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-gray-700" />
            </button>

            {/* Title */}
            <div className="hidden lg:flex items-center gap-3">
              <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-bold">
                Admin
              </span>
              <h1 className="text-xl font-heading font-bold text-gray-900">
                {t('admin.title')}
              </h1>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button onClick={toggle} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100">
                <Globe className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium uppercase">{lang}</span>
              </button>

              <button className="relative p-2 rounded-xl hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-600 
                    flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <span className="text-white font-semibold text-sm">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-gray-800">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-teal-600 font-medium">Administrator</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50"
                    >
                      <NavLink
                        to="/admin/einstellungen"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Einstellungen</span>
                      </NavLink>
                      <NavLink
                        to="/dashboard"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm">Partner Dashboard</span>
                      </NavLink>
                      <hr className="my-2 border-gray-100" />
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