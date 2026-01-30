import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  ShoppingBag,
  Wallet,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  UserPlus,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';
import { formatDate } from '../../utils/helpers';
import StatCard from '../../components/dashboard/StatCard';
import Button from '../../components/common/Button';

// Demo data
const demoStats = {
  totalRevenue: 125678.90,
  revenueGrowth: 23.5,
  totalOrders: 847,
  ordersGrowth: 12,
  totalPartners: 156,
  partnersGrowth: 8,
  pendingCommissions: 4567.89,
  activePartners: 124
};

const demoRecentOrders = [
  { id: 'FL-001', customer: 'Maria Schmidt', amount: 1299.00, status: 'completed', date: new Date() },
  { id: 'FL-002', customer: 'Thomas Weber', amount: 899.00, status: 'processing', date: new Date(Date.now() - 3600000) },
  { id: 'FL-003', customer: 'Sandra Müller', amount: 149.00, status: 'completed', date: new Date(Date.now() - 7200000) },
  { id: 'FL-004', customer: 'Peter Koch', amount: 1899.00, status: 'pending', date: new Date(Date.now() - 10800000) },
];

const demoRecentPartners = [
  { id: 1, name: 'Max Mustermann', email: 'max@email.de', date: new Date(), status: 'active' },
  { id: 2, name: 'Anna Schmidt', email: 'anna@email.de', date: new Date(Date.now() - 86400000), status: 'pending' },
  { id: 3, name: 'Peter Müller', email: 'peter@email.de', date: new Date(Date.now() - 172800000), status: 'active' },
];

const AdminDashboardPage = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(demoStats);
  const [recentOrders, setRecentOrders] = useState(demoRecentOrders);
  const [recentPartners, setRecentPartners] = useState(demoRecentPartners);
  const [isLoading, setIsLoading] = useState(false);

  const getStatusConfig = (status) => {
    const configs = {
      completed: { label: 'Abgeschlossen', icon: CheckCircle, color: 'text-primary-400 bg-secondary-100' },
      processing: { label: 'In Bearbeitung', icon: Clock, color: 'text-primary-400 bg-slate-50' },
      pending: { label: 'Ausstehend', icon: AlertCircle, color: 'text-secondary-500 bg-gray-100' },
      active: { label: 'Aktiv', icon: CheckCircle, color: 'text-primary-400 bg-secondary-100' },
    };
    return configs[status] || configs.pending;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">
            Admin Dashboard
          </h1>
          <p className="text-secondary-500">Übersicht aller Geschäftsdaten</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-secondary-500">
          <Calendar className="w-4 h-4" />
          <span>Letzte Aktualisierung: {formatDate(new Date(), { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Gesamtumsatz"
          value={formatCurrency(stats.totalRevenue)}
          icon={Wallet}
          color="primary"
          trend="up"
          trendValue={`+${stats.revenueGrowth}%`}
          index={0}
        />
        <StatCard
          title="Bestellungen"
          value={stats.totalOrders}
          icon={ShoppingBag}
          color="primary"
          trend="up"
          trendValue={`+${stats.ordersGrowth}`}
          index={1}
        />
        <StatCard
          title="Partner"
          value={stats.totalPartners}
          icon={Users}
          color="primary"
          trend="up"
          trendValue={`+${stats.partnersGrowth}`}
          index={2}
        />
        <StatCard
          title="Offene Provisionen"
          value={formatCurrency(stats.pendingCommissions)}
          icon={CreditCard}
          color="primary"
          index={3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Revenue Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-semibold text-lg text-secondary-700">
              Umsatzentwicklung
            </h3>
            <select className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500">
              <option>Letzte 7 Tage</option>
              <option>Letzte 30 Tage</option>
              <option>Letzte 90 Tage</option>
            </select>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
            <div className="text-center text-secondary-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Chart wird hier angezeigt</p>
            </div>
          </div>
        </motion.div>

        {/* Orders by Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <h3 className="font-heading font-semibold text-lg text-secondary-700 mb-6">
            Bestellstatus
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Abgeschlossen', value: 678, total: 847, color: 'bg-secondary-700' },
              { label: 'In Bearbeitung', value: 89, total: 847, color: 'bg-secondary-300' },
              { label: 'Ausstehend', value: 56, total: 847, color: 'bg-secondary-200' },
              { label: 'Storniert', value: 24, total: 847, color: 'bg-gray-400' },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-secondary-500">{item.label}</span>
                  <span className="font-medium text-secondary-700">{item.value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${(item.value / item.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tables Row */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-semibold text-lg text-secondary-700">
              Letzte Bestellungen
            </h3>
            <Link to="/admin/orders">
              <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                Alle anzeigen
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {recentOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              return (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary-700">{order.id}</p>
                      <p className="text-sm text-secondary-500">{order.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-secondary-700">{formatCurrency(order.amount)}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Partners */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-semibold text-lg text-secondary-700">
              Neue Partner
            </h3>
            <Link to="/admin/partners">
              <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                Alle anzeigen
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {recentPartners.map((partner) => {
              const statusConfig = getStatusConfig(partner.status);
              const StatusIcon = statusConfig.icon;
              return (
                <div key={partner.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-700 
                      flex items-center justify-center text-white font-semibold text-sm">
                      {partner.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-secondary-700">{partner.name}</p>
                      <p className="text-sm text-secondary-500">{partner.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-secondary-500">{formatDate(partner.date)}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-secondary-700 to-secondary-800 rounded-2xl p-6 text-white"
      >
        <h3 className="font-semibold text-lg mb-4">Schnellzugriff</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/admin/partners">
            <div className="p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
              <UserPlus className="w-6 h-6 mb-2" />
              <p className="font-medium">Partner verwalten</p>
            </div>
          </Link>
          <Link to="/admin/orders">
            <div className="p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
              <ShoppingBag className="w-6 h-6 mb-2" />
              <p className="font-medium">Bestellungen</p>
            </div>
          </Link>
          <Link to="/admin/products">
            <div className="p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
              <Package className="w-6 h-6 mb-2" />
              <p className="font-medium">Produkte</p>
            </div>
          </Link>
          <Link to="/admin/settings">
            <div className="p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
              <Settings className="w-6 h-6 mb-2" />
              <p className="font-medium">Einstellungen</p>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboardPage;
