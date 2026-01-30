import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, Heart, Check, Star, Truck, Shield, RefreshCw, ChevronRight, Minus, Plus 
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const { lang } = useLanguage();
  const { addItem, isInCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedVariants, setSelectedVariants] = useState({});

  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      try {
        const { productsAPI } = await import('../../services/api');
        const response = await productsAPI.getBySlug(slug);
        const productData = response.data.product || response.data;
        setProduct(productData);
        
        // Set default variants
        if (productData.variants) {
          const defaults = {};
          Object.entries(productData.variants).forEach(([type, options]) => {
            const defaultOption = options.find(o => o.isDefault) || options[0];
            if (defaultOption) {
              defaults[type] = defaultOption;
            }
          });
          setSelectedVariants(defaults);
        }
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProduct();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-secondary-700 border-t-primary-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-secondary-500">{lang === 'de' ? 'Produkt nicht gefunden' : 'Product not found'}</p>
      </div>
    );
  }

  const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images || [];
  const features = typeof product.features === 'string' ? JSON.parse(product.features) : product.features || [];
  const inCart = isInCart(product.id);
  
  // Calculate price with variant modifiers
  const basePrice = parseFloat(product.price) || 0;
  const variantModifier = Object.values(selectedVariants).reduce((sum, v) => sum + (v?.priceModifier || 0), 0);
  const totalPrice = basePrice + variantModifier;

  const handleAddToCart = () => {
    const productWithVariants = {
      ...product,
      price: totalPrice,
      selectedVariants: selectedVariants,
      variantDescription: Object.values(selectedVariants).map(v => v?.name).filter(Boolean).join(', ')
    };
    for (let i = 0; i < quantity; i++) addItem(productWithVariants);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-slate-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-secondary-500 hover:text-primary-500">Home</Link>
            <ChevronRight className="w-4 h-4 text-secondary-400" />
            <Link to="/products" className="text-secondary-500 hover:text-primary-500">{lang === 'de' ? 'Produkte' : 'Products'}</Link>
            <ChevronRight className="w-4 h-4 text-secondary-400" />
            <span className="text-secondary-700 font-medium">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            
            {/* Images */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
              <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl overflow-hidden mb-4">
                {product.is_new && (
                  <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-primary-500 text-white text-xs font-bold rounded-full">{lang === 'de' ? 'NEU' : 'NEW'}</span>
                )}
                {product.is_featured && (
                  <span className="absolute top-4 right-4 z-10 px-3 py-1 bg-secondary-700 text-white text-xs font-bold rounded-full">BESTSELLER</span>
                )}
                <img
                  src={images[selectedImage] || '/images/placeholder.jpg'}
                  alt={product.name}
                  className="w-full h-full object-contain p-8"
                />
              </div>
              
              {images.length > 1 && (
                <div className="flex gap-3">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImage === idx ? 'border-secondary-700 ring-2 ring-secondary-200' : 'border-gray-200 hover:border-secondary-300'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain p-2" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Details */}
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-secondary-700 mb-2">{product.name}</h1>
                {product.short_description && (
                  <p className="text-lg text-secondary-500">{product.short_description}</p>
                )}
              </div>

              {/* Rating Placeholder */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-secondary-500">4.9 (127 {lang === 'de' ? 'Bewertungen' : 'reviews'})</span>
              </div>

              {/* Price - Show NET price */}
              <div className="text-3xl font-bold text-secondary-700">
                {formatCurrency(totalPrice)}
                <span className="text-sm font-normal text-secondary-500 ml-2">
                  {lang === 'de' ? 'zzgl. MwSt.' : 'excl. VAT'}
                </span>
              </div>

              {/* Variant Selectors */}
              {product.variants && Object.entries(product.variants).length > 0 && (
                <div className="space-y-4 py-4 border-t border-b border-gray-100">
                  {Object.entries(product.variants).map(([type, options]) => (
                    <div key={type}>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        {type === 'faucet' ? (lang === 'de' ? 'Armatur wählen' : 'Select Faucet') :
                         type === 'aroma' ? (lang === 'de' ? 'Aroma wählen' : 'Select Aroma') :
                         type === 'color' ? (lang === 'de' ? 'Farbe wählen' : 'Select Color') :
                         lang === 'de' ? 'Option wählen' : 'Select Option'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {options.map((option) => {
                          const isSelected = selectedVariants[type]?.id === option.id;
                          return (
                            <button
                              key={option.id}
                              onClick={() => setSelectedVariants({ ...selectedVariants, [type]: option })}
                              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                                isSelected 
                                  ? 'border-secondary-700 bg-secondary-50 text-secondary-700' 
                                  : 'border-gray-200 hover:border-secondary-300'
                              }`}
                            >
                              <span className="font-medium">{lang === 'de' ? option.name : option.name_en || option.name}</span>
                              {option.priceModifier > 0 && (
                                <span className="ml-2 text-sm text-green-600">+{formatCurrency(option.priceModifier)}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stock */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-600 font-medium">{lang === 'de' ? 'Auf Lager' : 'In Stock'}</span>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <div className="flex items-center bg-secondary-100 rounded-xl">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:bg-secondary-200 rounded-l-xl text-secondary-700">
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-12 text-center font-semibold text-secondary-700">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:bg-secondary-200 rounded-r-xl text-secondary-700">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={inCart}
                  className={`flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all ${
                    inCart ? 'bg-green-100 text-green-700' : 'bg-secondary-700 text-white hover:bg-primary-500'
                  }`}
                >
                  {inCart ? <><Check className="w-5 h-5" /> {lang === 'de' ? 'Im Warenkorb' : 'In Cart'}</> : <><ShoppingBag className="w-5 h-5" /> {lang === 'de' ? 'In den Warenkorb' : 'Add to Cart'}</>}
                </button>

                <button className="p-4 rounded-xl border border-gray-200 text-secondary-600 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all">
                  <Heart className="w-6 h-6" />
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                {[
                  { icon: Truck, title: lang === 'de' ? 'Kostenloser Versand' : 'Free Shipping', sub: lang === 'de' ? 'Ab €100' : 'Over €100' },
                  { icon: Shield, title: lang === 'de' ? '2 Jahre Garantie' : '2 Year Warranty', sub: lang === 'de' ? 'Voller Schutz' : 'Full coverage' },
                  { icon: RefreshCw, title: lang === 'de' ? '30 Tage Rückgabe' : '30 Day Returns', sub: lang === 'de' ? 'Kein Risiko' : 'No risk' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary-700 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-700">{item.title}</p>
                      <p className="text-xs text-secondary-500">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 border-b border-gray-200 mb-8">
            {[
              { key: 'description', label: lang === 'de' ? 'Beschreibung' : 'Description' },
              { key: 'features', label: lang === 'de' ? 'Eigenschaften' : 'Features' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-4 px-2 font-medium transition-all border-b-2 -mb-px ${
                  activeTab === tab.key ? 'text-secondary-700 border-secondary-700' : 'text-secondary-500 border-transparent hover:text-secondary-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-8 border border-gray-100">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-secondary-600 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {activeTab === 'features' && features.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-secondary-700 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-primary-400" />
                    </div>
                    <span className="text-secondary-700">{feature}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductDetailPage;
