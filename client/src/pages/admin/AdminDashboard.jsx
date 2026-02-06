import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatPrice } from '../../utils/format';
import { Users, ShoppingBag, DollarSign, UserCheck, Package, Clock, TrendingUp, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/dashboard');
        setStats(data);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Laden...</div>;

  const cards = [
    { label: 'Kunden', value: stats?.total_customers || 0, icon: Users, color: 'bg-blue-100 text-blue-600', link: '/admin/orders' },
    { label: 'Partner', value: stats?.total_partners || 0, icon: UserCheck, color: 'bg-purple-100 text-purple-600', link: '/admin/partners' },
    { label: 'Bestellungen', value: stats?.total_orders || 0, icon: ShoppingBag, color: 'bg-green-100 text-green-600', link: '/admin/orders' },
    { label: 'Umsatz', value: formatPrice(stats?.total_revenue || 0), icon: DollarSign, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Offene Bestellungen', value: stats?.pending_orders || 0, icon: Clock, color: 'bg-yellow-100 text-yellow-600', link: '/admin/orders' },
    { label: 'Offene Provisionen', value: formatPrice(stats?.pending_commissions || 0), icon: TrendingUp, color: 'bg-orange-100 text-orange-600', link: '/admin/partners' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-clyr-dark mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${c.color}`}>
              <c.icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="text-xl font-bold text-clyr-dark">{c.value}</p>
            </div>
            {c.link && (
              <Link to={c.link} className="text-clyr-teal hover:text-clyr-hover">
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Produkte verwalten', desc: 'Produkte hinzufügen & bearbeiten', icon: Package, link: '/admin/products' },
          { label: 'Bestellungen', desc: 'Bestellungen & Versand', icon: ShoppingBag, link: '/admin/orders' },
          { label: 'Partner', desc: 'Partner & Provisionen', icon: UserCheck, link: '/admin/partners' },
          { label: 'CMS', desc: 'Inhalte & Seiten bearbeiten', icon: TrendingUp, link: '/admin/cms' },
        ].map((item, i) => (
          <Link
            key={i}
            to={item.link}
            className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md hover:border-clyr-teal transition-all group"
          >
            <item.icon className="w-8 h-8 text-clyr-teal mb-3" />
            <h3 className="font-semibold text-clyr-dark group-hover:text-clyr-teal transition-colors">{item.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
