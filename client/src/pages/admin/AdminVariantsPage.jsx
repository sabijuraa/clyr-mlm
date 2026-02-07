import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Layers, Plus, Edit3, Trash2, Save, X, Check, 
  Package, DollarSign, Image, GripVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminVariantsPage = () => {
  const [options, setOptions] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOption, setEditingOption] = useState(null);
  const [newOption, setNewOption] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch variant options
      const optionsRes = await fetch('/api/variants/options', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const optionsData = await optionsRes.json();
      setOptions(optionsData.options || {});
      
      // Fetch products
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      setProducts(productsData.products || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOption = async () => {
    if (!newOption?.name || !newOption?.type) {
      toast.error('Name und Typ erforderlich');
      return;
    }
    
    try {
      const response = await fetch('/api/variants/options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newOption)
      });
      
      if (response.ok) {
        toast.success('Variante erstellt');
        setNewOption(null);
        fetchData();
      } else {
        throw new Error('Create failed');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleUpdateOption = async (option) => {
    try {
      const response = await fetch(`/api/variants/options/${option.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(option)
      });
      
      if (response.ok) {
        toast.success('Gespeichert');
        setEditingOption(null);
        fetchData();
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleAssignToProduct = async (productId, optionId, isDefault = false) => {
    try {
      const response = await fetch('/api/variants/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ productId, optionId, isDefault })
      });
      
      if (response.ok) {
        toast.success('Variante zugewiesen');
        fetchData();
      }
    } catch (error) {
      toast.error('Fehler beim Zuweisen');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const variantTypes = Object.keys(options);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Produktvarianten
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Varianten wie Armatur-Typen, Aromen, Farben
          </p>
        </div>
        <button
          onClick={() => setNewOption({ type: 'faucet', name: '', name_en: '', price_modifier: 0 })}
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition"
        >
          <Plus className="w-5 h-5" />
          Neue Variante
        </button>
      </div>

      {/* New Option Form */}
      {newOption && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Neue Variante erstellen</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
              <select
                value={newOption.type}
                onChange={(e) => setNewOption({ ...newOption, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="faucet">Armatur</option>
                <option value="aroma">Aroma</option>
                <option value="color">Farbe</option>
                <option value="size">Größe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (DE)</label>
              <input
                type="text"
                value={newOption.name}
                onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                placeholder="z.B. Premium Armatur"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name (EN)</label>
              <input
                type="text"
                value={newOption.name_en || ''}
                onChange={(e) => setNewOption({ ...newOption, name_en: e.target.value })}
                placeholder="e.g. Premium Faucet"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preisaufschlag</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                <input
                  type="number"
                  step="0.01"
                  value={newOption.price_modifier}
                  onChange={(e) => setNewOption({ ...newOption, price_modifier: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <input
              type="text"
              value={newOption.description || ''}
              onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
              placeholder="Kurze Beschreibung der Variante"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setNewOption(null)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreateOption}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <Save className="w-5 h-5" />
              Erstellen
            </button>
          </div>
        </motion.div>
      )}

      {/* Variant Types */}
      {variantTypes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Varianten vorhanden</h3>
          <p className="text-gray-600">Erstellen Sie die erste Produktvariante.</p>
        </div>
      ) : (
        variantTypes.map((type) => (
          <div key={type} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {type === 'faucet' ? '🚰 Armatur-Typen' : 
                 type === 'aroma' ? '🌸 Aromen' : 
                 type === 'color' ? '🎨 Farben' : 
                 type === 'size' ? '📏 Größen' : type}
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {options[type].map((option) => (
                <div key={option.id} className="p-4 hover:bg-gray-50">
                  {editingOption?.id === option.id ? (
                    <div className="grid md:grid-cols-5 gap-4 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Name (DE)</label>
                        <input
                          type="text"
                          value={editingOption.name}
                          onChange={(e) => setEditingOption({ ...editingOption, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Name (EN)</label>
                        <input
                          type="text"
                          value={editingOption.name_en || ''}
                          onChange={(e) => setEditingOption({ ...editingOption, name_en: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Beschreibung</label>
                        <input
                          type="text"
                          value={editingOption.description || ''}
                          onChange={(e) => setEditingOption({ ...editingOption, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Aufschlag (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingOption.price_modifier}
                          onChange={(e) => setEditingOption({ ...editingOption, price_modifier: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateOption(editingOption)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingOption(null)}
                          className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{option.name}</p>
                          <p className="text-sm text-gray-500">{option.description || option.name_en}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          option.price_modifier > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {option.price_modifier > 0 ? `+${formatCurrency(option.price_modifier)}` : 'Inkl.'}
                        </span>
                        <button
                          onClick={() => setEditingOption(option)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Product Assignment Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Varianten zu Produkten zuweisen
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Produkt auswählen</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const prod = products.find(p => p.id === parseInt(e.target.value));
                setSelectedProduct(prod);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Produkt wählen --</option>
              {products.filter(p => p.category_slug === 'wassersysteme').map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {formatCurrency(product.price)}
                </option>
              ))}
            </select>
          </div>
          
          {selectedProduct && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Verfügbare Armatur-Typen</label>
              <div className="space-y-2">
                {(options['faucet'] || []).map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input type="checkbox" className="w-4 h-4 text-primary-500" />
                    <span className="font-medium">{opt.name}</span>
                    {opt.price_modifier > 0 && (
                      <span className="text-sm text-green-600">+{formatCurrency(opt.price_modifier)}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-semibold text-blue-900 mb-2">💡 So funktionieren Varianten</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Armatur-Typen:</strong> Verschiedene Wasserhahn-Designs für CLYR Home Soda (Standard, Premium, Deluxe)</li>
          <li>• <strong>Aromen:</strong> Verschiedene Düfte für CLYR Aroma Dusche (Zitrus, Lavendel, Eukalyptus)</li>
          <li>• <strong>Preisaufschlag:</strong> Wird zum Grundpreis addiert (z.B. Premium Armatur +€200)</li>
          <li>• <strong>Standard-Variante:</strong> Wird automatisch vorausgewählt im Shop</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminVariantsPage;
