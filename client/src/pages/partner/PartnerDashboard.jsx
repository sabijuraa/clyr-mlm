import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatPrice, formatDate, formatDateTime } from '../../utils/format';
import { BarChart3, Users, Euro, TrendingUp, Award, Copy, Check, ShoppingBag, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PartnerDashboard() {
  const { user, partner } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/partners/dashboard');
      setDashboard(data);
    } catch (err) {
      toast.error('Dashboard konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/shop?ref=${partner?.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Empfehlungslink kopiert!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clyr-teal"></div>
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const recentOrders = dashboard?.recentOrders || [];
  const recentCommissions = dashboard?.recentCommissions || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-clyr-dark">
          Willkommen, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-1">Dein Partner-Dashboard im Überblick</p>
      </div>

      {/* Referral Link */}
      <div className="bg-gradient-to-r from-clyr-teal to-blue-600 rounded-xl p-6 mb-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Dein Empfehlungscode</h2>
            <p className="text-3xl font-bold mt-1">{partner?.referral_code}</p>
          </div>
          <button
            onClick={copyReferralLink}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg transition-colors"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
            {copied ? 'Kopiert!' : 'Link kopieren'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<ShoppingBag size={24} />}
          label="Eigene Verkäufe"
          value={stats.personal_sales_count || 0}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={<Users size={24} />}
          label="Team-Verkäufe"
          value={stats.team_sales_count || 0}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={<Euro size={24} />}
          label="Provisionen gesamt"
          value={formatPrice(stats.total_commission_earned || 0)}
          color="bg-yellow-50 text-yellow-600"
        />
        <StatCard
          icon={<Award size={24} />}
          label="Aktueller Rang"
          value={stats.rank_name || 'Starter'}
          subtitle={`${stats.rank_percentage || 8}% Provision`}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Quarterly Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h3 className="font-semibold text-clyr-dark mb-4">Quartalsaktivität</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Verkäufe dieses Quartal</span>
              <span className="font-medium">{stats.quarterly_sales_count || 0} / 2</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${(stats.quarterly_sales_count || 0) >= 2 ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${Math.min(((stats.quarterly_sales_count || 0) / 2) * 100, 100)}%` }}
              />
            </div>
          </div>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${(stats.quarterly_sales_count || 0) >= 2 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {(stats.quarterly_sales_count || 0) >= 2 ? 'Aktiv' : 'Inaktiv'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Mindestens 2 Verkäufe pro Quartal für Team-Provisionen erforderlich.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-clyr-dark">Letzte Bestellungen</h3>
            <Link to="/partner/team" className="text-clyr-teal text-sm hover:underline flex items-center gap-1">
              Alle anzeigen <ArrowRight size={14} />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">Noch keine Bestellungen über deinen Code.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{order.order_number}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatPrice(order.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status === 'completed' ? 'Abgeschlossen' :
                       order.status === 'processing' ? 'In Bearbeitung' :
                       order.status === 'pending' ? 'Ausstehend' : order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Commissions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-clyr-dark">Letzte Provisionen</h3>
            <Link to="/partner/commissions" className="text-clyr-teal text-sm hover:underline flex items-center gap-1">
              Alle anzeigen <ArrowRight size={14} />
            </Link>
          </div>
          {recentCommissions.length === 0 ? (
            <p className="text-gray-500 text-sm py-4">Noch keine Provisionen.</p>
          ) : (
            <div className="space-y-3">
              {recentCommissions.map(comm => (
                <div key={comm.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-sm">
                      {comm.type === 'direct_sale' ? 'Direktverkauf' : 'Differenzprovision'}
                    </p>
                    <p className="text-xs text-gray-500">{comm.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm text-green-600">+{formatPrice(comm.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      comm.status === 'paid' ? 'bg-green-100 text-green-700' :
                      comm.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {comm.status === 'paid' ? 'Ausgezahlt' :
                       comm.status === 'approved' ? 'Genehmigt' : 'Ausstehend'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, color }) {
  return (
    <div className="glass rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fadeIn">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-clyr-dark mt-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
