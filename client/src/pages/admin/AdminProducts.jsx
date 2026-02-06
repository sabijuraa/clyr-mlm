import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { formatPrice } from '../../utils/format';
import { Plus, Edit2, Trash2, Image, X, Save, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const emptyProduct = {
    name: '', sku: '', category_id: '', description_short: '', description_long: '',
    features: '', specifications: '{}', price_at: '', price_de: '', price_ch: '',
    weight_kg: '', warranty_info: '', is_active: true, is_featured: false, has_variants: false, set_includes: ''
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products?limit=100');
      setProducts(data.products || data || []);
    } catch (err) {
      toast.error('Fehler beim Laden der Produkte');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/products/categories/all');
      setCategories(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = () => {
    setEditProduct({ ...emptyProduct });
    setShowForm(true);
  };

  const openEdit = async (id) => {
    try {
      const { data } = await api.get(`/products/${id}`);
      setEditProduct({
        ...data,
        features: Array.isArray(data.features) ? data.features.join('\n') : (data.features || ''),
        specifications: typeof data.specifications === 'object' ? JSON.stringify(data.specifications, null, 2) : (data.specifications || '{}'),
        set_includes: Array.isArray(data.set_includes) ? data.set_includes.join('\n') : (data.set_includes || ''),
      });
      setShowForm(true);
    } catch (err) {
      toast.error('Fehler beim Laden');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editProduct,
        features: editProduct.features ? editProduct.features.split('\n').filter(Boolean) : [],
        specifications: editProduct.specifications ? JSON.parse(editProduct.specifications) : {},
        set_includes: editProduct.set_includes ? editProduct.set_includes.split('\n').filter(Boolean) : [],
        price_at: parseFloat(editProduct.price_at) || 0,
        price_de: parseFloat(editProduct.price_de) || 0,
        price_ch: parseFloat(editProduct.price_ch) || 0,
        weight_kg: parseFloat(editProduct.weight_kg) || null,
      };
      if (editProduct.id) {
        await api.put(`/products/${editProduct.id}`, payload);
        toast.success('Produkt aktualisiert');
      } else {
        await api.post('/products', payload);
        toast.success('Produkt erstellt');
      }
      setShowForm(false);
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Speichern fehlgeschlagen');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Produkt wirklich löschen?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Produkt gelöscht');
      fetchProducts();
    } catch (err) {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const handleImageUpload = async (productId, files) => {
    const formData = new FormData();
    for (const file of files) formData.append('images', file);
    try {
      await api.post(`/products/${productId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Bilder hochgeladen');
      fetchProducts();
    } catch (err) {
      toast.error('Upload fehlgeschlagen');
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await api.delete(`/products/images/${imageId}`);
      toast.success('Bild gelöscht');
      fetchProducts();
    } catch (err) {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  const updateField = (field, value) => {
    setEditProduct(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Laden...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-clyr-dark">Produkte verwalten</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Neues Produkt
        </button>
      </div>

      {/* Product Form Modal */}
      {showForm && editProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">{editProduct.id ? 'Produkt bearbeiten' : 'Neues Produkt'}</h2>
              <button onClick={() => { setShowForm(false); setEditProduct(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input className="input-field" value={editProduct.name} onChange={e => updateField('name', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input className="input-field" value={editProduct.sku} onChange={e => updateField('sku', e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <select className="input-field" value={editProduct.category_id || ''} onChange={e => updateField('category_id', e.target.value)}>
                    <option value="">Keine</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gewicht (kg)</label>
                  <input className="input-field" type="number" step="0.1" value={editProduct.weight_kg || ''} onChange={e => updateField('weight_kg', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kurzbeschreibung</label>
                <input className="input-field" value={editProduct.description_short || ''} onChange={e => updateField('description_short', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Langbeschreibung</label>
                <textarea className="input-field" rows={4} value={editProduct.description_long || ''} onChange={e => updateField('description_long', e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preis AT (€)</label>
                  <input className="input-field" type="number" step="0.01" value={editProduct.price_at || ''} onChange={e => updateField('price_at', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preis DE (€)</label>
                  <input className="input-field" type="number" step="0.01" value={editProduct.price_de || ''} onChange={e => updateField('price_de', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preis CH (CHF)</label>
                  <input className="input-field" type="number" step="0.01" value={editProduct.price_ch || ''} onChange={e => updateField('price_ch', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features (eine pro Zeile)</label>
                <textarea className="input-field" rows={4} value={editProduct.features || ''} onChange={e => updateField('features', e.target.value)}
                  placeholder="9-stufige Filtration&#10;500 GPD Membrane&#10;Direktflow System" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spezifikationen (JSON)</label>
                <textarea className="input-field font-mono text-sm" rows={4} value={editProduct.specifications || '{}'} onChange={e => updateField('specifications', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Set beinhaltet (eine pro Zeile)</label>
                <textarea className="input-field" rows={3} value={editProduct.set_includes || ''} onChange={e => updateField('set_includes', e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Garantie</label>
                <input className="input-field" value={editProduct.warranty_info || ''} onChange={e => updateField('warranty_info', e.target.value)} />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editProduct.is_active} onChange={e => updateField('is_active', e.target.checked)} className="rounded border-gray-300" />
                  <span className="text-sm">Aktiv</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editProduct.is_featured} onChange={e => updateField('is_featured', e.target.checked)} className="rounded border-gray-300" />
                  <span className="text-sm">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editProduct.has_variants} onChange={e => updateField('has_variants', e.target.checked)} className="rounded border-gray-300" />
                  <span className="text-sm">Hat Varianten</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowForm(false); setEditProduct(null); }} className="btn-outline">Abbrechen</button>
                <button type="submit" className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="space-y-3">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {product.images?.[0] ? (
                  <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300"><Image className="w-6 h-6" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-clyr-dark truncate">{product.name}</h3>
                  {!product.is_active && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inaktiv</span>}
                  {product.is_featured && <span className="text-xs bg-clyr-light text-clyr-teal px-2 py-0.5 rounded-full">Featured</span>}
                </div>
                <p className="text-sm text-gray-500">{product.sku} · {formatPrice(product.price_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(product.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => setExpandedId(expandedId === product.id ? null : product.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                  {expandedId === product.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Expanded: Images & Variants */}
            {expandedId === product.id && (
              <div className="border-t px-4 py-4 bg-gray-50 space-y-4">
                {/* Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-600">Bilder ({product.images?.length || 0})</h4>
                    <label className="btn-outline text-xs flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" /> Hochladen
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleImageUpload(product.id, e.target.files)} />
                    </label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {product.images?.map(img => (
                      <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variants */}
                {product.has_variants && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Varianten ({product.variants?.length || 0})</h4>
                    {product.variants?.map(v => (
                      <div key={v.id} className="flex items-center gap-3 py-1.5 text-sm">
                        <span className="font-medium">{v.name}</span>
                        <span className="text-gray-400">{v.sku}</span>
                        <span>{formatPrice(v.price_at)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">Preis AT:</span> <span className="font-medium">{formatPrice(product.price_at)}</span></div>
                  <div><span className="text-gray-500">Preis DE:</span> <span className="font-medium">{formatPrice(product.price_de)}</span></div>
                  <div><span className="text-gray-500">Preis CH:</span> <span className="font-medium">{formatPrice(product.price_ch, 'CHF')}</span></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
