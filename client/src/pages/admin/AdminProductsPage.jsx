import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Image,
  Tag,
  DollarSign,
  Layers,
  MoreVertical,
  Upload
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';

// Demo data
const demoProducts = [
  {
    id: 1,
    name: 'AquaPure Pro 3000',
    slug: 'aquapure-pro-3000',
    category: 'Anlagen',
    price: 1299,
    originalPrice: 1499,
    stock: 45,
    status: 'active',
    isNew: true,
    images: ['/products/machine-1.jpg']
  },
  {
    id: 2,
    name: 'FreshFlow Kompakt',
    slug: 'freshflow-kompakt',
    category: 'Anlagen',
    price: 899,
    stock: 32,
    status: 'active',
    isNew: false,
    images: ['/products/machine-2.jpg']
  },
  {
    id: 3,
    name: 'Premium Filterset (6er)',
    slug: 'premium-filterset-6er',
    category: 'Filter',
    price: 149,
    originalPrice: 179,
    stock: 128,
    status: 'active',
    isNew: false,
    images: ['/products/filter-1.jpg']
  },
  {
    id: 4,
    name: 'CO2 Zylinder Set',
    slug: 'co2-zylinder-set',
    category: 'Zubehör',
    price: 79,
    stock: 0,
    status: 'inactive',
    isNew: false,
    images: ['/products/accessory-1.jpg']
  },
];

const categories = ['Anlagen', 'Filter', 'Zubehör'];

const AdminProductsPage = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState(demoProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.status === 'active').length;
  const lowStockProducts = products.filter(p => p.stock < 10).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            Produkte verwalten
          </h1>
          <p className="text-gray-600">Alle Produkte im Shop</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          Neues Produkt
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <Package className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
              <p className="text-sm text-gray-500">Produkte gesamt</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeProducts}</p>
              <p className="text-sm text-gray-500">Aktiv</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
              <Layers className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{lowStockProducts}</p>
              <p className="text-sm text-gray-500">Niedriger Bestand</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Produkt suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Alle
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Products Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group">
            {/* Image */}
            <div className="relative aspect-square bg-gray-100">
              {product.images?.[0] ? (
                <img 
                  src={product.images[0]} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-12 h-12 text-gray-300" />
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {product.isNew && (
                  <span className="px-2 py-1 bg-teal-600 text-white text-xs font-bold rounded-lg">
                    NEU
                  </span>
                )}
                {product.stock === 0 && (
                  <span className="px-2 py-1 bg-gray-600 text-white text-xs font-bold rounded-lg">
                    Ausverkauft
                  </span>
                )}
              </div>

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 
                flex items-center justify-center gap-2 transition-opacity">
                <button 
                  className="p-2 bg-white rounded-lg text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                  onClick={() => setEditingProduct(product)}
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button className="p-2 bg-white rounded-lg text-gray-700 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                  <Eye className="w-5 h-5" />
                </button>
                <button className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-teal-600 uppercase">{product.category}</span>
                <span className={`w-2 h-2 rounded-full ${product.status === 'active' ? 'bg-teal-500' : 'bg-gray-300'}`} />
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">{product.name}</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-400 line-through ml-2">
                      {formatCurrency(product.originalPrice)}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${product.stock < 10 ? 'text-gray-500' : 'text-gray-600'}`}>
                    {product.stock} auf Lager
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Create/Edit Product Modal */}
      <Modal
        isOpen={showCreateModal || !!editingProduct}
        onClose={() => { setShowCreateModal(false); setEditingProduct(null); }}
        title={editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}
        size="lg"
      >
        <form className="space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Produktbild</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center 
              hover:border-teal-400 hover:bg-teal-50 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">Klicken oder Bild hierher ziehen</p>
              <p className="text-sm text-gray-400">PNG, JPG bis 5MB</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Produktname"
              required
              defaultValue={editingProduct?.name}
              icon={Tag}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
              <select 
                className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl
                  focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                defaultValue={editingProduct?.category}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Preis (€)"
              type="number"
              required
              defaultValue={editingProduct?.price}
              icon={DollarSign}
            />
            <Input
              label="Streichpreis (€)"
              type="number"
              defaultValue={editingProduct?.originalPrice}
              icon={DollarSign}
            />
          </div>

          <Input
            label="Lagerbestand"
            type="number"
            required
            defaultValue={editingProduct?.stock}
            icon={Layers}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
            <textarea
              rows={4}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl
                focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
              placeholder="Produktbeschreibung..."
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                defaultChecked={editingProduct?.status === 'active'}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-gray-700">Aktiv</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                defaultChecked={editingProduct?.isNew}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-gray-700">Als "Neu" markieren</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => { setShowCreateModal(false); setEditingProduct(null); }}
            >
              Abbrechen
            </Button>
            <Button type="submit" className="flex-1" icon={editingProduct ? Edit : Plus}>
              {editingProduct ? 'Speichern' : 'Produkt erstellen'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminProductsPage;
