import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin } from 'lucide-react';
import { 
  ArrowRight, 
  Droplets, 
  Shield, 
  Leaf, 
  Award,
  Truck,
  Headphones,
  Check,
  Star,
  ChevronRight,
  ShoppingBag,
  Users,
  GraduationCap,
  Package,
  Zap,
  Clock,
  Briefcase,
  Heart
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../config/app.config';
import { productsAPI } from '../../services/api';
import brandConfig from '../../config/brand.config';

const HomePage = () => {
  const { lang } = useLanguage();
  const { addItem, isInCart } = useCart();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await productsAPI.getFeatured(4);
        setFeaturedProducts(response.data.products || response.data || []);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const handleAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* ====== HERO SECTION ====== */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-secondary-700">
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-300 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left - Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Brand Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-primary-300 text-sm font-medium mb-8 border border-white/20">
                <Droplets className="w-4 h-4" />
                <span>{lang === 'de' ? 'Premium Wassersysteme' : 'Premium Water Systems'}</span>
              </div>
              
              {/* Main Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-8">
                {lang === 'de' ? (
                  <>
                    <span className="text-primary-400">Klares</span> Wasser.<br />
                    <span className="text-primary-400">Klares</span> Leben.
                  </>
                ) : (
                  <>
                    <span className="text-primary-400">Clear</span> Water.<br />
                    <span className="text-primary-400">Clear</span> Life.
                  </>
                )}
              </h1>
              
              {/* Subheadline */}
              <p className="text-xl text-gray-300 mb-10 max-w-xl leading-relaxed">
                {lang === 'de' 
                  ? 'Entdecken Sie die Zukunft des Trinkwassers. Premium Wassersysteme für Ihr Zuhause - direkt aus dem Wasserhahn.'
                  : 'Discover the future of drinking water. Premium water systems for your home - straight from the tap.'}
              </p>
              
              {/* CTA Buttons - Correct Routes */}
              <div className="flex flex-wrap gap-4 mb-12">
                <Link 
                  to="/products"
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-secondary-700 font-semibold rounded-xl hover:bg-primary-400 hover:text-white transition-all shadow-lg hover:-translate-y-0.5"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {lang === 'de' ? 'Produkte entdecken' : 'Shop Products'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/partner/register"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-transparent text-white font-semibold rounded-xl border-2 border-white/30 hover:border-primary-400 hover:text-primary-400 transition-all"
                >
                  <Users className="w-5 h-5" />
                  {lang === 'de' ? 'Partner werden' : 'Become Partner'}
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-8 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-400" />
                  <span>{lang === 'de' ? '2 Jahre Garantie' : '2 Year Warranty'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary-400" />
                  <span>{lang === 'de' ? 'Schnelle Lieferung' : 'Fast Delivery'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-primary-400" />
                  <span>{lang === 'de' ? 'Premium Support' : 'Premium Support'}</span>
                </div>
              </div>
            </motion.div>
            
            {/* Right - Product Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex justify-center items-center"
            >
              <div className="relative">
                {/* Glow Effect Behind Product */}
                <div className="absolute inset-0 bg-primary-400/20 rounded-full blur-3xl transform scale-75" />
                
                {/* Product Image */}
                <img 
                  src="/images/products/complete-set.png" 
                  alt="CLYR Water System" 
                  className="relative w-full max-w-lg h-auto drop-shadow-2xl"
                />
                
                {/* Floating Stat Card - Top Right */}
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-secondary-700 rounded-xl flex items-center justify-center">
                      <Droplets className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-secondary-700">99.9%</div>
                      <div className="text-sm text-secondary-500">{lang === 'de' ? 'Filtration' : 'Filtration'}</div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Stat Card - Bottom Left */}
                <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-secondary-700 rounded-xl flex items-center justify-center">
                      <Leaf className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-secondary-700">1000+</div>
                      <div className="text-sm text-secondary-500">{lang === 'de' ? 'Flaschen gespart' : 'Bottles Saved'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ====== WHY CLYR SECTION ====== */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
           
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-secondary-700 mb-6">
              {lang === 'de' ? 'Warum CLYR?' : 'Why CLYR?'}
            </h2>
            <p className="text-xl text-secondary-500 max-w-3xl mx-auto">
              {lang === 'de'
                ? 'Premium Qualität trifft auf Innovation - für reines Wasser direkt aus Ihrem Wasserhahn'
                : 'Premium quality meets innovation - for pure water straight from your tap'}
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Droplets,
                title: lang === 'de' ? 'Kristallklares Wasser' : 'Crystal Clear Water',
                description: lang === 'de' 
                  ? '99.9% Filtration für reinstes Trinkwasser'
                  : '99.9% filtration for purest drinking water',
              },
              {
                icon: Leaf,
                title: lang === 'de' ? 'Umweltfreundlich' : 'Eco-Friendly',
                description: lang === 'de'
                  ? 'Keine Plastikflaschen mehr - gut für die Umwelt'
                  : 'No more plastic bottles - good for the environment',
              },
              {
                icon: Zap,
                title: lang === 'de' ? 'Sofort verfügbar' : 'Instant Access',
                description: lang === 'de'
                  ? 'Gekühltes, gefiltertes Wasser auf Knopfdruck'
                  : 'Chilled, filtered water at the touch of a button',
              },
              {
                icon: Shield,
                title: lang === 'de' ? 'Deutsche Qualität' : 'German Quality',
                description: lang === 'de'
                  ? 'Höchste Standards in Design und Verarbeitung'
                  : 'Highest standards in design and workmanship',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-secondary-700 rounded-2xl p-8 hover:bg-secondary-800 transition-all hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-secondary-600 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PRODUCTS SECTION ====== */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold text-secondary-700 mb-4">
                {lang === 'de' ? 'Unsere Produkte' : 'Our Products'}
              </h2>
              <p className="text-lg text-secondary-500">
                {lang === 'de' ? 'Premium Wassersysteme für Ihr Zuhause' : 'Premium water systems for your home'}
              </p>
            </div>
            <Link
              to="/products"
              className="hidden sm:inline-flex items-center gap-2 px-6 py-3 bg-secondary-700 text-white font-semibold rounded-xl hover:bg-secondary-800 transition-colors"
            >
              {lang === 'de' ? 'Alle Produkte' : 'All Products'}
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl h-96 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 4).map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Link
                    to={`/products/${product.id}`}
                    className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 border border-gray-100"
                  >
                    <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
                      <img
                        src={product.image_url || '/images/products/complete-set.png'}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-semibold text-secondary-700 mb-2 text-lg group-hover:text-primary-500 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-bold text-secondary-700">
                          {formatCurrency(product.price_gross || product.price)}
                        </div>
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          disabled={isInCart(product.id)}
                          className={`p-3 rounded-xl transition-all ${
                            isInCart(product.id)
                              ? 'bg-green-100 text-green-600'
                              : 'bg-secondary-700 text-white hover:bg-primary-500'
                          }`}
                        >
                          {isInCart(product.id) ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <ShoppingBag className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-center mt-10 sm:hidden">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary-700 text-white font-semibold rounded-xl"
            >
              {lang === 'de' ? 'Alle Produkte ansehen' : 'View All Products'}
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ====== PARTNER CTA SECTION - NO COMMISSION RATES ====== */}
      <section className="py-24 bg-secondary-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
             
            >
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                {lang === 'de' ? 'Werden Sie CLYR Partner' : 'Become a CLYR Partner'}
              </h2>
              <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                {lang === 'de'
                  ? 'Starten Sie Ihr eigenes Geschäft mit CLYR. Profitieren Sie von attraktiven Vorteilen und einem bewährten Geschäftsmodell.'
                  : 'Start your own business with CLYR. Benefit from attractive advantages and a proven business model.'}
              </p>
              
              {/* Benefits Grid - NO COMMISSION RATES */}
              <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {[
                  { icon: Briefcase, text: lang === 'de' ? 'Eigenes Business aufbauen' : 'Build Your Own Business' },
                  { icon: Users, text: lang === 'de' ? 'Team aufbauen' : 'Build Your Team' },
                  { icon: GraduationCap, text: lang === 'de' ? 'CLYR Academy Schulungen' : 'CLYR Academy Training' },
                  { icon: Package, text: lang === 'de' ? 'Premium Produkte' : 'Premium Products' },
                  { icon: Clock, text: lang === 'de' ? 'Flexible Arbeitszeiten' : 'Flexible Working Hours' },
                  { icon: Heart, text: lang === 'de' ? 'Persönlicher Support' : 'Personal Support' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 bg-secondary-600 rounded-xl p-4">
                    <div className="w-12 h-12 bg-secondary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-primary-400" />
                    </div>
                    <span className="font-medium text-white">{item.text}</span>
                  </div>
                ))}
              </div>
              
              <Link
                to="/partner/register"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-secondary-700 font-semibold rounded-xl hover:bg-primary-400 hover:text-white transition-all shadow-lg"
              >
                {lang === 'de' ? 'Jetzt Partner werden' : 'Become Partner Now'}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            
            {/* Right Side - Benefits Card (NO COMMISSION RATES) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
             
            >
              <div className="bg-white rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8 pb-8 border-b border-gray-100">
                  <div className="w-20 h-20 bg-secondary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-primary-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-secondary-700">
                    {lang === 'de' ? 'Ihre Karriere bei CLYR' : 'Your Career at CLYR'}
                  </h3>
                  <p className="text-secondary-500 mt-2">
                    {lang === 'de' ? '6 Karrierestufen warten auf Sie' : '6 career levels await you'}
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: Star, title: lang === 'de' ? 'Attraktive Vergütung' : 'Attractive Compensation', desc: lang === 'de' ? 'Leistungsbasierte Provisionen' : 'Performance-based rewards' },
                    { icon: GraduationCap, title: lang === 'de' ? 'Umfassende Schulung' : 'Comprehensive Training', desc: lang === 'de' ? 'CLYR Academy für Ihren Erfolg' : 'CLYR Academy for your success' },
                    { icon: Shield, title: lang === 'de' ? 'Premium Marke' : 'Premium Brand', desc: lang === 'de' ? 'Hochwertige Produkte verkaufen' : 'Sell high-quality products' },
                    { icon: Heart, title: lang === 'de' ? 'Starke Community' : 'Strong Community', desc: lang === 'de' ? 'Teil eines wachsenden Teams' : 'Part of a growing team' },
                  ].map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl hover:bg-secondary-700 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-secondary-700 group-hover:bg-secondary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-secondary-700 group-hover:text-white transition-colors">{item.title}</h4>
                        <p className="text-sm text-secondary-500 group-hover:text-gray-300 transition-colors">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ====== CONTACT SECTION ====== */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
           
            className="text-center mb-12"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-secondary-700 mb-4">
              {lang === 'de' ? 'Kontakt' : 'Contact Us'}
            </h2>
            <p className="text-lg text-secondary-500">
              {lang === 'de' ? 'Wir sind für Sie da' : 'We are here for you'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Phone,
                title: lang === 'de' ? 'Telefon' : 'Phone',
                value: brandConfig.company.phone,
                link: `tel:${brandConfig.company.phone}`,
              },
              {
                icon: Mail,
                title: 'E-Mail',
                value: brandConfig.company.email,
                link: `mailto:${brandConfig.company.email}`,
              },
              {
                icon: MapPin,
                title: lang === 'de' ? 'Adresse' : 'Address',
                value: `${brandConfig.company.address.city}, ${brandConfig.company.address.country}`,
                link: '#',
              },
            ].map((contact, index) => (
              <motion.a
                key={index}
                href={contact.link}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex flex-col items-center p-8 bg-secondary-700 rounded-2xl hover:bg-secondary-800 transition-all hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-secondary-600 rounded-xl flex items-center justify-center mb-4">
                  <contact.icon className="w-8 h-8 text-primary-400" />
                </div>
                <h3 className="font-semibold text-white mb-2 text-lg">{contact.title}</h3>
                <p className="text-gray-400 text-center">{contact.value}</p>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ====== TRUST BAR ====== */}
      <section className="py-12 bg-slate-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-12 items-center">
            {[
              { icon: Shield, text: lang === 'de' ? '2 Jahre Garantie' : '2 Year Warranty' },
              { icon: Truck, text: lang === 'de' ? 'Schnelle Lieferung' : 'Fast Delivery' },
              { icon: Headphones, text: lang === 'de' ? 'Premium Support' : 'Premium Support' },
              { icon: Award, text: lang === 'de' ? 'Zertifizierte Qualität' : 'Certified Quality' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-secondary-700">
                <div className="w-10 h-10 bg-secondary-700 rounded-lg flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary-400" />
                </div>
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;