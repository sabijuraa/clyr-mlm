import { useState } from 'react';
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
import StatCard from '../../components/dashboard/StatCard';
import RankProgress from '../../components/dashboard/RankProgress';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import CommissionTable from '../../components/dashboard/CommissionTable';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const demoStats = {
  balance: 1234.56,
  totalSales: 45,
  teamSize: 12,
  monthlyCommission: 567.89
};

const demoActivities = [
  { id: 1, type: 'order', title: 'Neue Bestellung', description: 'AquaPure Pro 3000 verkauft', amount: 259.80, createdAt: new Date() },
  { id: 2, type: 'partner_joined', title: 'Neuer Partner', description: 'Max Mustermann ist beigetreten', createdAt: new Date(Date.now() - 3600000) },
  { id: 3, type: 'commission', title: 'Provision erhalten', description: 'Differenzprovision von Team', amount: 45.00, createdAt: new Date(Date.now() - 7200000) },
  { id: 4, type: 'rank_up', title: 'Rangaufstieg!', description: 'Sie sind jetzt Senior Berater', createdAt: new Date(Date.now() - 86400000) },
];

const demoCommissions = [
  { id: 1, type: 'direct', orderId: 'FL-001', amount: 259.80, status: 'released', createdAt: new Date() },
  { id: 2, type: 'difference', orderId: 'FL-002', amount: 45.00, status: 'held', createdAt: new Date(Date.now() - 86400000) },
  { id: 3, type: 'direct', orderId: 'FL-003', amount: 179.80, status: 'paid', createdAt: new Date(Date.now() - 172800000) },
];

const DashboardPage = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  
  const [stats] = useState(demoStats);
  const [activities] = useState(demoActivities);
  const [commissions] = useState(demoCommissions);
  const [isLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}?ref=${user?.referral_code || user?.referralCode || 'ABC123'}`;

  const handleCopyLink = async () => {
    const success = await copyToClipboard(referralLink);
    if (success) {
      setCopied(true);
      toast.success('Link kopiert!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="lg:hidden">
        <h1 className="text-2xl font-bold text-gray-900">
          {lang === 'de' ? 'Willkommen zurück' : 'Welcome back'}, {user?.first_name || user?.firstName}! 👋
        </h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">
              {lang === 'de' ? 'Ihr Empfehlungslink' : 'Your Referral Link'}
            </h3>
            <p className="text-white/80 text-sm">
              {lang === 'de' 
                ? 'Teilen Sie diesen Link, um neue Kunden und Partner zu gewinnen' 
                : 'Share this link to acquire new customers and partners'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 md:w-80 px-4 py-2.5 bg-white/20 rounded-xl truncate text-sm">
              {referralLink}
            </div>

            <button
              onClick={handleCopyLink}
              className={`p-2.5 rounded-xl transition-colors ${
                copied ? 'bg-green-500' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <Copy className="w-5 h-5" />
            </button>

            <a
              href={referralLink}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={lang === 'de' ? 'Guthaben' : 'Balance'} value={formatCurrency(stats.balance)} icon={Wallet} color="primary" trend="up" trendValue="+12%" index={0} />
        <StatCard title={lang === 'de' ? 'Verkäufe' : 'Sales'} value={stats.totalSales} subtitle={lang === 'de' ? 'Diesen Monat' : 'This month'} icon={ShoppingBag} color="success" trend="up" trendValue="+8" index={1} />
        <StatCard title={lang === 'de' ? 'Team' : 'Team'} value={stats.teamSize} subtitle="Partner" icon={Users} color="info" index={2} />
        <StatCard title={lang === 'de' ? 'Monatsprovision' : 'Monthly Commission'} value={formatCurrency(stats.monthlyCommission)} icon={TrendingUp} color="warning" trend="up" trendValue="+23%" index={3} />
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
              <h3 className="font-semibold text-lg text-gray-900">
                {lang === 'de' ? 'Letzte Provisionen' : 'Recent Commissions'}
              </h3>
              <Link to="/dashboard/provisionen">
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
            <h3 className="font-semibold text-lg text-gray-900 mb-6">
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
            <RankProgress currentRankId={user?.rank_id || user?.rankId || 2} currentSales={stats.totalSales} teamSales={87} />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.5 }} 
            className="bg-white rounded-2xl border border-gray-100 p-6"
          >
            <h3 className="font-semibold text-lg text-gray-900 mb-4">
              {lang === 'de' ? 'Schnellzugriff' : 'Quick Actions'}
            </h3>

            <div className="space-y-3">
              <Link to="/dashboard/links" className="block">
                <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900">
                    {lang === 'de' ? 'Empfehlungslinks' : 'Referral Links'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {lang === 'de' ? 'Links für alle Produkte' : 'Links for all products'}
                  </p>
                </div>
              </Link>

              <Link to="/dashboard/team" className="block">
                <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900">
                    {lang === 'de' ? 'Team verwalten' : 'Manage Team'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {lang === 'de' ? 'Teamstruktur ansehen' : 'View team structure'}
                  </p>
                </div>
              </Link>

              <Link to="/produkte" className="block">
                <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <p className="font-medium text-gray-900">
                    {lang === 'de' ? 'Produkte' : 'Products'}
                  </p>
                  <p className="text-sm text-gray-500">
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
