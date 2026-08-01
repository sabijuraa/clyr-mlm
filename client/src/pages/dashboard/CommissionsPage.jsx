import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Clock, CheckCircle, Download, FileText, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';
import { commissionsAPI, payoutsAPI, downloadBlob } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const CommissionsPage = () => {
  const { t } = useLanguage();
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [stats, setStats] = useState({ totalEarned: 0, pendingAmount: 0, paidAmount: 0 });
  const [commissions, setCommissions] = useState([]);
  const [vatInfo, setVatInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [error, setError] = useState('');
  // Completed payouts now run twice a month (1st and 15th), so a single
  // month can have two separate statements. Fetch actual payout records
  // instead of assuming one PDF per calendar month.
  const [payouts, setPayouts] = useState([]);
  const [downloadingPayoutId, setDownloadingPayoutId] = useState(null);

  const getCommissionDate = (commission) => new Date(commission.order_date || commission.created_at);
  const isWithinSelectedPeriod = (commission) => {
    const [year, month] = selectedPeriod.split('-').map(Number);
    const commissionDate = getCommissionDate(commission);
    return commissionDate.getFullYear() === year && commissionDate.getMonth() === month - 1;
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const commissionsRes = await commissionsAPI.getMy({ limit: 500 });
      const allCommissions = commissionsRes.data?.commissions || [];
      setCommissions(allCommissions);

      const vat = commissionsRes.data?.commissionVatInfo;
      if (vat) setVatInfo(vat);
      const vatMult = vat?.vatDisplay === 'separate' ? 1.20 : 1.0;
      const gross = (n) => Math.round(n * vatMult * 100) / 100;

      const totalEarned = gross(allCommissions
        .filter(c => ['released', 'paid'].includes(c.status))
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0));
      const pendingAmount = gross(allCommissions
        .filter(c => c.status === 'held')
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0));
      // Include both 'paid' status commissions AND released ones that are linked to an active payout
      const paidAmount = gross(allCommissions
        .filter(c => c.status === 'paid' || (c.status === 'released' && c.payout_id))
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0));

      setStats({ totalEarned, pendingAmount, paidAmount });

      try {
        const payoutsRes = await payoutsAPI.getMy({ status: 'completed', limit: 24 });
        // The payout endpoint wraps its result as { success, data: { payouts } }.
        // Reading the outer object made `payouts` an object, so the period
        // filter below crashed with "payouts.filter is not a function".
        const payoutRows = payoutsRes.data?.data?.payouts
          || payoutsRes.data?.payouts
          || [];
        setPayouts(Array.isArray(payoutRows) ? payoutRows : []);
      } catch (payoutErr) {
        console.error('Load payouts error:', payoutErr);
      }
    } catch (err) {
      console.error('Load commissions error:', err);
      setError('Fehler beim Laden der Provisionen');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const downloadPayoutStatement = async (payout) => {
    setDownloadingPayoutId(payout.id);
    try {
      const response = await payoutsAPI.downloadStatement(payout.id);
      const label = payout.statement_number || payout.id;
      downloadBlob(response.data, `Provisionsgutschrift-${label}.pdf`);
      toast.success('Provisionsgutschrift heruntergeladen');
    } catch (err) {
      toast.error('Fehler beim Herunterladen der Provisionsgutschrift');
    } finally {
      setDownloadingPayoutId(null);
    }
  };

  const payoutsInSelectedPeriod = payouts.filter((p) => {
    const [year, month] = selectedPeriod.split('-').map(Number);
    const ref = new Date(p.period_end || p.period_start || p.created_at);
    return ref.getFullYear() === year && ref.getMonth() === month - 1;
  });

  const selectedMonthAmount = (() => {
    const vatMult = vatInfo?.vatDisplay === 'separate' ? 1.20 : 1.0;
    const total = commissions
      .filter(c => isWithinSelectedPeriod(c) && !['reversed', 'cancelled'].includes(c.status))
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    return Math.round(total * vatMult * 100) / 100;
  })();

  const displayAmount = (commission) => {
    const net = parseFloat(commission.amount || 0);
    if (vatInfo?.vatDisplay !== 'separate') return net;
    return Math.round(net * (1 + (parseFloat(vatInfo.vatRate || 0) / 100)) * 100) / 100;
  };

  const filteredCommissions = commissions.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'paid') return c.status === 'paid' || (c.status === 'released' && c.payout_id);
    if (filter === 'released') return c.status === 'released' && !c.payout_id;
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

  const periods = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    periods.push({ value: val, label });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">
            {t('dashboard.menu.commissions') || 'Provisionen'}
          </h1>
          <p className="text-secondary-500">Übersicht Ihrer Provisionen und Auszahlungen</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-secondary-700 bg-white focus:outline-none focus:ring-2 focus:ring-secondary-300">
            {periods.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Provisionsauszahlungen finden 2x im Monat statt (1. und 15.) — daher
          hier je Auszahlung ein eigener Download statt nur einer PDF pro Monat. */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-4">
        <h3 className="font-semibold text-secondary-700 mb-3">Provisionsgutschriften — {periods.find(p => p.value === selectedPeriod)?.label}</h3>
        {payoutsInSelectedPeriod.length === 0 ? (
          <p className="text-sm text-secondary-400">Für diesen Zeitraum liegt noch keine abgeschlossene Auszahlung vor.</p>
        ) : (
          <div className="space-y-2">
            {payoutsInSelectedPeriod.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-secondary-700">
                    {payout.period_start && payout.period_end
                      ? `${new Date(payout.period_start).toLocaleDateString('de-DE')} – ${new Date(payout.period_end).toLocaleDateString('de-DE')}`
                      : new Date(payout.created_at).toLocaleDateString('de-DE')}
                  </p>
                  <p className="text-xs text-secondary-400">{formatCurrency(parseFloat(payout.amount || payout.net_amount || 0))} · {payout.statement_number || `#${payout.id}`}</p>
                </div>
                <Button variant="secondary" icon={Download} disabled={downloadingPayoutId === payout.id}
                  onClick={() => downloadPayoutStatement(payout)}>
                  {downloadingPayoutId === payout.id ? 'Lädt...' : 'PDF'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Gesamt verdient" value={formatCurrency(stats.totalEarned)} icon={Wallet} color="primary" index={0} />
        <StatCard title="Diesen Monat" value={formatCurrency(selectedMonthAmount)} icon={TrendingUp} color="success" index={1} />
        <StatCard title="Ausstehend" value={formatCurrency(stats.pendingAmount)} icon={Clock} color="warning" index={2} />
        <StatCard title="Ausgezahlt" value={formatCurrency(stats.paidAmount)} icon={CheckCircle} color="info" index={3} />
      </div>

      {vatInfo && vatInfo.vatNote && (
        <div className="bg-secondary-50 rounded-xl p-4 text-sm text-secondary-600 flex items-start gap-3">
          <FileText className="w-5 h-5 text-secondary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-secondary-700 mb-1">Steuerinfo zu Ihren Provisionen</p>
            <p>{vatInfo.vatNote}</p>
          </div>
        </div>
      )}

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
                <span className="ml-1.5 text-xs">({commissions.filter(c => {
                  if (f.key === 'paid') return c.status === 'paid' || (c.status === 'released' && c.payout_id);
                  if (f.key === 'released') return c.status === 'released' && !c.payout_id;
                  return c.status === f.key;
                }).length})</span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

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
              {filter === 'all' ? 'Keine Provisionen' : `Keine ${statusLabels[filter]?.toLowerCase() || ''} Provisionen`}
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
                      {getCommissionDate(c).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-700 font-medium">
                      {typeLabels[c.type] || c.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-500">
                      {c.customer_name || c.order_number || '-'}
                      {c.source_first_name && (
                        <span className="text-xs text-secondary-400 ml-2">
                          (von {c.source_first_name} {c.source_last_name?.charAt(0)}.)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-800 font-semibold text-right">
                      {formatCurrency(displayAmount(c))}
                      {vatInfo?.vatDisplay === 'separate' && (
                        <div className="text-xs text-secondary-400 font-normal">
                          Netto: {formatCurrency(parseFloat(c.amount || 0))}
                        </div>
                      )}
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


