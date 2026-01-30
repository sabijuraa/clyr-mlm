import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronDown, ShoppingBag, Check, Droplets } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../config/app.config';
import { debounce } from '../../utils/helpers';
import { productsAPI } from '../../services/api';

const ProductsPage = () => {
  const { t, lang } = useLanguage();
  const { addItem, isInCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');

  const categories = [
    { key: 'all', label: lang === 'de' ? 'Alle Produkte' : 'All Products' },
    { key: 'wasserfilter', label: lang === 'de' ? 'Wasserfilter' : 'Water Filters' },
    { key: 'komplett-sets', label: lang === 'de' ? 'Komplett-Sets' : 'Complete Sets' },
    { key: 'ersatzfilter', label: lang === 'de' ? 'Ersatzfilter' : 'Replacement Filters' },
    { key: 'zubehoer', label: lang === 'de' ? 'Zubehör' : 'Accessories' },
  ];

  const sortOptions = [
    { key: 'default', label: lang === 'de' ? 'Empfohlen' : 'Recommended' },
    { key: 'price-asc', label: lang === 'de' ? 'Preis aufsteigend' : 'Price: Low to High' },
    { key: 'price-desc', label: lang === 'de' ? 'Preis absteigend' : 'Price: High to Low' },
    { key: 'name-asc', label: lang === 'de' ? 'Name A-Z' : 'Name A-Z' },
  ];

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const response = await productsAPI.getAll();
        setProducts(response.data.products || response.data || []);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category?.slug === selectedCategory);
    }

    switch (sortBy) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const handleSearch = debounce((value) => setSearchQuery(value), 300);
  const handleAddToCart = (e, product) => { e.preventDefault(); addItem(product); };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Charcoal background */}
      <div className="bg-gradient-to-br from-secondary-700 via-secondary-700 to-secondary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl lg:text-5xl text-white font-bold mb-4">
              {lang === 'de' ? 'Unsere Produkte' : 'Our Products'}
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl">
              {lang === 'de' 
                ? 'Entdecken Sie unsere Premium Wasserfiltersysteme für reinstes Trinkwasser.'
                : 'Discover our premium water filtration systems for the purest drinking water.'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Search */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200">
                <h3 className="font-semibold text-secondary-700 mb-4">{lang === 'de' ? 'Suche' : 'Search'}</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
                  <input
                    type="text"
                    placeholder={lang === 'de' ? 'Produkt suchen...' : 'Search products...'}
                    defaultValue={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-700 focus:border-transparent text-secondary-700"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200">
                <h3 className="font-semibold text-secondary-700 mb-4">{lang === 'de' ? 'Kategorien' : 'Categories'}</h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl transition-all ${
                        selectedCategory === cat.key
                          ? 'bg-secondary-700 text-white font-medium'
                          : 'text-secondary-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-secondary-600">
                <span className="font-semibold text-secondary-700">{filteredProducts.length}</span> {lang === 'de' ? 'Produkte' : 'Products'}
              </p>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-secondary-700 focus:outline-none focus:ring-2 focus:ring-secondary-700"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
              </div>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                    <div className="aspect-square bg-slate-100 rounded-xl mb-4" />
                    <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                    <div className="h-6 bg-slate-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product, index) => {
                  const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images || [];
                  const mainImage = images[0] || '/images/placeholder.jpg';
                  const inCart = isInCart(product.id);

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link 
                        to={`/product/${product.slug}`} 
                        className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-secondary-300 hover:shadow-lg transition-all"
                      >
                        <div className="relative aspect-square bg-slate-50 p-6">
                          {product.is_featured && (
                            <span className="absolute top-3 left-3 px-2.5 py-1 bg-secondary-700 text-white text-xs font-bold rounded-full">BESTSELLER</span>
                          )}
                          {product.is_new && (
                            <span className="absolute top-3 right-3 px-2.5 py-1 bg-primary-500 text-white text-xs font-bold rounded-full">{lang === 'de' ? 'NEU' : 'NEW'}</span>
                          )}
                          <img src={mainImage} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="p-5">
                          <h3 className="font-semibold text-secondary-700 mb-1 group-hover:text-primary-500 transition-colors">{product.name}</h3>
                          {product.short_description && (
                            <p className="text-sm text-secondary-500 mb-3 line-clamp-1">{product.short_description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-secondary-700">{formatCurrency(product.price)}</span>
                            <button
                              onClick={(e) => handleAddToCart(e, product)}
                              disabled={inCart}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                inCart ? 'bg-green-100 text-green-600' : 'bg-secondary-700 text-white hover:bg-primary-500'
                              }`}
                            >
                              {inCart ? <Check className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary-700 flex items-center justify-center">
                  <Droplets className="w-10 h-10 text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-700 mb-2">{lang === 'de' ? 'Keine Produkte gefunden' : 'No products found'}</h3>
                <p className="text-secondary-500">{lang === 'de' ? 'Versuchen Sie andere Filter' : 'Try different filters'}</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
