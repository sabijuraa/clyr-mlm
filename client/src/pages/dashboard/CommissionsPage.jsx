import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Clock, CheckCircle, Download, Filter } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';
import StatCard from '../../components/dashboard/StatCard';
import CommissionTable from '../../components/dashboard/CommissionTable';
import Button from '../../components/common/Button';

// Demo data
const demoCommissionStats = {
  totalEarned: 4567.89,
  pendingAmount: 234.56,
  paidAmount: 4333.33,
  thisMonth: 567.89
};

const demoCommissions = [
  { id: 1, type: 'direct', orderId: 'FL-001', description: 'AquaPure Pro 3000', amount: 259.80, status: 'released', createdAt: new Date() },
  { id: 2, type: 'difference', orderId: 'FL-002', description: 'Team: Max Mustermann', amount: 45.00, status: 'held', createdAt: new Date(Date.now() - 86400000) },
  { id: 3, type: 'direct', orderId: 'FL-003', description: 'FreshFlow Kompakt', amount: 179.80, status: 'paid', createdAt: new Date(Date.now() - 172800000) },
  { id: 4, type: 'bonus', orderId: null, description: 'Leadership Bonus', amount: 50.00, status: 'released', createdAt: new Date(Date.now() - 259200000) },
  { id: 5, type: 'direct', orderId: 'FL-004', description: 'Premium Filterset', amount: 29.80, status: 'paid', createdAt: new Date(Date.now() - 345600000) },
  { id: 6, type: 'difference', orderId: 'FL-005', description: 'Team: Anna Schmidt', amount: 22.50, status: 'paid', createdAt: new Date(Date.now() - 432000000) },
];

const CommissionsPage = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState(demoCommissionStats);
  const [commissions, setCommissions] = useState(demoCommissions);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, released, paid
  const [dateRange, setDateRange] = useState('month'); // week, month, year, all

  const filteredCommissions = commissions.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            {t('dashboard.menu.commissions')}
          </h1>
          <p className="text-gray-600">Übersicht Ihrer Provisionen und Auszahlungen</p>
        </div>
        <Button variant="secondary" icon={Download}>
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gesamt verdient"
          value={formatCurrency(stats.totalEarned)}
          icon={Wallet}
          color="primary"
          index={0}
        />
        <StatCard
          title="Diesen Monat"
          value={formatCurrency(stats.thisMonth)}
          icon={TrendingUp}
          color="success"
          trend="up"
          trendValue="+23%"
          index={1}
        />
        <StatCard
          title="Ausstehend"
          value={formatCurrency(stats.pendingAmount)}
          icon={Clock}
          color="warning"
          index={2}
        />
        <StatCard
          title="Ausgezahlt"
          value={formatCurrency(stats.paidAmount)}
          icon={CheckCircle}
          color="info"
          index={3}
        />
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-4"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'Alle' },
              { key: 'held', label: 'In Wartezeit' },
              { key: 'released', label: 'Freigegeben' },
              { key: 'paid', label: 'Ausgezahlt' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <div className="sm:ml-auto">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-gray-100 border-0 rounded-xl text-sm font-medium text-gray-700
                focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="week">Diese Woche</option>
              <option value="month">Dieser Monat</option>
              <option value="year">Dieses Jahr</option>
              <option value="all">Alle Zeit</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Commission Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 p-6"
      >
        <CommissionTable commissions={filteredCommissions} isLoading={isLoading} />
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 rounded-2xl p-6 border border-blue-100"
      >
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Provisionsinfo</h3>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>• Provisionen haben eine <strong>14-tägige Wartezeit</strong> nach Bestellung</li>
          <li>• Nach Freigabe werden Provisionen zum <strong>1. des Monats</strong> ausgezahlt</li>
          <li>• Mindest-Auszahlungsbetrag: <strong>{formatCurrency(50)}</strong></li>
          <li>• Bei Stornierung/Rückgabe wird die Provision automatisch zurückgebucht</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default CommissionsPage;