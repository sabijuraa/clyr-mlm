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
import { adminAPI } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import Button from '../../components/common/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboardPage = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalOrders: 0,
    ordersGrowth: 0,
    totalPartners: 0,
    partnersGrowth: 0,
    pendingCommissions: 0,
    activePartners: 0,
    unpaidOrders: 0,
    ordersByStatus: { completed: 0, processing: 0, pending: 0, cancelled: 0 }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentPartners, setRecentPartners] = useState([]);
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await adminAPI.getDashboard();
      const data = response.data;
      if (data) {
        
        setStats({
          totalRevenue: parseFloat(data.revenue?.allTime || data.revenue?.all_time || 0),
          revenueGrowth: data.revenue?.growth || 0,
          totalOrders: parseInt(data.orders?.total || 0),
          ordersGrowth: parseInt(data.orders?.thisMonth || data.orders?.this_month || 0),
          totalPartners: parseInt(data.partners?.total || 0),
          partnersGrowth: parseInt(data.partners?.newThisMonth || data.partners?.new_this_month || 0),
          // Show gross (with 20% VAT) for outstanding commissions
          pendingCommissions: (parseFloat(data.commissions?.held || 0) + parseFloat(data.commissions?.pendingPayout || data.commissions?.pending_payout || 0)) * 1.20,
          activePartners: parseInt(data.partners?.active || 0),
          unpaidOrders: parseInt(data.orders?.unpaid || 0),
          ordersByStatus: {
            completed: parseInt(data.orders?.completed || 0),
            processing: parseInt(data.orders?.processing || 0),
            pending: parseInt(data.orders?.pending || 0),
            cancelled: parseInt(data.orders?.cancelled || 0)
          }
        });

        // Set daily revenue chart data
        setDailyRevenue((data.dailyRevenue || []).map(d => ({
          date: new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
          revenue: parseFloat(d.revenue || 0),
          orders: parseInt(d.orders || 0)
        })));

        setRecentOrders((data.recentOrders || []).map(o => ({
          id: o.order_number || o.id,
          customer: `${o.customer_first_name || ''} ${o.customer_last_name || ''}`.trim(),
          amount: parseFloat(o.total || 0),
          status: o.status === 'processing' ? 'processing' : o.status === 'completed' ? 'completed' : 'pending',
          date: new Date(o.created_at)
        })));

        setRecentPartners((data.recentPartners || []).map(p => ({
          id: p.id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          email: p.email,
          date: new Date(p.created_at),
          status: p.status || 'pending'
        })));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      completed: { label: 'Abgeschlossen', icon: CheckCircle, color: 'text-primary-400 bg-secondary-100' },
      processing: { label: 'In Bearbeitung', icon: Clock, color: 'text-primary-400 bg-slate-50' },
      pending: { label: 'Ausstehend', icon: AlertCircle, color: 'text-secondary-500 bg-gray-100' },
      active: { label: 'Aktiv', icon: CheckCircle, color: 'text-primary-400 bg-secondary-100' },
    };
    return configs[status] || configs.pending;
  };

  const totalOrdersForBar = Math.max(stats.ordersByStatus.completed + stats.ordersByStatus.processing + stats.ordersByStatus.pending + stats.ordersByStatus.cancelled, 1);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-secondary-700">Admin Dashboard</h1>
            <p className="text-secondary-500">Übersicht aller Geschäftsdaten</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
        </div>
      </div>
    );
  }

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

      {/* Unpaid Orders Warning Banner */}
      {stats.unpaidOrders > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">
              {stats.unpaidOrders} Bestellung{stats.unpaidOrders > 1 ? 'en' : ''} mit ausstehender Zahlung
            </p>
            <p className="text-sm text-amber-700">
              Diese Bestellungen wurden aufgegeben, aber die Zahlung ist noch nicht bestätigt. Öffnen Sie die Bestellung und klicken Sie „Als bezahlt markieren", falls die Zahlung bei Stripe eingegangen ist.
            </p>
          </div>
          <Link to="/admin/orders">
            <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100 whitespace-nowrap">
              Bestellungen prüfen
            </Button>
          </Link>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Gesamtumsatz"
          value={formatCurrency(stats.totalRevenue)}
          icon={Wallet}
          color="primary"
          trend={stats.revenueGrowth > 0 ? 'up' : undefined}
          trendValue={stats.revenueGrowth > 0 ? `+${stats.revenueGrowth}%` : undefined}
          index={0}
        />
        <StatCard
          title="Bestellungen"
          value={stats.totalOrders}
          icon={ShoppingBag}
          color="primary"
          trend={stats.ordersGrowth > 0 ? 'up' : undefined}
          trendValue={stats.ordersGrowth > 0 ? `+${stats.ordersGrowth}` : undefined}
          index={1}
        />
        <StatCard
          title="Partner"
          value={stats.totalPartners}
          icon={Users}
          color="primary"
          trend={stats.partnersGrowth > 0 ? 'up' : undefined}
          trendValue={stats.partnersGrowth > 0 ? `+${stats.partnersGrowth}` : undefined}
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
          <div className="h-64">
            {dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1000 ? `€${(v/1000).toFixed(1)}k` : `€${v}`} />
                  <Tooltip
                    formatter={(value) => [`€${parseFloat(value).toFixed(2)}`, 'Umsatz']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                  <Bar dataKey="revenue" fill="#1a3a4a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl">
                <div className="text-center text-secondary-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Noch keine Umsatzdaten</p>
                </div>
              </div>
            )}
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
              { label: 'Abgeschlossen', value: stats.ordersByStatus.completed, color: 'bg-secondary-700' },
              { label: 'In Bearbeitung', value: stats.ordersByStatus.processing, color: 'bg-secondary-300' },
              { label: 'Ausstehend', value: stats.ordersByStatus.pending, color: 'bg-secondary-200' },
              { label: 'Storniert', value: stats.ordersByStatus.cancelled, color: 'bg-gray-400' },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-secondary-500">{item.label}</span>
                  <span className="font-medium text-secondary-700">{item.value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${(item.value / totalOrdersForBar) * 100}%` }}
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
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-secondary-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Noch keine Bestellungen</p>
              </div>
            ) : recentOrders.map((order) => {
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
            {recentPartners.length === 0 ? (
              <div className="text-center py-8 text-secondary-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Noch keine Partner</p>
              </div>
            ) : recentPartners.map((partner) => {
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