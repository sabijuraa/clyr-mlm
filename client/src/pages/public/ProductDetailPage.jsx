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

  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/products/${slug}`);
        const data = await response.json();
        setProduct(data.product || data);
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
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">{lang === 'de' ? 'Produkt nicht gefunden' : 'Product not found'}</p>
      </div>
    );
  }

  const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images || [];
  const features = typeof product.features === 'string' ? JSON.parse(product.features) : product.features || [];
  const inCart = isInCart(product.id);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) addItem(product);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-gray-500 hover:text-teal-600">Home</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link to="/produkte" className="text-gray-500 hover:text-teal-600">{lang === 'de' ? 'Produkte' : 'Products'}</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            
            {/* Images */}
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
              <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl overflow-hidden mb-4">
                {product.is_new && (
                  <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">NEU</span>
                )}
                {product.is_featured && (
                  <span className="absolute top-4 right-4 z-10 px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full">BESTSELLER</span>
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
                        selectedImage === idx ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200 hover:border-gray-300'
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
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
                {product.short_description && (
                  <p className="text-lg text-gray-600">{product.short_description}</p>
                )}
              </div>

              {/* Rating Placeholder */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-gray-500">4.9 (127 {lang === 'de' ? 'Bewertungen' : 'reviews'})</span>
              </div>

              {/* Price */}
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(product.price)}
                <span className="text-sm font-normal text-gray-500 ml-2">{lang === 'de' ? 'inkl. MwSt.' : 'incl. VAT'}</span>
              </div>

              {/* Stock */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-600 font-medium">{lang === 'de' ? 'Auf Lager' : 'In Stock'}</span>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <div className="flex items-center bg-gray-100 rounded-xl">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:bg-gray-200 rounded-l-xl">
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:bg-gray-200 rounded-r-xl">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={inCart}
                  className={`flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all ${
                    inCart ? 'bg-teal-100 text-teal-700' : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  {inCart ? <><Check className="w-5 h-5" /> {lang === 'de' ? 'Im Warenkorb' : 'In Cart'}</> : <><ShoppingBag className="w-5 h-5" /> {lang === 'de' ? 'In den Warenkorb' : 'Add to Cart'}</>}
                </button>

                <button className="p-4 rounded-xl border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all">
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
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-12 bg-gray-50">
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
                  activeTab === tab.key ? 'text-teal-600 border-teal-500' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-8 border border-gray-100">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {activeTab === 'features' && features.length > 0 && (
              <div className="grid md:grid-cols-2 gap-4">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
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