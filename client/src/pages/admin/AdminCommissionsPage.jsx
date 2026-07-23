import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Download,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Ban,
  Gift,
  TrendingDown
} from 'lucide-react';
import { commissionsAPI, payoutsAPI, downloadBlob } from '../../services/api';
import api from '../../services/api';
import { formatDate, formatCurrency, formatCommissionType, formatCommissionStatus, getStatusColor } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const AdminCommissionsPage = () => {
  const [commissions, setCommissions] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [distributingPool, setDistributingPool] = useState(false);
  const [runningDecay, setRunningDecay] = useState(false);
  const [processingPayouts, setProcessingPayouts] = useState(false);
  const [confirmPayout, setConfirmPayout] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnoseData, setDiagnoseData] = useState(null);
  const [releasingAndPaying, setReleasingAndPaying] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipYear, setZipYear] = useState(new Date().getFullYear());
  const [zipMonth, setZipMonth] = useState(new Date().getMonth() + 1);
  const [manualPayouts, setManualPayouts] = useState([]);
  const [completingManualPayoutId, setCompletingManualPayoutId] = useState(null);

  const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const response = await api.get(`/commissions/admin-zip?year=${zipYear}&month=${zipMonth}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ZIP_${MONTHS_DE[zipMonth - 1]}_${zipYear}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('ZIP heruntergeladen');
    } catch (err) {
      const msg = err.response?.status === 404 ? 'Keine Abrechnungen für diesen Monat gefunden.' : 'ZIP-Download fehlgeschlagen.';
      toast.error(msg);
    } finally {
      setDownloadingZip(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    fetchManualPayouts();
  }, []);

  const fetchManualPayouts = async () => {
    try {
      const response = await payoutsAPI.getPending();
      const payouts = response.data?.data || [];
      // AUTO rows need consolidating first; manual rows are already prepared
      // with their exact commission set reserved.
      setManualPayouts(payouts.filter((payout) =>
        payout.status === 'pending' &&
        !payout.stripe_transfer_id &&
        (payout.method === 'manual' || String(payout.reference || '').startsWith('AUTO-'))
      ));
    } catch (error) {
      console.error('Failed to load manual payouts:', error);
    }
  };

  const handleCompleteManualPayout = async (payout) => {
    const methodInput = window.prompt('Payment method: enter SEPA, PayPal, or Manual.', 'SEPA');
    if (!methodInput) return;
    const paymentMethod = methodInput.trim().toLowerCase();
    if (!['sepa', 'paypal', 'manual'].includes(paymentMethod)) {
      toast.error('Choose SEPA, PayPal, or Manual');
      return;
    }
    const reference = window.prompt(
      `Enter the ${paymentMethod.toUpperCase()} transaction reference for €${Number(payout.gross_amount).toFixed(2)} paid to ${payout.first_name} ${payout.last_name}.`
    );
    if (!reference) return;
    if (!window.confirm('Confirm that this payment has already been sent externally. This only records it in CLYR and cannot be undone.')) return;

    setCompletingManualPayoutId(payout.id);
    try {
      await payoutsAPI.completeManual(payout.id, reference, paymentMethod);
      toast.success(`${paymentMethod.toUpperCase()} payment recorded and commissions marked paid`);
      await Promise.all([fetchCommissions(), fetchManualPayouts()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Manual payment could not be recorded');
    } finally {
      setCompletingManualPayoutId(null);
    }
  };

  const handlePrepareManualPayout = async (payout) => {
    if (!window.confirm('Prepare one consolidated manual payout for this affiliate? No money will be sent. Old pending rows will be retained as cancelled for the audit trail.')) return;
    setCompletingManualPayoutId(payout.id);
    try {
      await payoutsAPI.prepareManual(payout.id);
      toast.success('Manual payout prepared. Send the external payment, then record its reference.');
      await fetchManualPayouts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Manual payout could not be prepared');
    } finally {
      setCompletingManualPayoutId(null);
    }
  };

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const response = await commissionsAPI.getAll({ 
        page, 
        limit: 30,
        status: statusFilter || undefined,
        type: typeFilter || undefined
      });
      setCommissions(response.data.commissions);
      setTotals(response.data.totals);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch commissions:', error);
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const response = await commissionsAPI.release();
      toast.success(`${response.data.released.length} Provisionen freigegeben`);
      fetchCommissions();
    } catch (error) {
      toast.error('Fehler beim Freigeben');
    } finally {
      setReleasing(false);
    }
  };

  const handleProcessPayouts = async () => {
    setProcessingPayouts(true);
    setConfirmPayout(false);
    try {
      // Try Stripe Connect payouts first (automatic bank transfer)
      const stripeRes = await api.post('/stripe-connect/process-payouts');
      const { processed = 0, failed = 0, skipped = 0, totalPaid = 0, details } = stripeRes.data;
      
      if (processed > 0) {
        toast.success(`${processed} Stripe-Auszahlungen verarbeitet — €${totalPaid.toFixed(2)} überwiesen`);
      }
      if (skipped > 0) {
        toast(`${skipped} Partner haben Stripe noch nicht eingerichtet`, { icon: '⚠️' });
      }
      if (failed > 0) {
        toast.error(`${failed} Auszahlungen fehlgeschlagen`);
      }
      if (processed === 0 && skipped === 0) {
        // Fallback to manual payout recording
        const fallback = await commissionsAPI.processPayouts(false);
        const { processed: mp = [] } = fallback.data;
        toast.success(`${mp.length} Auszahlungen als verarbeitet markiert (manuell überweisen)`);
      }
      fetchCommissions();
    } catch (error) {
      // Fallback to manual
      try {
        const fallback = await commissionsAPI.processPayouts(false);
        const { processed: mp = [] } = fallback.data;
        toast.success(`${mp.length} Auszahlungen als verarbeitet markiert`);
        fetchCommissions();
      } catch {
        toast.error('Fehler beim Verarbeiten der Auszahlungen');
      }
    } finally {
      setProcessingPayouts(false);
    }
  };

  const handleDiagnose = async () => {
    setDiagnosing(true);
    try {
      const res = await api.get('/stripe-connect/diagnose');
      setDiagnoseData(res.data);
    } catch (e) {
      toast.error('Diagnose fehlgeschlagen: ' + (e.response?.data?.message || e.message));
    } finally { setDiagnosing(false); }
  };

  const handleReleaseAndPay = async () => {
    if (!confirm('Fällige Provisionen (14-Tage-Frist bereits abgelaufen) jetzt freigeben und Auszahlung starten?')) return;
    setReleasingAndPaying(true);
    try {
      const res = await api.post('/stripe-connect/release-and-pay');
      const { released, payout_result } = res.data;
      toast.success(`${released} Provisionen freigegeben. Stripe: ${payout_result.processed} ausgezahlt, ${payout_result.pending} ausstehend`);
      fetchCommissions();
      setDiagnoseData(null);
    } catch (e) {
      toast.error('Fehler: ' + (e.response?.data?.message || e.message));
    } finally { setReleasingAndPaying(false); }
  };

  const handleExport = async () => {
    try {
      const response = await commissionsAPI.getAll({ limit: 10000 });
      // Simple CSV export
      const csv = [
        'Datum,Partner,Typ,Betrag,Status',
        ...response.data.commissions.map(c => 
          `${formatDate(c.created_at)},${c.first_name} ${c.last_name},${c.type},${c.amount},${c.status}`
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadBlob(blob, `provisionen-${Date.now()}.csv`);
      toast.success('Export erfolgreich');
    } catch (error) {
      toast.error('Export fehlgeschlagen');
    }
  };

  const generatePartnerStatement = async (partnerId, partnerName, period = null) => {
    // Use the commission's own month — not today's month
    // Find the commission for this partner to get its date
    const partnerCommission = commissions.find(c => c.user_id === partnerId);
    const commissionDate = (partnerCommission?.order_date || partnerCommission?.created_at)
      ? new Date(partnerCommission.order_date || partnerCommission.created_at).toISOString().slice(0, 7)
      : null;
    const usePeriod = period || commissionDate || new Date().toISOString().slice(0, 7);
    try {
      const response = await commissionsAPI.generateStatement(partnerId, usePeriod);
      downloadBlob(response.data, `Provisionsgutschrift-${partnerName}-${usePeriod}.pdf`);
      toast.success('Provisionsgutschrift erstellt');
    } catch (error) {
      const msg = error.response?.status === 404 
        ? 'Keine Provisionen für diesen Zeitraum' 
        : 'Fehler beim Erstellen der Gutschrift';
      toast.error(msg);
    }
  };

  const handleDistributeBonusPool = async () => {
    // confirmation handled by button UI
    setDistributingPool(true);
    try {
      const response = await commissionsAPI.distributeBonusPool();
      toast.success(response.data.message);
      fetchCommissions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Fehler bei Bonus Pool Verteilung');
    } finally {
      setDistributingPool(false);
    }
  };

  const handleRankDecay = async () => {
    if (!confirm('Rang-Rückstufung für inaktive Partner (12+ Monate) durchführen?')) return;
    setRunningDecay(true);
    try {
      const response = await commissionsAPI.runRankDecay();
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Fehler bei Rang-Prüfung');
    } finally {
      setRunningDecay(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending: 'text-secondary-500 bg-gray-100',
      held: 'text-secondary-700 bg-slate-50',
      released: 'text-primary-400 bg-secondary-100',
      paid: 'text-secondary-700 bg-secondary-100',
      cancelled: 'text-secondary-500 bg-gray-100',
    };
    return styles[status] || styles.pending;
  };

  if (loading && commissions.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">Provisionen</h1>
          <p className="text-secondary-500">Übersicht aller Provisionen im System</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Commission ZIP Download */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            <select value={zipMonth} onChange={e => setZipMonth(Number(e.target.value))}
              className="text-sm border-0 bg-transparent text-blue-700 font-medium focus:ring-0 cursor-pointer">
              {MONTHS_DE.map((name, i) => <option key={i+1} value={i+1}>{name}</option>)}
            </select>
            <select value={zipYear} onChange={e => setZipYear(Number(e.target.value))}
              className="text-sm border-0 bg-transparent text-blue-700 font-medium focus:ring-0 cursor-pointer">
              {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleDownloadZip} disabled={downloadingZip}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 transition">
              <Download className="w-3.5 h-3.5" />
              {downloadingZip ? 'ZIP...' : 'ZIP'}
            </button>
          </div>
          <Button variant="outline" onClick={handleExport} icon={Download}>
            Export
          </Button>
          <Button variant="outline" onClick={handleDistributeBonusPool} isLoading={distributingPool} icon={Gift}>
            Bonus Pool
          </Button>
          <Button variant="outline" onClick={handleRankDecay} isLoading={runningDecay} icon={TrendingDown}>
            Rang-Prüfung
          </Button>
          <Button onClick={handleRelease} isLoading={releasing} icon={Play}>
            Freigeben
          </Button>
          <Button variant="outline" onClick={handleDiagnose} isLoading={diagnosing}>
            Diagnose
          </Button>
          <Button variant="outline" onClick={handleReleaseAndPay} isLoading={releasingAndPaying}
            className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100">
            Jetzt Freigeben & Auszahlen
          </Button>
          {!confirmPayout ? (
            <Button onClick={() => setConfirmPayout(true)} variant="primary">
              Auszahlungen verarbeiten
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <span className="text-sm text-red-700 font-medium">Sicher? Kann nicht rückgängig gemacht werden.</span>
              <button onClick={handleProcessPayouts} disabled={processingPayouts}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
                {processingPayouts ? 'Wird verarbeitet...' : 'Ja, verarbeiten'}
              </button>
              <button onClick={() => setConfirmPayout(false)}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards - Consistent Teal Theme */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-400" />
              </div>
            </div>
            <p className="text-sm text-secondary-500">Zurückgehalten</p>
            <p className="text-xl font-bold text-secondary-700">{formatCurrency(totals.total_held || 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary-400" />
              </div>
            </div>
            <p className="text-sm text-secondary-500">Freigegeben</p>
            <p className="text-xl font-bold text-secondary-700">{formatCurrency(totals.total_released || 0)}</p>
            <p className="text-xs text-gray-400 mt-1">Netto (VAT added per partner country on payout)</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-primary-400" />
              </div>
            </div>
            <p className="text-sm text-secondary-500">Ausgezahlt</p>
            <p className="text-xl font-bold text-secondary-700">{formatCurrency(totals.total_paid || 0)}</p>
            <p className="text-xs text-gray-400 mt-1">Netto (VAT added per partner country on payout)</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-secondary-500" />
              </div>
            </div>
            <p className="text-sm text-secondary-500">Ausstehend</p>
            <p className="text-xl font-bold text-secondary-700">{formatCurrency(totals.total_pending || 0)}</p>
          </div>
        </div>
      )}

      {manualPayouts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold text-amber-900">Manual payments required</h2>
              <p className="text-sm text-amber-800 mt-1">
                These affiliates have no active Stripe payout account. Send the amount externally first, then record the transfer reference here.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-amber-200 text-amber-900 px-3 py-1 text-sm font-semibold">
              {manualPayouts.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-amber-900">
                <tr className="border-b border-amber-200">
                  <th className="py-2 pr-4">Affiliate</th>
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4 text-right">Net</th>
                  <th className="py-2 pr-4 text-right">Gross to send</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {manualPayouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-secondary-700">{payout.first_name} {payout.last_name}</div>
                      <div className="text-xs text-secondary-500">{payout.email}</div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-secondary-600">{payout.reference}</td>
                    <td className="py-3 pr-4 text-right">{formatCurrency(payout.net_amount)}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatCurrency(payout.gross_amount)}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => payout.method === 'manual'
                          ? handleCompleteManualPayout(payout)
                          : handlePrepareManualPayout(payout)}
                        disabled={completingManualPayoutId === payout.id}
                        className="px-3 py-1.5 rounded-lg bg-amber-700 text-white font-medium hover:bg-amber-800 disabled:opacity-50"
                      >
                        {completingManualPayoutId === payout.id
                          ? 'Processing…'
                          : payout.method === 'manual' ? 'Record as paid' : 'Prepare payment'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
          >
            <option value="">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="held">Zurückgehalten</option>
            <option value="released">Freigegeben</option>
            <option value="paid">Ausgezahlt</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
          >
            <option value="">Alle Typen</option>
            <option value="direct">Direkt</option>
            <option value="difference">Differenz</option>
            <option value="leadership_bonus">Leadership Bonus</option>
            <option value="team_volume_bonus">Team-Umsatz Bonus</option>
            <option value="bonus_pool">Bonus Pool</option>
            <option value="leadership_cash_bonus">Führungsprämie</option>
            <option value="rank_bonus">Rang-Bonus</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Diagnose Panel */}
      {diagnoseData && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-secondary-700">System-Diagnose</h3>
            <button onClick={() => setDiagnoseData(null)} className="text-gray-400 hover:text-gray-600 text-sm">Schließen</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Stripe</p>
              <p className={`font-bold ${diagnoseData.stripe_configured ? 'text-green-600' : 'text-red-600'}`}>
                {diagnoseData.stripe_configured ? `✅ ${diagnoseData.stripe_key_prefix}...` : '❌ Nicht konfiguriert'}
              </p>
            </div>
            {diagnoseData.commission_summary?.map(s => (
              <div key={s.status} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{s.status}</p>
                <p className="font-bold text-secondary-700">{s.count}x · €{parseFloat(s.total).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Partner mit Guthaben:</p>
            {diagnoseData.partners_with_balance?.map(p => (
              <div key={p.email} className="flex items-center gap-3 text-sm py-1 border-b border-gray-50">
                <span className="font-medium">{p.first_name} {p.last_name}</span>
                <span className="text-gray-500">{p.email}</span>
                <span className="text-primary-500 font-bold">€{parseFloat(p.wallet_balance).toFixed(2)}</span>
                <span className={p.stripe_account_id ? 'text-green-600 text-xs' : 'text-red-500 text-xs'}>
                  {p.stripe_account_id ? '✅ Stripe verbunden' : '❌ Kein Stripe'}
                </span>
                <span className="text-xs text-gray-400">{p.released_count} freigegeben</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Serverzeit: {diagnoseData.server_time} · Nächster Cron: {diagnoseData.next_payout_cron}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {commissions.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-secondary-700">Keine Provisionen</h3>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-500 uppercase">Datum</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-500 uppercase">Partner</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-500 uppercase hidden md:table-cell">Typ</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-500 uppercase hidden md:table-cell">Bestellung</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-secondary-500 uppercase">Betrag</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-secondary-500 uppercase">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissions.map((commission, idx) => (
                    <motion.tr
                      key={commission.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm text-secondary-500">
                        {formatDate(commission.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-secondary-700">{commission.first_name} {commission.last_name}</p>
                        <p className="text-sm text-secondary-500">{commission.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm hidden md:table-cell">
                        {formatCommissionType(commission.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary-500 hidden md:table-cell">
                        {commission.customer_name || commission.order_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(commission.status)}`}>
                          {formatCommissionStatus(commission.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-primary-400">
                        <div>{formatCurrency(commission.amount)}</div>
                          {commission.gross_amount && <div className="text-xs text-green-600">Brutto: {formatCurrency(commission.gross_amount)}</div>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => generatePartnerStatement(commission.user_id, `${commission.first_name}-${commission.last_name}`)}
                          className="p-2 text-secondary-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Provisionsgutschrift erstellen"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-secondary-500">
                  Seite {pagination.page} von {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminCommissionsPage;
