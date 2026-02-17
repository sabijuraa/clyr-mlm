import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Plus, Copy, Trash2, Check, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import api from '../../services/api';
import toast from 'react-hot-toast';

const VouchersPage = () => {
  const { user } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);

  const [form, setForm] = useState({
    code: '',
    type: 'fixed',
    value: '',
    maxUses: '',
    expiresAt: ''
  });

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    try {
      const res = await api.get('/vouchers/my');
      setVouchers(res.data.vouchers || res.data || []);
    } catch (e) {
      console.error('Failed to load vouchers:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const prefix = (user?.referralCode || user?.referral_code || 'CLYR').slice(0, 5);
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    setForm({ ...form, code: `${prefix}-${rand}` });
  };

  const handleCreate = async () => {
    if (!form.code || !form.value) {
      toast.error('Code und Wert sind erforderlich');
      return;
    }
    setCreating(true);
    try {
      await api.post('/vouchers', {
        code: form.code.toUpperCase(),
        discountType: form.type,
        discountValue: parseFloat(form.value),
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt || null
      });
      toast.success('Gutschein erstellt!');
      setShowCreate(false);
      setForm({ code: '', type: 'fixed', value: '', maxUses: '', expiresAt: '' });
      loadVouchers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Gutschein wirklich loeschen?')) return;
    try {
      await api.delete(`/vouchers/${id}`);
      toast.success('Gutschein geloescht');
      loadVouchers();
    } catch (err) {
      toast.error('Fehler beim Loeschen');
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success('Code kopiert!');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-800">Gutscheine / Rabattcodes</h1>
          <p className="text-secondary-500 mt-1">Erstellen Sie Rabattcodes fuer Ihre Kunden</p>
        </div>
        <Button onClick={() => { setShowCreate(!showCreate); if (!form.code) generateCode(); }} icon={Plus}>
          Neuer Gutschein
        </Button>
      </div>

      {/* Info Banner */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">So funktioniert's:</p>
          <p>Sie erstellen einen Rabattcode (z.B. 100€ Rabatt). Wenn ein Kunde diesen Code beim Kauf einloest, zahlt er 100€ weniger. Dieser Betrag wird von Ihrer Provision auf diese Bestellung abgezogen. Das Unternehmen erhaelt den vollen Produktpreis.</p>
        </div>
      </motion.div>

      {/* Create Form */}
      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-700 mb-4">Neuen Gutschein erstellen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-600 mb-1">Code</label>
              <div className="flex gap-2">
                <input type="text" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                  placeholder="z.B. SOMMER2026"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
                <button onClick={generateCode} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition">
                  Generieren
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-600 mb-1">Rabatt-Typ</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="fixed">Festbetrag (€)</option>
                <option value="percentage">Prozent (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-600 mb-1">
                Wert {form.type === 'fixed' ? '(€)' : '(%)'}
              </label>
              <input type="number" min="1" max={form.type === 'fixed' ? 500 : 10} step="1"
                value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder={form.type === 'fixed' ? 'z.B. 100' : 'z.B. 5'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              {form.type === 'fixed' && <p className="text-xs text-secondary-400 mt-1">Max. 500€</p>}
              {form.type === 'percentage' && <p className="text-xs text-secondary-400 mt-1">Max. 10%</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-600 mb-1">Max. Verwendungen</label>
              <input type="number" min="1" value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                placeholder="Unbegrenzt"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-600 mb-1">Gueltig bis</label>
              <input type="date" value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="flex-1 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Der Rabattbetrag wird von Ihrer Provision abgezogen.</span>
            </div>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
              Abbrechen
            </button>
            <Button onClick={handleCreate} loading={creating}>Erstellen</Button>
          </div>
        </motion.div>
      )}

      {/* Vouchers List */}
      {loading ? (
        <div className="text-center py-12 text-secondary-400">Laden...</div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Ticket className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
          <p className="text-secondary-500 font-medium">Noch keine Gutscheine erstellt</p>
          <p className="text-secondary-400 text-sm mt-1">Erstellen Sie Ihren ersten Rabattcode fuer Ihre Kunden.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vouchers.map((v) => {
            const isExpired = v.expires_at && new Date(v.expires_at) < new Date();
            const isMaxed = v.max_uses && v.current_uses >= v.max_uses;
            const isActive = v.is_active && !isExpired && !isMaxed;

            return (
              <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`bg-white rounded-xl border p-4 ${isActive ? 'border-gray-200' : 'border-red-100 bg-red-50/30'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {isActive ? 'Aktiv' : isExpired ? 'Abgelaufen' : isMaxed ? 'Aufgebraucht' : 'Inaktiv'}
                  </span>
                  <button onClick={() => handleDelete(v.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <code className="text-lg font-bold font-mono text-secondary-800">{v.code}</code>
                  <button onClick={() => handleCopy(v.code)}
                    className="p-1 text-gray-400 hover:text-primary-500 transition">
                    {copied === v.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-2xl font-bold text-primary-500 mb-3">
                  {v.type === 'percentage' ? `${v.value}%` : `€${parseFloat(v.value).toFixed(0)}`}
                  <span className="text-sm font-normal text-secondary-400 ml-1">Rabatt</span>
                </div>

                <div className="text-xs text-secondary-500 space-y-1">
                  <p>Verwendet: {v.current_uses || 0}{v.max_uses ? ` / ${v.max_uses}` : ''}</p>
                  {v.expires_at && <p>Gueltig bis: {new Date(v.expires_at).toLocaleDateString('de-DE')}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VouchersPage;
