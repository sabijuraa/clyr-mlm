// client/src/pages/dashboard/PayoutsPage.jsx
// GROUP 6 #45: SEPA payout system for partners
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Clock, CheckCircle, XCircle, ArrowUpRight, Wallet, Building, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../config/app.config';
import StatCard from '../../components/dashboard/StatCard';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const PayoutsPage = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, pending: 0, totalPaid: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [requestAmount, setRequestAmount] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadPayouts();
    loadWallet();
  }, []);

  const loadPayouts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payouts/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.data?.payouts || data.payouts || data.data || []);
      }
    } catch (err) {
      console.error('Failed to load payouts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/partners/wallet', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const w = data.data || data;
        setWallet({
          balance: parseFloat(w.balance || w.wallet_balance || 0),
          pending: parseFloat(w.pending || w.pendingAmount || 0),
          totalPaid: parseFloat(w.totalPaid || w.total_paid_out || 0),
        });
      }
    } catch (err) {
      console.error('Failed to load wallet:', err);
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(requestAmount);
    if (!amount || amount < 50) {
      return toast.error('Mindest-Auszahlungsbetrag: 50,00 EUR');
    }
    if (amount > wallet.balance) {
      return toast.error('Nicht genuegend Guthaben');
    }

    setRequesting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        toast.success('Auszahlungsanfrage erstellt!');
        setShowRequestForm(false);
        setRequestAmount('');
        loadPayouts();
        loadWallet();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Fehler bei der Auszahlungsanfrage');
      }
    } catch (err) {
      toast.error('Fehler bei der Anfrage');
    } finally {
      setRequesting(false);
    }
  };

  const statusConfig = {
    pending: { label: 'Angefragt', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    approved: { label: 'Genehmigt', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    processing: { label: 'In Bearbeitung', color: 'bg-purple-100 text-purple-700', icon: ArrowUpRight },
    completed: { label: 'Ausgezahlt', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    cancelled: { label: 'Storniert', color: 'bg-red-100 text-red-700', icon: XCircle },
    rejected: { label: 'Abgelehnt', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const hasIban = !!(user?.iban || user?.bank_iban);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">Auszahlungen</h1>
          <p className="text-secondary-500">SEPA-Ueberweisungen auf Ihr Bankkonto</p>
        </div>
        {wallet.balance >= 50 && hasIban && (
          <Button variant="primary" icon={Banknote} onClick={() => setShowRequestForm(!showRequestForm)}>
            Auszahlung anfordern
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Verfuegbares Guthaben" value={formatCurrency(wallet.balance)} icon={Wallet} color="primary" index={0} />
        <StatCard title="Ausstehend" value={formatCurrency(wallet.pending)} icon={Clock} color="warning" index={1} />
        <StatCard title="Gesamt ausgezahlt" value={formatCurrency(wallet.totalPaid)} icon={CheckCircle} color="success" index={2} />
      </div>

      {/* No IBAN Warning */}
      {!hasIban && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">IBAN fehlt</h3>
            <p className="text-sm text-amber-700 mt-1">
              Bitte hinterlegen Sie Ihre Bankdaten in Ihrem <a href="/dashboard/profile" className="underline font-medium">Profil</a>, um Auszahlungen zu erhalten.
            </p>
          </div>
        </motion.div>
      )}

      {/* Request Form */}
      {showRequestForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-secondary-700 mb-4">Auszahlung anfordern</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-secondary-600 mb-1.5">Betrag (EUR)</label>
              <input type="number" min="50" max={wallet.balance} step="0.01"
                value={requestAmount} onChange={(e) => setRequestAmount(e.target.value)}
                placeholder={`Min. 50,00 | Max. ${wallet.balance.toFixed(2)}`}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary-500" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRequestAmount(wallet.balance.toFixed(2))}>
                Alles
              </Button>
              <Button variant="primary" onClick={handleRequestPayout} isLoading={requesting}>
                Anfordern
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <Building className="w-3.5 h-3.5" />
            <span>Auszahlung per SEPA auf: {user?.iban || '---'}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Auszahlungen werden zum 1. des Folgemonats bearbeitet. Mindestbetrag: 50,00 EUR.
          </p>
        </motion.div>
      )}

      {/* Payout History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-heading font-semibold text-lg text-secondary-700 mb-6">Auszahlungsverlauf</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (<div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />))}
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-12">
            <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-secondary-500">Noch keine Auszahlungen</p>
            <p className="text-sm text-gray-400 mt-1">Ihre Auszahlungsanfragen werden hier angezeigt</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-secondary-500">
                  <th className="pb-3 font-medium">Datum</th>
                  <th className="pb-3 font-medium">Betrag</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Referenz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payouts.map((p, idx) => {
                  const status = statusConfig[p.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={p.id || idx} className="hover:bg-gray-50">
                      <td className="py-3 text-secondary-700">
                        {new Date(p.created_at || p.createdAt).toLocaleDateString('de-DE')}
                      </td>
                      <td className="py-3 font-semibold text-secondary-700">
                        {formatCurrency(parseFloat(p.amount || p.total_amount || 0))}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400 text-xs font-mono">
                        {p.reference || p.payout_number || `PO-${String(p.id || idx).substring(0, 8)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Info Box */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">Auszahlungsinformationen</h3>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>&#8226; Auszahlungen erfolgen per <strong>SEPA-Ueberweisung</strong></li>
          <li>&#8226; Mindest-Auszahlungsbetrag: <strong>{formatCurrency(50)}</strong></li>
          <li>&#8226; Auszahlungstag: <strong>1. des Monats</strong> (nach Genehmigung)</li>
          <li>&#8226; Bearbeitungszeit: 2-5 Werktage</li>
          <li>&#8226; Rechnungssteller: <strong>CLYR Solutions GmbH</strong></li>
        </ul>
      </motion.div>
    </div>
  );
};

export default PayoutsPage;
