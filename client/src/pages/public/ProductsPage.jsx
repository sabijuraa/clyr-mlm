// client/src/pages/public/ProductsPage.jsx
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, ShoppingBag, Grid3X3, List, ChevronRight, Package, Droplets } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../config/app.config';
import { productsAPI } from '../../services/api';
import api from '../../services/api';

export default function ProductsPage() {
  const { lang } = useLanguage();
  const { addItem, isInCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  // Referral code from URL (#11, #35)
  const [referralPartner, setReferralPartner] = useState(null);
  const refCode = searchParams.get('ref') || '';

  // Filter state from URL params
  const activeCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sort') || '';

  // Handle referral code from URL - store in cookie and track click
  useEffect(() => {
    if (refCode) {
      // Set cookie for 30 days
      document.cookie = `clyr_ref=${encodeURIComponent(refCode)};path=/;max-age=${30*86400};SameSite=Lax`;
      // Track click
      api.post('/referral/click', { code: refCode, landingUrl: window.location.href }).catch(() => {});
      // Verify and show partner name
      api.get(`/referral/check/${refCode}`)
        .then(r => { if (r.data.valid) setReferralPartner(r.data); })
        .catch(() => {});
    } else {
      // Check cookie
      const match = document.cookie.match(/(?:^|;\s*)clyr_ref=([^;]*)/);
      if (match) {
        const cookieCode = decodeURIComponent(match[1]);
        api.get(`/referral/check/${cookieCode}`)
          .then(r => { if (r.data.valid) setReferralPartner(r.data); })
          .catch(() => {});
      }
    }
  }, [refCode]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [activeCategory, searchQuery, sortBy]);

  const loadCategories = async () => {
    try {
      const res = await productsAPI.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeCategory) params.category = activeCategory;
      if (searchQuery) params.search = searchQuery;
      if (sortBy) params.sort = sortBy;

      const res = await productsAPI.getAll(params);
      setProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const setFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  const getProductImage = (product) => {
    const images = product.images || [];
    if (images.length > 0) return images[0];
    return null;
  };

  const activeCategoryData = categories.find(c => c.slug === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Referral Banner (#11) */}
      {referralPartner && (
        <div className="bg-primary-500 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.5a5.5 5.5 0 110 11V17a1 1 0 11-2 0v-1.5a5.5 5.5 0 110-11V3a1 1 0 011-1z"/></svg>
            <span>
              {lang === 'de' 
                ? `Sie wurden von ${referralPartner.partnerName} empfohlen` 
                : `Referred by ${referralPartner.partnerName}`}
            </span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-secondary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 text-primary-300 text-sm mb-3">
            <Link to="/" className="hover:text-white transition-colors">
              {lang === 'de' ? 'Start' : 'Home'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{lang === 'de' ? 'Shop' : 'Shop'}</span>
            {activeCategoryData && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <span>{lang === 'de' ? activeCategoryData.name : (activeCategoryData.name_en || activeCategoryData.name)}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-heading font-bold">
            {activeCategoryData
              ? (lang === 'de' ? activeCategoryData.name : (activeCategoryData.name_en || activeCategoryData.name))
              : (lang === 'de' ? 'Alle Produkte' : 'All Products')}
          </h1>
          {activeCategoryData && activeCategoryData.description && (
            <p className="mt-2 text-secondary-300 max-w-2xl">
              {lang === 'de' ? activeCategoryData.description : (activeCategoryData.description_en || activeCategoryData.description)}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">

          {/* Sidebar - Categories & Filters */}
          <aside className="lg:col-span-1 mb-8 lg:mb-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-heading font-semibold text-secondary-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary-500" />
                  {lang === 'de' ? 'Kategorien' : 'Categories'}
                </h3>
              </div>
              <nav className="p-2">
                <button
                  onClick={() => setFilter('category', '')}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    !activeCategory
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-secondary-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{lang === 'de' ? 'Alle Produkte' : 'All Products'}</span>
                  <span className="text-xs text-secondary-400">{products.length > 0 || !activeCategory ? '' : ''}</span>
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilter('category', cat.slug)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      activeCategory === cat.slug
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-secondary-600 hover:bg-gray-50'
                    }`}
                  >
                    <span>{lang === 'de' ? cat.name : (cat.name_en || cat.name)}</span>
                    {cat.product_count > 0 && (
                      <span className="text-xs bg-gray-100 text-secondary-500 px-2 py-0.5 rounded-full">
                        {cat.product_count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Shipping Info Box */}
            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-heading font-semibold text-secondary-800 text-sm mb-3">
                {lang === 'de' ? 'Versandinformationen' : 'Shipping Info'}
              </h4>
              <div className="space-y-2 text-xs text-secondary-600">
                <div className="flex justify-between">
                  <span>{lang === 'de' ? 'Oesterreich' : 'Austria'}</span>
                  <span className="font-medium">{formatCurrency(55)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Deutschland</span>
                  <span className="font-medium">{formatCurrency(70)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'de' ? 'Schweiz' : 'Switzerland'}</span>
                  <span className="font-medium">{formatCurrency(180)}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setFilter('search', e.target.value)}
                  placeholder={lang === 'de' ? 'Produkte suchen...' : 'Search products...'}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white"
                />
              </div>

              <div className="flex items-center gap-3">
                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setFilter('sort', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-secondary-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">{lang === 'de' ? 'Sortierung' : 'Sort by'}</option>
                  <option value="price_asc">{lang === 'de' ? 'Preis aufsteigend' : 'Price: Low to High'}</option>
                  <option value="price_desc">{lang === 'de' ? 'Preis absteigend' : 'Price: High to Low'}</option>
                  <option value="newest">{lang === 'de' ? 'Neueste zuerst' : 'Newest First'}</option>
                </select>

                {/* View Toggle */}
                <div className="hidden sm:flex border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'bg-white text-secondary-400 hover:text-secondary-600'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'bg-white text-secondary-400 hover:text-secondary-600'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <p className="text-sm text-secondary-500 mb-4">
              {products.length} {lang === 'de' ? 'Produkte' : 'Products'}
              {activeCategory && activeCategoryData && (
                <span> {lang === 'de' ? 'in' : 'in'} {lang === 'de' ? activeCategoryData.name : (activeCategoryData.name_en || activeCategoryData.name)}</span>
              )}
            </p>

            {/* Loading */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-100" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-5 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              /* Empty State */
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <Package className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
                <h3 className="text-lg font-heading font-semibold text-secondary-700 mb-2">
                  {lang === 'de' ? 'Keine Produkte gefunden' : 'No Products Found'}
                </h3>
                <p className="text-secondary-500 text-sm mb-6">
                  {searchQuery
                    ? (lang === 'de' ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Try a different search term.')
                    : (lang === 'de' ? 'In dieser Kategorie sind noch keine Produkte verfuegbar.' : 'No products available in this category yet.')}
                </p>
                {(activeCategory || searchQuery) && (
                  <button
                    onClick={() => { setFilter('category', ''); setFilter('search', ''); }}
                    className="px-5 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    {lang === 'de' ? 'Alle Produkte anzeigen' : 'Show All Products'}
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                  >
                    <Link
                      to={`/shop/${product.slug}`}
                      className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-soft transition-all duration-300"
                    >
                      {/* Image */}
                      <div className="relative h-52 bg-gray-50 overflow-hidden">
                        {getProductImage(product) ? (
                          <img
                            src={getProductImage(product)}
                            alt={product.name}
                            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Droplets className="w-12 h-12 text-secondary-200" />
                          </div>
                        )}
                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {product.is_new && (
                            <span className="px-2.5 py-1 bg-primary-500 text-white text-xs font-medium rounded-md">
                              {lang === 'de' ? 'Neu' : 'New'}
                            </span>
                          )}
                          {product.is_featured && !product.is_new && (
                            <span className="px-2.5 py-1 bg-secondary-700 text-white text-xs font-medium rounded-md">
                              {lang === 'de' ? 'Empfohlen' : 'Featured'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        {product.category_name && (
                          <p className="text-xs text-primary-600 font-medium mb-1.5">{product.category_name}</p>
                        )}
                        <h3 className="font-heading font-semibold text-secondary-800 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-sm text-secondary-500 mb-4 line-clamp-2">
                          {product.short_description || ''}
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-lg font-bold text-secondary-800">
                              {formatCurrency(product.price)}
                            </span>
                            <span className="text-xs text-secondary-400 ml-1">
                              {lang === 'de' ? 'netto' : 'net'}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleAddToCart(e, product)}
                            disabled={isInCart(product.id)}
                            className={`p-2.5 rounded-lg transition-colors ${
                              isInCart(product.id)
                                ? 'bg-gray-100 text-secondary-400 cursor-default'
                                : 'bg-primary-500 text-white hover:bg-primary-600'
                            }`}
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-4">
                {products.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                  >
                    <Link
                      to={`/shop/${product.slug}`}
                      className="group flex bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-soft transition-all duration-300"
                    >
                      {/* Image */}
                      <div className="w-40 sm:w-52 h-40 bg-gray-50 flex-shrink-0 overflow-hidden">
                        {getProductImage(product) ? (
                          <img
                            src={getProductImage(product)}
                            alt={product.name}
                            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Droplets className="w-10 h-10 text-secondary-200" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          {product.category_name && (
                            <p className="text-xs text-primary-600 font-medium mb-1">{product.category_name}</p>
                          )}
                          <h3 className="font-heading font-semibold text-secondary-800 mb-1.5 group-hover:text-primary-600 transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-sm text-secondary-500 line-clamp-2">
                            {product.short_description || ''}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <span className="text-lg font-bold text-secondary-800">
                              {formatCurrency(product.price)}
                            </span>
                            <span className="text-xs text-secondary-400 ml-1">
                              {lang === 'de' ? 'netto' : 'net'}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleAddToCart(e, product)}
                            disabled={isInCart(product.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isInCart(product.id)
                                ? 'bg-gray-100 text-secondary-400 cursor-default'
                                : 'bg-primary-500 text-white hover:bg-primary-600'
                            }`}
                          >
                            {isInCart(product.id)
                              ? (lang === 'de' ? 'Im Warenkorb' : 'In Cart')
                              : (lang === 'de' ? 'In den Warenkorb' : 'Add to Cart')}
                          </button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
