// client/src/pages/admin/AdminVariantsPage.jsx
import { useState, useEffect } from 'react';
import { Package, Plus, Edit3, Trash2, Save, X, Upload, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function AdminVariantsPage() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);

  const emptyGroupForm = {
    name: '',
    display_name: '',
    description: '',
    is_required: true,
    sort_order: 0
  };

  const emptyOptionForm = {
    name: '',
    display_name: '',
    description: '',
    price_modifier: 0,
    sku_suffix: '',
    stock_quantity: 0,
    is_available: true,
    is_default: false,
    sort_order: 0,
    image_url: ''
  };

  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [optionForm, setOptionForm] = useState(emptyOptionForm);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadVariants(selectedProduct.id);
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.products || response.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Fehler beim Laden der Produkte');
    } finally {
      setLoading(false);
    }
  };

  const loadVariants = async (productId) => {
    try {
      const response = await api.get(`/variants/products/${productId}/variants`);
      setVariants(response.data.groups || []);
    } catch (error) {
      console.error('Error loading variants:', error);
      toast.error('Fehler beim Laden der Varianten');
    }
  };

  // Variant Group Functions
  const handleSaveGroup = async () => {
    if (!groupForm.name || !groupForm.display_name) {
      return toast.error('Name und Anzeigename sind erforderlich');
    }

    try {
      if (editingGroup) {
        await api.put(
          `/variants/admin/products/${selectedProduct.id}/variants/${editingGroup}`,
          groupForm
        );
        toast.success('Variantengruppe aktualisiert');
      } else {
        await api.post(
          `/variants/admin/products/${selectedProduct.id}/variants`,
          groupForm
        );
        toast.success('Variantengruppe erstellt');
      }
      setShowGroupForm(false);
      setEditingGroup(null);
      setGroupForm(emptyGroupForm);
      loadVariants(selectedProduct.id);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleEditGroup = (group) => {
    setGroupForm({
      name: group.name,
      display_name: group.display_name,
      description: group.description || '',
      is_required: group.is_required,
      sort_order: group.sort_order || 0
    });
    setEditingGroup(group.id);
    setShowGroupForm(true);
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm('Diese Variantengruppe wirklich löschen? Alle zugehörigen Optionen werden ebenfalls gelöscht.')) {
      return;
    }

    try {
      await api.delete(`/variants/admin/products/${selectedProduct.id}/variants/${groupId}`);
      toast.success('Variantengruppe gelöscht');
      loadVariants(selectedProduct.id);
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Variant Option Functions
  const handleSaveOption = async () => {
    if (!optionForm.name || !optionForm.display_name) {
      return toast.error('Name und Anzeigename sind erforderlich');
    }

    try {
      if (editingOption) {
        await api.put(
          `/variants/admin/products/${selectedProduct.id}/variants/${activeGroup}/options/${editingOption}`,
          optionForm
        );
        toast.success('Variantenoption aktualisiert');
      } else {
        await api.post(
          `/variants/admin/products/${selectedProduct.id}/variants/${activeGroup}/options`,
          optionForm
        );
        toast.success('Variantenoption erstellt');
      }
      setShowOptionForm(false);
      setEditingOption(null);
      setOptionForm(emptyOptionForm);
      loadVariants(selectedProduct.id);
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleEditOption = (option, groupId) => {
    setOptionForm({
      name: option.name,
      display_name: option.display_name,
      description: option.description || '',
      price_modifier: option.price_modifier || 0,
      sku_suffix: option.sku_suffix || '',
      stock_quantity: option.stock_quantity || 0,
      is_available: option.is_available,
      is_default: option.is_default,
      sort_order: option.sort_order || 0,
      image_url: option.image_url || ''
    });
    setEditingOption(option.id);
    setActiveGroup(groupId);
    setShowOptionForm(true);
  };

  const handleDeleteOption = async (groupId, optionId) => {
    if (!confirm('Diese Variantenoption wirklich löschen?')) return;

    try {
      await api.delete(
        `/variants/admin/products/${selectedProduct.id}/variants/${groupId}/options/${optionId}`
      );
      toast.success('Variantenoption gelöscht');
      loadVariants(selectedProduct.id);
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  if (loading) return <div className="p-6">Laden...</div>;

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produktvarianten Verwaltung</h1>
        <p className="text-gray-500 mt-1">Varianten für Produkte erstellen und verwalten</p>
      </div>

      {/* Product Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Produkt auswählen</label>
        <select
          value={selectedProduct?.id || ''}
          onChange={(e) => {
            const product = products.find(p => p.id === parseInt(e.target.value));
            setSelectedProduct(product);
          }}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Produkt wählen --</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku})
              {product.has_variants && ' ✓'}
            </option>
          ))}
        </select>
      </div>

      {selectedProduct && (
        <>
          {/* Add Variant Group Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Varianten für: {selectedProduct.name}
            </h2>
            <button
              onClick={() => {
                setGroupForm(emptyGroupForm);
                setEditingGroup(null);
                setShowGroupForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Variantengruppe hinzufügen
            </button>
          </div>

          {/* Group Form Modal */}
          {showGroupForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {editingGroup ? 'Variantengruppe bearbeiten' : 'Neue Variantengruppe'}
                </h3>
                <button onClick={() => { setShowGroupForm(false); setEditingGroup(null); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interner Name *</label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="z.B. faucet_type"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename *</label>
                  <input
                    type="text"
                    value={groupForm.display_name}
                    onChange={(e) => setGroupForm({ ...groupForm, display_name: e.target.value })}
                    placeholder="z.B. Wasserhahn-Typ"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="Optional: Beschreibung dieser Variantengruppe"
                />
              </div>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={groupForm.is_required}
                    onChange={(e) => setGroupForm({ ...groupForm, is_required: e.target.checked })}
                    className="rounded"
                  />
                  Auswahl erforderlich
                </label>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sortierung</label>
                  <input
                    type="number"
                    value={groupForm.sort_order}
                    onChange={(e) => setGroupForm({ ...groupForm, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveGroup}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                >
                  <Save className="w-4 h-4" /> Speichern
                </button>
                <button
                  onClick={() => { setShowGroupForm(false); setEditingGroup(null); }}
                  className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Option Form Modal */}
          {showOptionForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {editingOption ? 'Variantenoption bearbeiten' : 'Neue Variantenoption'}
                </h3>
                <button onClick={() => { setShowOptionForm(false); setEditingOption(null); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interner Name *</label>
                  <input
                    type="text"
                    value={optionForm.name}
                    onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                    placeholder="z.B. l-auslauf"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename *</label>
                  <input
                    type="text"
                    value={optionForm.display_name}
                    onChange={(e) => setOptionForm({ ...optionForm, display_name: e.target.value })}
                    placeholder="z.B. L-Auslauf"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preisänderung (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={optionForm.price_modifier}
                    onChange={(e) => setOptionForm({ ...optionForm, price_modifier: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU-Suffix</label>
                  <input
                    type="text"
                    value={optionForm.sku_suffix}
                    onChange={(e) => setOptionForm({ ...optionForm, sku_suffix: e.target.value })}
                    placeholder="-LA"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lagerbestand</label>
                  <input
                    type="number"
                    value={optionForm.stock_quantity}
                    onChange={(e) => setOptionForm({ ...optionForm, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bild-URL</label>
                <input
                  type="text"
                  value={optionForm.image_url}
                  onChange={(e) => setOptionForm({ ...optionForm, image_url: e.target.value })}
                  placeholder="/images/products/variant-image.png"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={optionForm.is_available}
                    onChange={(e) => setOptionForm({ ...optionForm, is_available: e.target.checked })}
                    className="rounded"
                  />
                  Verfügbar
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={optionForm.is_default}
                    onChange={(e) => setOptionForm({ ...optionForm, is_default: e.target.checked })}
                    className="rounded"
                  />
                  Standard
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveOption}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                >
                  <Save className="w-4 h-4" /> Speichern
                </button>
                <button
                  onClick={() => { setShowOptionForm(false); setEditingOption(null); }}
                  className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Variant Groups List */}
          {variants.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Noch keine Variantengruppen. Erstellen Sie die erste oben.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map(group => (
                <div key={group.id} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{group.display_name}</h3>
                      <p className="text-sm text-gray-500">ID: {group.name}</p>
                      {group.description && <p className="text-sm text-gray-600 mt-1">{group.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="p-1.5 rounded-lg hover:bg-gray-100"
                        title="Bearbeiten"
                      >
                        <Edit3 className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Optionen:</span>
                      <button
                        onClick={() => {
                          setOptionForm(emptyOptionForm);
                          setEditingOption(null);
                          setActiveGroup(group.id);
                          setShowOptionForm(true);
                        }}
                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      >
                        + Option hinzufügen
                      </button>
                    </div>

                    {group.options && group.options.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-3">
                        {group.options.map(option => (
                          <div key={option.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{option.display_name}</span>
                                  {option.is_default && (
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                                      Standard
                                    </span>
                                  )}
                                  {!option.is_available && (
                                    <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-xs">
                                      Nicht verfügbar
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">ID: {option.name}</p>
                                {option.price_modifier !== 0 && (
                                  <p className="text-sm text-gray-700 mt-1">
                                    Preis: {option.price_modifier > 0 ? '+' : ''}€{option.price_modifier.toFixed(2)}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">Lager: {option.stock_quantity}</p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditOption(option, group.id)}
                                  className="p-1 rounded hover:bg-gray-100"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                                </button>
                                <button
                                  onClick={() => handleDeleteOption(group.id, option.id)}
                                  className="p-1 rounded hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">
                        Keine Optionen vorhanden
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
