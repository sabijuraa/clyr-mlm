import { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Save, X, Check, Package, Layers, Link2, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const TYPE_LABELS = {
  faucet: 'Armatur', color: 'Farbe', aroma: 'Aroma/Duft',
  size: 'Größe', material: 'Material', style: 'Stil'
};
const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));

export default function AdminVariantsPage() {
  const [allOptions, setAllOptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newOpt, setNewOpt] = useState({ type: 'faucet', name: '', name_en: '', price_modifier: 0 });
  const [selectedProduct, setSelectedProduct] = useState('');
  const [tab, setTab] = useState('options'); // 'options' | 'assign'

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [optRes, prodRes] = await Promise.all([
        api.get('/variants/options'),
        api.get('/products')
      ]);
      const optData = optRes.data;
      // Flatten grouped or use all array
      let opts = optData.all || [];
      if (!opts.length && optData.options) {
        opts = Object.values(optData.options).flat();
      }
      setAllOptions(Array.isArray(opts) ? opts : []);
      const prods = prodRes.data?.products || prodRes.data || [];
      setProducts(Array.isArray(prods) ? prods : []);

      // Load assignments for each product
      const aMap = {};
      for (const p of (Array.isArray(prods) ? prods : [])) {
        try {
          const r = await api.get(`/variants/product/${p.id}/options`);
          const pvs = r.data?.variants || r.data || [];
          aMap[p.id] = Array.isArray(pvs) ? pvs : [];
        } catch { aMap[p.id] = []; }
      }
      setAssignments(aMap);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newOpt.name) return toast.error('Name ist erforderlich');
    try {
      await api.post('/variants/options', newOpt);
      toast.success('Variante erstellt');
      setNewOpt({ type: 'faucet', name: '', name_en: '', price_modifier: 0 });
      setShowCreate(false);
      fetchAll();
    } catch (e) { toast.error('Fehler: ' + (e.response?.data?.error || e.message)); }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/variants/options/${editingId}`, editForm);
      toast.success('Gespeichert');
      setEditingId(null);
      fetchAll();
    } catch (e) { toast.error('Fehler'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Variante loeschen?')) return;
    try {
      await api.delete(`/variants/options/${id}`);
      toast.success('Geloescht');
      fetchAll();
    } catch (e) { toast.error('Kann nicht geloescht werden (wird verwendet)'); }
  };

  const handleAssign = async (productId, optionId) => {
    try {
      await api.post('/variants/assign', { productId: parseInt(productId), optionId: parseInt(optionId), isDefault: false });
      toast.success('Zugewiesen');
      fetchAll();
    } catch (e) { toast.error('Fehler: ' + (e.response?.data?.error || e.message)); }
  };

  const handleUnassign = async (productId, optionId) => {
    try {
      await api.delete(`/variants/product/${productId}/option/${optionId}`);
      toast.success('Entfernt');
      fetchAll();
    } catch (e) { toast.error('Fehler'); }
  };

  const fmt = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);
  const grouped = allOptions.reduce((acc, o) => { (acc[o.type] = acc[o.type] || []).push(o); return acc; }, {});

  if (loading) return <div className="p-6 text-center text-gray-400">Laden...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produktvarianten</h1>
          <p className="text-gray-500 mt-1">Armaturen, Farben, Aromen fuer Produkte verwalten</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium">
          <Plus className="w-4 h-4" /> Neue Variante
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {[['options', 'Alle Varianten'], ['assign', 'Zu Produkten zuweisen']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === k ? 'bg-white border border-b-white border-gray-200 text-gray-900 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* CREATE FORM */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Neue Variante erstellen</h3>
            <button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
              <select value={newOpt.type} onChange={e => setNewOpt({ ...newOpt, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name (DE) *</label>
              <input value={newOpt.name} onChange={e => setNewOpt({ ...newOpt, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="z.B. Spiralfeder Schwarz" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name (EN)</label>
              <input value={newOpt.name_en} onChange={e => setNewOpt({ ...newOpt, name_en: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preisaufschlag</label>
              <input type="number" step="0.01" value={newOpt.price_modifier}
                onChange={e => setNewOpt({ ...newOpt, price_modifier: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <button onClick={handleCreate}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
            <Save className="w-4 h-4" /> Erstellen
          </button>
        </div>
      )}

      {/* TAB: ALL OPTIONS */}
      {tab === 'options' && (
        <div className="space-y-6">
          {Object.entries(grouped).length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Noch keine Varianten. Klicken Sie oben auf "Neue Variante".</p>
            </div>
          ) : Object.entries(grouped).map(([type, opts]) => (
            <div key={type} className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-500" />
                <h3 className="font-semibold text-gray-900">{TYPE_LABELS[type] || type}</h3>
                <span className="text-xs text-gray-400 ml-auto">{opts.length} Optionen</span>
              </div>
              <div className="divide-y divide-gray-50">
                {opts.map(opt => (
                  <div key={opt.id} className="px-5 py-3 flex items-center gap-4">
                    {editingId === opt.id ? (
                      <>
                        <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="flex-1 px-2 py-1 border rounded text-sm" />
                        <input value={editForm.name_en || ''} onChange={e => setEditForm({ ...editForm, name_en: e.target.value })}
                          className="w-32 px-2 py-1 border rounded text-sm" placeholder="EN" />
                        <input type="number" step="0.01" value={editForm.price_modifier}
                          onChange={e => setEditForm({ ...editForm, price_modifier: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 border rounded text-sm" />
                        <button onClick={handleUpdate} className="p-1.5 bg-green-100 rounded-lg"><Check className="w-4 h-4 text-green-600" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium text-gray-800">{opt.name}</span>
                        {opt.name_en && <span className="text-xs text-gray-400">{opt.name_en}</span>}
                        {parseFloat(opt.price_modifier) > 0 && <span className="text-xs text-green-600 font-medium">+{fmt(opt.price_modifier)}</span>}
                        <button onClick={() => { setEditingId(opt.id); setEditForm({ name: opt.name, name_en: opt.name_en, price_modifier: opt.price_modifier }); }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit3 className="w-4 h-4 text-gray-400" /></button>
                        <button onClick={() => handleDelete(opt.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: ASSIGN TO PRODUCTS */}
      {tab === 'assign' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Produkt auswaehlen</label>
            <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="">-- Alle Produkte --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({fmt(p.price)})</option>
              ))}
            </select>
          </div>

          {/* Show per-product assignment cards */}
          {(selectedProduct ? products.filter(p => String(p.id) === selectedProduct) : products).map(product => {
            const assigned = assignments[product.id] || [];
            const assignedOptionIds = assigned.map(a => a.option_id || a.id);
            return (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-5 h-5 text-primary-500" />
                  <h4 className="font-semibold text-gray-900">{product.name}</h4>
                  <span className="text-xs text-gray-400">{fmt(product.price)}</span>
                  <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full ml-auto">
                    {assigned.length} Varianten
                  </span>
                </div>

                {/* Currently assigned */}
                {assigned.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Zugewiesen:</p>
                    <div className="flex flex-wrap gap-2">
                      {assigned.map(a => (
                        <span key={a.id || a.option_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-800">{a.name || a.option_name}</span>
                          {parseFloat(a.price_modifier) > 0 && <span className="text-xs text-green-600">+{fmt(a.price_modifier)}</span>}
                          <button onClick={() => handleUnassign(product.id, a.option_id || a.id)}
                            className="ml-1 p-0.5 hover:bg-red-100 rounded"><X className="w-3 h-3 text-red-500" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available to assign */}
                {allOptions.filter(o => !assignedOptionIds.includes(o.id)).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Verfuegbar zum Zuweisen:</p>
                    <div className="flex flex-wrap gap-2">
                      {allOptions.filter(o => !assignedOptionIds.includes(o.id)).map(opt => (
                        <button key={opt.id} onClick={() => handleAssign(product.id, opt.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-primary-50 hover:border-primary-300 transition">
                          <Plus className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-700">{opt.name}</span>
                          <span className="text-xs text-gray-400">({TYPE_LABELS[opt.type] || opt.type})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h4 className="font-semibold text-blue-900 mb-2">So funktionieren Varianten</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal pl-4">
          <li><strong>Variante erstellen:</strong> Oben "Neue Variante" klicken, Typ + Name eingeben</li>
          <li><strong>Zu Produkt zuweisen:</strong> Tab "Zu Produkten zuweisen", Produkt waehlen, dann auf die Variante klicken</li>
          <li><strong>Kunden sehen:</strong> Im Shop koennen Kunden die Varianten beim Produkt auswaehlen</li>
          <li><strong>Preisaufschlag:</strong> Wird automatisch zum Grundpreis addiert</li>
        </ol>
      </div>
    </div>
  );
}
