// client/src/pages/dashboard/CompliancePage.jsx
// GROUP 10: #50 Termination, #52 Marketplace warning, #55 Intranet fee
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Calendar, CreditCard, ShieldAlert, FileText, CheckCircle, Clock, XCircle, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

const CompliancePage = () => {
  const [termination, setTermination] = useState(null);
  const [feeStatus, setFeeStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [showTermForm, setShowTermForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [termRes, feeRes] = await Promise.allSettled([
        fetch('/api/compliance/termination/status', { headers }),
        fetch('/api/compliance/intranet-fee/status', { headers }),
      ]);
      if (termRes.status === 'fulfilled' && termRes.value.ok) {
        const d = await termRes.value.json();
        setTermination(d.termination);
      }
      if (feeRes.status === 'fulfilled' && feeRes.value.ok) {
        const d = await feeRes.value.json();
        setFeeStatus(d);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const submitTermination = async () => {
    if (!confirm('Sind Sie sicher, dass Sie Ihren Partnervertrag kuendigen moechten? Es gilt eine 3-monatige Kuendigungsfrist.')) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/compliance/termination/request', {
        method: 'POST', headers, body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        loadData();
        setShowTermForm(false);
      } else { toast.error(data.error); }
    } catch (e) { toast.error('Fehler'); }
    finally { setSubmitting(false); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '-';

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-secondary-200 border-t-secondary-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-secondary-700">Vertrag & Compliance</h1>
        <p className="text-secondary-500">Vertragsinformationen, Gebuehren und Richtlinien</p>
      </div>

      {/* #52: Marketplace Restriction Warning */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 rounded-2xl border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <Ban className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-800">Marktplatz-Verbot</h2>
            <p className="text-red-700 mt-2 leading-relaxed">
              Der Verkauf von CLYR-Produkten auf Online-Marktplaetzen wie <strong>eBay</strong>, <strong>Amazon</strong>, <strong>Willhaben</strong> und 
              aehnlichen Plattformen ist <strong>strengstens untersagt</strong>.
            </p>
            <p className="text-red-600 text-sm mt-2">
              Verstoesse fuehren zur sofortigen Kuendigung des Partnervertrags und koennen rechtliche Konsequenzen nach sich ziehen.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {['eBay', 'Amazon', 'Willhaben', 'Shpock', 'Kleinanzeigen'].map(platform => (
                <span key={platform} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                  <XCircle className="w-3.5 h-3.5" />{platform}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* #55: Intranet Fee Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-secondary-700">Intranet-Gebuehr</h2>
            <p className="text-sm text-secondary-500">Jaehrliche Partnergebuer: EUR {feeStatus?.feeAmount || 100},00</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">Status</p>
            <div className="flex items-center gap-2 mt-1">
              {feeStatus?.isActive ? (
                <><CheckCircle className="w-5 h-5 text-green-500" /><span className="font-semibold text-green-700">Aktiv</span></>
              ) : (
                <><AlertTriangle className="w-5 h-5 text-amber-500" /><span className="font-semibold text-amber-700">Ausstehend</span></>
              )}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">Bezahlt bis</p>
            <p className="font-semibold text-secondary-700 mt-1">{fmt(feeStatus?.paidUntil)}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">Letzte Zahlung</p>
            <p className="font-semibold text-secondary-700 mt-1">{fmt(feeStatus?.lastPayment)}</p>
          </div>
        </div>
        {!feeStatus?.isActive && (
          <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-sm text-amber-700">
              <strong>Hinweis:</strong> Ihre Intranet-Gebuehr ist nicht bezahlt. Bitte ueberweisen Sie EUR {feeStatus?.feeAmount || 100},00 
              an CLYR Solutions GmbH, um Ihren Partnerstatus aktiv zu halten. Bei Nichtzahlung wird Ihr Konto auf passiv gestellt.
            </p>
          </div>
        )}
        {feeStatus?.payments?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Zahlungsverlauf</h4>
            <div className="space-y-2">
              {feeStatus.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">{fmt(p.period_start)} - {fmt(p.period_end)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-medium">EUR {Number(p.amount).toFixed(2)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.status === 'paid' ? 'Bezahlt' : p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Legal Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
          <h2 className="text-lg font-semibold text-secondary-700">Rechtliche Hinweise</h2>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <p>Es gilt <strong>oesterreichisches Recht</strong>. Gerichtsstand ist <strong>Villach, Oesterreich</strong>.</p>
          <p>Die Kuendigungsfrist betraegt <strong>3 Monate</strong> zum Ende eines Kalendermonats.</p>
          <p>Bei Inaktivitaet von 12 Monaten (keine Verkaeufe) wird der Partnervertrag automatisch beendet.</p>
          <p>Die jaehrliche Intranet-Gebuehr von EUR 100,00 ist im Voraus faellig. Bei Nichtzahlung wird der Account auf passiv gestellt.</p>
        </div>
      </motion.div>

      {/* #50: Termination */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-secondary-700">Vertragsbeendigung</h2>
        </div>

        {termination && termination.status === 'pending' ? (
          <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-800">Kuendigung eingereicht</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <p className="text-amber-600">Eingereicht am:</p>
                <p className="font-medium text-amber-800">{fmt(termination.requested_at)}</p>
              </div>
              <div>
                <p className="text-amber-600">Wirksam ab:</p>
                <p className="font-medium text-amber-800">{fmt(termination.effective_date)}</p>
              </div>
            </div>
            {termination.reason && (
              <p className="text-sm text-amber-700 mt-3">Grund: {termination.reason}</p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Sie koennen Ihren Partnervertrag mit einer Kuendigungsfrist von <strong>3 Monaten</strong> beenden.
              Waehrend der Kuendigungsfrist bleiben alle Rechte und Pflichten bestehen.
            </p>
            {!showTermForm ? (
              <button onClick={() => setShowTermForm(true)}
                className="text-sm text-red-500 hover:text-red-600 underline">
                Vertrag kuendigen...
              </button>
            ) : (
              <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-4">
                <p className="text-sm text-red-700 font-medium">
                  Sind Sie sicher? Ihre Kuendigung wird nach Ablauf der 3-monatigen Frist wirksam.
                </p>
                <div>
                  <label className="block text-sm font-medium text-red-800 mb-1">Kuendigungsgrund (optional)</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm"
                    placeholder="Warum moechten Sie kuendigen?" />
                </div>
                <div className="flex gap-3">
                  <button onClick={submitTermination} disabled={submitting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
                    {submitting ? 'Wird eingereicht...' : 'Kuendigung einreichen'}
                  </button>
                  <button onClick={() => setShowTermForm(false)}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CompliancePage;
