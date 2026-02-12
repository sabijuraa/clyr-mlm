import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Clock, CheckCircle, Download, FileText, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';
import { commissionsAPI, downloadBlob } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const CommissionsPage = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ totalEarned: 0, pendingAmount: 0, paidAmount: 0, thisMonth: 0 });
  const [commissions, setCommissions] = useState([]);
  const [vatInfo, setVatInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [commissionsRes, summaryRes] = await Promise.allSettled([
        commissionsAPI.getMy({ limit: 100 }),
        commissionsAPI.getSummary()
      ]);

      if (commissionsRes.status === 'fulfilled') {
        const data = commissionsRes.value.data;
        setCommissions(data.commissions || []);
        if (data.commissionVatInfo) setVatInfo(data.commissionVatInfo);
      }

      if (summaryRes.status === 'fulfilled') {
        const data = summaryRes.value.data;
        const summary = data.summary || {};
        const monthly = data.monthly || [];
        const currentMonth = monthly.length > 0 ? parseFloat(monthly[0]?.total || 0) : 0;

        setStats({
          totalEarned: parseFloat(summary.totalEarned || summary.total_earned || 0),
          pendingAmount: parseFloat(summary.pending || summary.held || 0),
          paidAmount: parseFloat(summary.paidOut || summary.paid_out || summary.paid || 0),
          thisMonth: parseFloat(summary.thisMonth || summary.this_month || currentMonth || 0)
        });
      }
    } catch (err) {
      console.error('Load commissions error:', err);
      setError('Fehler beim Laden der Provisionen');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const downloadStatement = async (period) => {
    setDownloading(true);
    try {
      const response = await commissionsAPI.getStatement(period);
      downloadBlob(response.data, `Provisionsgutschrift-${period}.pdf`);
      toast.success('Provisionsgutschrift heruntergeladen');
    } catch (err) {
      const msg = err.response?.status === 404
        ? 'Keine Provisionen für diesen Zeitraum vorhanden'
        : 'Fehler beim Herunterladen der Provisionsgutschrift';
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  const filteredCommissions = commissions.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const typeLabels = {
    direct: 'Direktprovision', difference: 'Differenzprovision',
    leadership_bonus: 'Führungsbonus', team_volume_bonus: 'Teamumsatz-Bonus',
    rank_bonus: 'Rangbonus', bonus_pool: 'Bonuspool',
    override: 'Override', matching_bonus: 'Matching Bonus'
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700', held: 'bg-orange-100 text-orange-700',
    released: 'bg-green-100 text-green-700', paid: 'bg-blue-100 text-blue-700',
    reversed: 'bg-red-100 text-red-700'
  };

  const statusLabels = {
    pending: 'Ausstehend', held: 'Wartezeit',
    released: 'Freigegeben', paid: 'Ausgezahlt', reversed: 'Storniert'
  };

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Generate last 6 months for period selector
  const periods = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    periods.push({ value: val, label });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">
            {t('dashboard.menu.commissions') || 'Provisionen'}
          </h1>
          <p className="text-secondary-500">Übersicht Ihrer Provisionen und Auszahlungen</p>
        </div>
        <div className="flex gap-3">
          <div className="relative group">
            <Button variant="secondary" icon={Download} disabled={downloading}
              onClick={() => downloadStatement(currentPeriod)}>
              {downloading ? 'Lädt...' : 'Provisionsgutschrift'}
            </Button>
            {/* Period selector dropdown on hover */}
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[220px] z-20 hidden group-hover:block">
              <p className="px-4 py-1.5 text-xs text-secondary-400 font-medium">Zeitraum wählen:</p>
              {periods.map((p) => (
                <button key={p.value} onClick={() => downloadStatement(p.value)}
                  className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-gray-50 transition-colors">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Gesamt verdient" value={formatCurrency(stats.totalEarned)} icon={Wallet} color="primary" index={0} />
        <StatCard title="Diesen Monat" value={formatCurrency(stats.thisMonth)} icon={TrendingUp} color="success" index={1} />
        <StatCard title="Ausstehend" value={formatCurrency(stats.pendingAmount)} icon={Clock} color="warning" index={2} />
        <StatCard title="Ausgezahlt" value={formatCurrency(stats.paidAmount)} icon={CheckCircle} color="info" index={3} />
      </div>

      {/* VAT Info */}
      {vatInfo && vatInfo.vatNote && (
        <div className="bg-secondary-50 rounded-xl p-4 text-sm text-secondary-600 flex items-start gap-3">
          <FileText className="w-5 h-5 text-secondary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-secondary-700 mb-1">Steuerinfo zu Ihren Provisionen</p>
            <p>{vatInfo.vatNote}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'held', label: 'In Wartezeit' },
            { key: 'released', label: 'Freigegeben' },
            { key: 'paid', label: 'Ausgezahlt' },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f.key ? 'bg-secondary-100 text-secondary-700' : 'bg-gray-100 text-secondary-500 hover:bg-gray-200'}`}>
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1.5 text-xs">({commissions.filter(c => c.status === f.key).length})</span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Commission Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-secondary-500">Provisionen werden geladen...</p>
          </div>
        ) : filteredCommissions.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
            <p className="text-secondary-500 font-medium">
              {filter === 'all' ? 'Noch keine Provisionen vorhanden' : `Keine ${statusLabels[filter]?.toLowerCase() || ''} Provisionen`}
            </p>
            <p className="text-secondary-400 text-sm mt-1">Provisionen werden automatisch bei Verkäufen berechnet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Typ</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Bestellung</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Betrag</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCommissions.map((c, idx) => (
                  <tr key={c.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-secondary-600">
                      {new Date(c.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-700 font-medium">
                      {typeLabels[c.type] || c.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-500">
                      {c.order_number || '-'}
                      {c.source_first_name && (
                        <span className="text-xs text-secondary-400 ml-2">
                          (von {c.source_first_name} {c.source_last_name?.charAt(0)}.)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-800 font-semibold text-right">
                      {formatCurrency(parseFloat(c.amount || 0))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[c.status] || c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Info Box */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
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
