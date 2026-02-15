import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  ArrowRight,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';
import { copyToClipboard } from '../../utils/helpers';
import { partnerAPI } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import RankProgress from '../../components/dashboard/RankProgress';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import CommissionTable from '../../components/dashboard/CommissionTable';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  
  const [stats, setStats] = useState({
    balance: 0,
    totalSales: 0,
    teamSize: 0,
    monthlyCommission: 0
  });
  const [activities, setActivities] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [rankData, setRankData] = useState(null);
  const [teamSales, setTeamSales] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}?ref=${user?.referral_code || user?.referralCode || ''}`;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await partnerAPI.getDashboard();
      const data = response.data;

      setStats({
        balance: parseFloat(data.commissions?.available || data.commissions?.totalEarned || 0),
        totalSales: parseInt(data.monthlyOrders?.count || user?.own_sales_count || 0),
        teamSize: parseInt(data.team?.total || 0),
        monthlyCommission: parseFloat(data.commissions?.thisMonth || data.monthlyOrders?.revenue || 0)
      });

      setTeamSales(parseInt(data.team?.total || 0) * 3); // Approx or from actual data

      if (data.rank) {
        setRankData(data.rank);
      }

      // Build recent commissions from API data
      if (data.recentOrders && data.recentOrders.length > 0) {
        setCommissions(data.recentOrders.map(o => ({
          id: o.id,
          type: 'direct',
          orderId: o.order_number || o.id,
          amount: parseFloat(o.commission || 0),
          status: o.commission ? 'released' : 'held',
          createdAt: new Date(o.created_at)
        })).filter(c => c.amount > 0));
      }

      // Build activities from recent orders
      if (data.recentOrders) {
        setActivities(data.recentOrders.map(o => ({
          id: o.id,
          type: 'order',
          title: lang === 'de' ? 'Bestellung' : 'Order',
          description: `${o.customer_first_name || ''} ${o.customer_last_name || ''}`.trim() || o.order_number,
          amount: parseFloat(o.total || 0),
          createdAt: new Date(o.created_at)
        })));
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopied(true);
      toast.success(lang === 'de' ? 'Link kopiert!' : 'Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold text-secondary-700">
          {lang === 'de' ? 'Willkommen zurück' : 'Welcome back'}, {user?.first_name || user?.firstName}!
        </h1>
      </div>

      {/* Referral Link Card - Charcoal background */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-secondary-700 rounded-2xl p-6 text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">
              {lang === 'de' ? 'Ihr Empfehlungslink' : 'Your Referral Link'}
            </h3>
            <p className="text-gray-300 text-sm">
              {lang === 'de' 
                ? 'Teilen Sie diesen Link, um neue Kunden und Partner zu gewinnen' 
                : 'Share this link to acquire new customers and partners'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 md:w-80 px-4 py-2.5 bg-secondary-600 rounded-xl truncate text-sm">
              {referralLink}
            </div>

            <button
              onClick={handleCopyLink}
              className={`p-2.5 rounded-xl transition-colors ${
                copied ? 'bg-green-500' : 'bg-secondary-600 hover:bg-primary-500'
              }`}
            >
              <Copy className="w-5 h-5" />
            </button>

            <a
              href={referralLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-secondary-600 hover:bg-primary-500 rounded-xl transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={lang === 'de' ? 'Guthaben' : 'Balance'} value={formatCurrency(stats.balance)} icon={Wallet} color="primary" index={0} />
        <StatCard title={lang === 'de' ? 'Verkäufe' : 'Sales'} value={stats.totalSales} subtitle={lang === 'de' ? 'Diesen Monat' : 'This month'} icon={ShoppingBag} color="success" index={1} />
        <StatCard title={lang === 'de' ? 'Team' : 'Team'} value={stats.teamSize} subtitle="Partner" icon={Users} color="info" index={2} />
        <StatCard title={lang === 'de' ? 'Monatsprovision' : 'Monthly Commission'} value={formatCurrency(stats.monthlyCommission)} icon={TrendingUp} color="warning" index={3} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }} 
            className="bg-white rounded-2xl border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg text-secondary-700">
                {lang === 'de' ? 'Letzte Provisionen' : 'Recent Commissions'}
              </h3>
              <Link to="/dashboard/commissions">
                <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                  {lang === 'de' ? 'Alle anzeigen' : 'View all'}
                </Button>
              </Link>
            </div>
            <CommissionTable commissions={commissions.slice(0, 5)} isLoading={isLoading} />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }} 
            className="bg-white rounded-2xl border border-gray-100 p-6"
          >
            <h3 className="font-semibold text-lg text-secondary-700 mb-6">
              {lang === 'de' ? 'Letzte Aktivitäten' : 'Recent Activity'}
            </h3>
            <ActivityFeed activities={activities} isLoading={isLoading} limit={5} />
          </motion.div>
        </div>

        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
          >
            <RankProgress currentRankId={user?.rank_id || user?.rankId || 1} currentSales={stats.totalSales} teamSales={teamSales} />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }} 
            className="bg-white rounded-2xl border border-gray-100 p-6"
          >
            <h3 className="font-semibold text-lg text-secondary-700 mb-4">
              {lang === 'de' ? 'Schnellzugriff' : 'Quick Actions'}
            </h3>

            <div className="space-y-3">
              <Link to="/dashboard/links" className="block">
                <div className="p-4 bg-slate-50 rounded-xl hover:bg-secondary-700 hover:text-white transition-colors group">
                  <p className="font-medium text-secondary-700 group-hover:text-white">
                    {lang === 'de' ? 'Empfehlungslinks' : 'Referral Links'}
                  </p>
                  <p className="text-sm text-secondary-500 group-hover:text-gray-300">
                    {lang === 'de' ? 'Links für alle Produkte' : 'Links for all products'}
                  </p>
                </div>
              </Link>

              <Link to="/dashboard/team" className="block">
                <div className="p-4 bg-slate-50 rounded-xl hover:bg-secondary-700 hover:text-white transition-colors group">
                  <p className="font-medium text-secondary-700 group-hover:text-white">
                    {lang === 'de' ? 'Team verwalten' : 'Manage Team'}
                  </p>
                  <p className="text-sm text-secondary-500 group-hover:text-gray-300">
                    {lang === 'de' ? 'Teamstruktur ansehen' : 'View team structure'}
                  </p>
                </div>
              </Link>

              <Link to="/products" className="block">
                <div className="p-4 bg-slate-50 rounded-xl hover:bg-secondary-700 hover:text-white transition-colors group">
                  <p className="font-medium text-secondary-700 group-hover:text-white">
                    {lang === 'de' ? 'Produkte' : 'Products'}
                  </p>
                  <p className="text-sm text-secondary-500 group-hover:text-gray-300">
                    {lang === 'de' ? 'Zum Shop' : 'Go to shop'}
                  </p>
                </div>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
