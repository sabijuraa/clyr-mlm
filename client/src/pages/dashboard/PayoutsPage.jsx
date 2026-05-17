// client/src/pages/dashboard/PayoutsPage.jsx
// GROUP 6 #45: SEPA payout system for partners
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Clock, CheckCircle, XCircle, ArrowUpRight, Wallet, AlertTriangle, Zap, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../config/app.config';
import { payoutsAPI, partnerAPI } from '../../services/api';
import StatCard from '../../components/dashboard/StatCard';

const PayoutsPage = () => {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, pending: 0, totalPaid: 0, vatRate: 0, hasIban: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayouts();
    loadWallet();
  }, []);

  const loadPayouts = async () => {
    try {
      const response = await payoutsAPI.getMy();
      const data = response.data;
      setPayouts(data.data?.payouts || data.payouts || data.data || []);
    } catch (err) {
      console.error('Failed to load payouts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWallet = async () => {
    try {
      const response = await partnerAPI.getWallet();
      const w = response.data?.data || response.data || {};
      setWallet({
        balance: parseFloat(w.balance || w.wallet_balance || 0),
        pending: parseFloat(w.pending || w.pendingAmount || 0),
        totalPaid: parseFloat(w.totalPaid || w.total_paid_out || 0),
        vatRate: parseFloat(w.vatRate || 0),
        hasIban: !!(w.hasIban || user?.iban),
      });
    } catch (err) {
      console.error('Failed to load wallet:', err);
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


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-secondary-700">Auszahlungen</h1>
        <p className="text-secondary-500">Automatische SEPA-Überweisungen auf Ihr Bankkonto</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard 
          title="Verfuegbares Guthaben" 
          value={formatCurrency(wallet.balance)} 
          icon={Wallet} 
          color="primary" 
          index={0}
          subtitle={wallet.vatRate > 0 ? `inkl. ${wallet.vatRate}% USt.` : undefined}
        />
        <StatCard title="Ausstehend" value={formatCurrency(wallet.pending)} icon={Clock} color="warning" index={1} />
        <StatCard title="Gesamt ausgezahlt" value={formatCurrency(wallet.totalPaid)} icon={CheckCircle} color="success" index={2} />
      </div>

      {/* Automatic payout info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-secondary-700 to-secondary-800 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Vollautomatische Auszahlung</h3>
            <p className="text-white/80 text-sm mb-4">
              Ihre Provisionen werden automatisch am <strong className="text-white">1. jedes Monats</strong> auf Ihr Bankkonto überwiesen — kein Antrag nötig.
            </p>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
              <Calendar className="w-5 h-5 text-white/70 flex-shrink-0" />
              <div>
                <p className="text-xs text-white/70">Nächstes Auszahlungsdatum</p>
                <p className="font-semibold text-white">
                  {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* No Stripe Warning */}
      {!wallet.hasIban && wallet.balance > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Stripe nicht verbunden</h3>
            <p className="text-sm text-amber-700 mt-1">
              Bitte verbinden Sie Ihr Stripe-Konto unter <a href="/dashboard/profile" className="underline font-medium">Profil → Bankdaten</a>, damit automatische Auszahlungen möglich sind.
            </p>
          </div>
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
            <p className="text-sm text-gray-400 mt-1">Ihre erste Auszahlung erfolgt am 1. des nächsten Monats</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-secondary-500">
                  <th className="pb-3 font-medium">Auszahlungsdatum</th>
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
                        {new Date(p.completed_at || p.created_at || p.createdAt).toLocaleDateString('de-DE')}
                      </td>
                      <td className="py-3 font-semibold text-secondary-700">
                        {formatCurrency(parseFloat(p.gross_amount || p.amount || p.net_amount || p.total_amount || 0))}
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

      {/* How it works */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-heading font-semibold text-lg text-secondary-700 mb-4">So funktioniert es</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { step: '1', icon: Wallet,   title: 'Provision verdienen',     desc: 'Bei jeder Bestellung über Ihren Empfehlungslink wird die Provision berechnet.' },
            { step: '2', icon: Clock,    title: '14 Tage Wartezeit',        desc: 'Provisionen werden 14 Tage zurückgehalten, danach automatisch freigegeben.' },
            { step: '3', icon: Banknote, title: 'Automatische Auszahlung',  desc: 'Am 1. des Monats überweist Stripe den Betrag direkt auf Ihr Bankkonto.' },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary-100 text-secondary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {step}
              </div>
              <div>
                <p className="font-semibold text-secondary-700 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default PayoutsPage;
