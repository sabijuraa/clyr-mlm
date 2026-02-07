import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Search, Plus, Edit, Trash2, Eye, CheckCircle, XCircle,
  Image, Tag, DollarSign, Layers, Upload, X, Save, Star, StarOff
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';
import { productsAPI } from '../../services/api';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';

const AdminProductsPage = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});

  // Form state
  const [form, setForm] = useState({
    name: '', name_en: '', description: '', description_en: '',
    short_description: '', price: '', original_price: '', cost_price: '',
    category_id: '', stock: '0', sku: '',
    product_type: 'physical', is_featured: false, is_new: false, is_active: true
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes, statsRes] = await Promise.all([
        productsAPI.getAllAdmin(),
        productsAPI.getCategories(),
        productsAPI.getStats().catch(() => ({ data: {} }))
      ]);
      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Load products error:', err);
      setError('Fehler beim Laden der Produkte');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || 
      String(p.category_id) === categoryFilter || 
      p.category_slug === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Open create/edit modal
  const openEdit = (product) => {
    setForm({
      name: product.name || '', name_en: product.name_en || '',
      description: product.description || '', description_en: product.description_en || '',
      short_description: product.short_description || '',
      price: product.price || '', original_price: product.original_price || '',
      cost_price: product.cost_price || '',
      category_id: product.category_id || '', stock: product.stock || 0,
      sku: product.sku || '', product_type: product.product_type || 'physical',
      is_featured: product.is_featured || false, is_new: product.is_new || false,
      is_active: product.is_active !== false
    });
    setImagePreview(product.images || []);
    setImageFiles([]);
    setEditingProduct(product);
    setError('');
  };

  const openCreate = () => {
    setForm({
      name: '', name_en: '', description: '', description_en: '',
      short_description: '', price: '', original_price: '', cost_price: '',
      category_id: '', stock: '0', sku: '',
      product_type: 'physical', is_featured: false, is_new: false, is_active: true
    });
    setImageFiles([]);
    setImagePreview([]);
    setEditingProduct(null);
    setShowCreateModal(true);
    setError('');
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    const existingCount = editingProduct?.images?.length || 0;
    if (index < existingCount) {
      setImagePreview(prev => prev.filter((_, i) => i !== index));
    } else {
      const fileIndex = index - existingCount;
      setImageFiles(prev => prev.filter((_, i) => i !== fileIndex));
      setImagePreview(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          formData.append(key, val);
        }
      });
      imageFiles.forEach(file => formData.append('images', file));

      // When editing, send the kept existing image URLs so backend can preserve them
      if (editingProduct) {
        const existingImages = imagePreview.filter(img => typeof img === 'string' && !img.startsWith('data:'));
        formData.append('existing_images', JSON.stringify(existingImages));
        await productsAPI.update(editingProduct.id, formData);
      } else {
        await productsAPI.create(formData);
      }

      setShowCreateModal(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Toggle actions
  const toggleActive = async (id) => {
    try {
      await productsAPI.toggleActive(id);
      await loadProducts();
    } catch (err) { console.error('Toggle error:', err); }
  };

  const toggleFeatured = async (id) => {
    try {
      await productsAPI.toggleFeatured(id);
      await loadProducts();
    } catch (err) { console.error('Toggle error:', err); }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Produkt wirklich löschen?')) return;
    try {
      await productsAPI.delete(id);
      await loadProducts();
    } catch (err) { console.error('Delete error:', err); }
  };

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const lowStockProducts = products.filter(p => p.stock !== null && p.stock < 10).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">Produkte verwalten</h1>
          <p className="text-secondary-500">Alle Produkte im Shop</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Neues Produkt</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-700">{totalProducts}</p>
              <p className="text-sm text-secondary-500">Produkte gesamt</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-700">{activeProducts}</p>
              <p className="text-sm text-secondary-500">Aktiv</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
              <Layers className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-700">{lowStockProducts}</p>
              <p className="text-sm text-secondary-500">Niedriger Bestand</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Produkt suchen..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-500" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                categoryFilter === 'all' ? 'bg-secondary-100 text-secondary-700' : 'bg-gray-100 text-secondary-500 hover:bg-gray-200'}`}>
              Alle
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setCategoryFilter(String(cat.id))}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  categoryFilter === String(cat.id) ? 'bg-secondary-100 text-secondary-700' : 'bg-gray-100 text-secondary-500 hover:bg-gray-200'}`}>
                {cat.name} ({cat.product_count || 0})
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Products Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group">
            <div className="relative aspect-square bg-gray-100">
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-12 h-12 text-gray-300" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {product.is_new && <span className="px-2 py-1 bg-secondary-700 text-white text-xs font-bold rounded-lg">NEU</span>}
                {!product.is_active && <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">Inaktiv</span>}
                {product.stock === 0 && <span className="px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded-lg">Ausverkauft</span>}
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                <button className="p-2 bg-white rounded-lg text-secondary-700 hover:bg-slate-50" onClick={() => openEdit(product)}>
                  <Edit className="w-5 h-5" />
                </button>
                <button className="p-2 bg-white rounded-lg text-secondary-700 hover:bg-slate-50" onClick={() => toggleFeatured(product.id)}>
                  {product.is_featured ? <StarOff className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                </button>
                <button className="p-2 bg-white rounded-lg text-secondary-700 hover:bg-slate-50" onClick={() => toggleActive(product.id)}>
                  {product.is_active ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                </button>
                <button className="p-2 bg-white rounded-lg text-red-500 hover:bg-gray-100" onClick={() => deleteProduct(product.id)}>
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary-400 uppercase">{product.category_name || 'Ohne Kategorie'}</span>
                <span className={`w-2 h-2 rounded-full ${product.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
              <h3 className="font-semibold text-secondary-700 mb-2 line-clamp-1">{product.name}</h3>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-secondary-700">{formatCurrency(product.price)}</span>
                  {product.original_price && (
                    <span className="text-sm text-gray-400 line-through ml-2">{formatCurrency(product.original_price)}</span>
                  )}
                </div>
                <p className={`text-sm font-medium ${product.stock < 10 ? 'text-red-500' : 'text-secondary-500'}`}>
                  {product.stock ?? '∞'} auf Lager
                </p>
              </div>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-secondary-500">Keine Produkte gefunden</p>
          </div>
        )}
      </motion.div>

      {/* Create/Edit Modal */}
      <Modal isOpen={showCreateModal || !!editingProduct}
        onClose={() => { setShowCreateModal(false); setEditingProduct(null); }}
        title={editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Produktbilder</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {imagePreview.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-secondary-400">
                <Upload className="w-6 h-6 text-gray-400" />
                <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Produktname *</label>
              <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-secondary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Kategorie</label>
              <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-secondary-500">
                <option value="">Keine Kategorie</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Preis (€ netto) *</label>
              <input type="number" step="0.01" required value={form.price}
                onChange={e => setForm({...form, price: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-secondary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Streichpreis (€)</label>
              <input type="number" step="0.01" value={form.original_price}
                onChange={e => setForm({...form, original_price: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-secondary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Lagerbestand</label>
              <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-secondary-500" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">SKU</label>
              <input type="text" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-secondary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Produkttyp</label>
              <select value={form.product_type} onChange={e => setForm({...form, product_type: e.target.value})}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-secondary-500">
                <option value="physical">Physisch</option>
                <option value="digital">Digital</option>
                <option value="service">Dienstleistung</option>
                <option value="subscription">Abonnement</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Kurzbeschreibung</label>
            <input type="text" value={form.short_description}
              onChange={e => setForm({...form, short_description: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-secondary-500"
              placeholder="Kurze Zusammenfassung..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Beschreibung</label>
            <textarea rows={4} value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-secondary-500 resize-none"
              placeholder="Ausführliche Produktbeschreibung..." />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                onChange={e => setForm({...form, is_active: e.target.checked})}
                className="w-5 h-5 rounded border-gray-300 text-primary-400" />
              <span className="text-secondary-700">Aktiv</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_featured}
                onChange={e => setForm({...form, is_featured: e.target.checked})}
                className="w-5 h-5 rounded border-gray-300 text-primary-400" />
              <span className="text-secondary-700">Empfohlen</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_new}
                onChange={e => setForm({...form, is_new: e.target.checked})}
                className="w-5 h-5 rounded border-gray-300 text-primary-400" />
              <span className="text-secondary-700">Neu</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost"
              onClick={() => { setShowCreateModal(false); setEditingProduct(null); }}>
              Abbrechen
            </Button>
            <Button type="submit" className="flex-1" icon={saving ? null : (editingProduct ? Save : Plus)}
              disabled={saving}>
              {saving ? 'Speichere...' : (editingProduct ? 'Speichern' : 'Produkt erstellen')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminProductsPage;
