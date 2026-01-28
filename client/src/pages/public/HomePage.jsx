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
  Play,
  ShoppingBag,
  ArrowUpRight,
  Sparkles,
  Users,
  TrendingUp,
  Clock,
  GraduationCap,
  Heart,
  Briefcase,
  Zap,
  RefreshCw
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
      
      {/* ====== HERO SECTION - CLYR Branding ====== */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-sky-900" />
        
        {/* Water Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 bg-sky-400 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-sky-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-sky-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left - Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Brand Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/20 backdrop-blur-sm rounded-full text-sky-300 text-sm font-medium mb-6 border border-sky-500/30">
                <Droplets className="w-4 h-4" />
                <span>{lang === 'de' ? 'Premium Wassersysteme' : 'Premium Water Systems'}</span>
              </div>
              
              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                {lang === 'de' ? (
                  <>
                    <span className="text-sky-400">Klares</span> Wasser.<br />
                    <span className="text-sky-400">Klares</span> Leben.
                  </>
                ) : (
                  <>
                    <span className="text-sky-400">Clear</span> Water.<br />
                    <span className="text-sky-400">Clear</span> Life.
                  </>
                )}
              </h1>
              
              <p className="text-lg text-neutral-300 mb-8 max-w-lg leading-relaxed">
                {lang === 'de' 
                  ? 'CLYR verwandelt Ihr Leitungswasser in reinstes Trinkwasser. Sprudel auf Knopfdruck, ohne Plastikflaschen, direkt aus Ihrem Wasserhahn.'
                  : 'CLYR transforms your tap water into purest drinking water. Sparkling water at the touch of a button, without plastic bottles, straight from your tap.'}
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link 
                  to="/produkte"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-sky-500 text-white font-semibold rounded-full hover:bg-sky-400 transition-all shadow-lg shadow-sky-500/30"
                >
                  {lang === 'de' ? 'Produkte entdecken' : 'Discover Products'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button className="inline-flex items-center gap-2 px-6 py-3.5 border-2 border-white/30 text-white font-medium rounded-full hover:bg-white/10 transition-all backdrop-blur-sm">
                  <Play className="w-4 h-4" />
                  {lang === 'de' ? 'Video ansehen' : 'Watch Video'}
                </button>
              </div>

              {/* Trust Row */}
              <div className="flex flex-wrap items-center gap-6 text-neutral-400 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-sky-400" />
                  <span>TÜV Zertifiziert</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-sky-400" />
                  <span>2 Jahre Garantie</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-sky-400" />
                  <span>Schneller Versand</span>
                </div>
              </div>
            </motion.div>

            {/* Right - Product Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:flex justify-center items-center relative"
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-80 bg-sky-500/30 rounded-full blur-3xl" />
              </div>
              
              <img 
                src="/images/products/tower-front.png" 
                alt="CLYR Home Soda System"
                className="relative max-h-[550px] w-auto drop-shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ====== STATS BAR ====== */}
      <section className="py-16 bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { icon: Droplets, value: '99,9%', label: lang === 'de' ? 'Schadstoff-Entfernung' : 'Contaminant Removal' },
              { icon: Leaf, value: '1.000+', label: lang === 'de' ? 'Flaschen gespart/Jahr' : 'Bottles Saved/Year' },
              { icon: Star, value: '4.9/5', label: lang === 'de' ? 'Kundenbewertung' : 'Customer Rating' },
              { icon: RefreshCw, value: '12 Mon.', label: lang === 'de' ? 'Filter-Abo' : 'Filter Subscription' },
            ].map((item, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-sky-100 flex items-center justify-center">
                  <item.icon className="w-7 h-7 text-sky-600" />
                </div>
                <div className="text-3xl font-bold text-neutral-900 mb-1">{item.value}</div>
                <div className="text-sm text-neutral-500">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PRODUCTS SECTION ====== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="text-sky-600 font-semibold text-sm uppercase tracking-wider">
                {lang === 'de' ? 'Unsere Produkte' : 'Our Products'}
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mt-2">
                {lang === 'de' ? 'Premium Wassersysteme' : 'Premium Water Systems'}
              </h2>
            </div>
            <Link 
              to="/produkte"
              className="hidden md:inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium"
            >
              {lang === 'de' ? 'Alle Produkte' : 'All Products'}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-neutral-100 rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link 
                    to={`/produkt/${product.slug}`}
                    className="group block bg-neutral-50 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-neutral-100"
                  >
                    <div className="aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 relative overflow-hidden">
                      {product.image_url && (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      {product.is_featured && (
                        <span className="absolute top-3 left-3 px-2 py-1 bg-sky-500 text-white text-xs font-semibold rounded-full">
                          {lang === 'de' ? 'Bestseller' : 'Bestseller'}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-neutral-900 mb-1 group-hover:text-sky-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-sm text-neutral-500 mb-3 line-clamp-2">
                        {product.short_description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-neutral-900">
                          {formatCurrency(product.price_net)}
                        </span>
                        <button
                          onClick={(e) => handleAddToCart(e, product)}
                          disabled={isInCart(product.id)}
                          className={`p-2 rounded-full transition-all ${
                            isInCart(product.id)
                              ? 'bg-green-100 text-green-600'
                              : 'bg-sky-100 text-sky-600 hover:bg-sky-200'
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

          <Link 
            to="/produkte"
            className="md:hidden mt-8 w-full flex items-center justify-center gap-2 py-3 border border-sky-200 text-sky-600 rounded-full hover:bg-sky-50 transition-all font-medium"
          >
            {lang === 'de' ? 'Alle Produkte ansehen' : 'View All Products'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ====== FEATURES SECTION ====== */}
      <section className="py-20 bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sky-400 font-semibold text-sm uppercase tracking-wider">
              {lang === 'de' ? 'Warum CLYR?' : 'Why CLYR?'}
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mt-2">
              {lang === 'de' ? 'Vorteile auf einen Blick' : 'Benefits at a Glance'}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Droplets,
                title: lang === 'de' ? 'Reinste Wasserqualität' : 'Purest Water Quality',
                desc: lang === 'de' 
                  ? 'Unser mehrstufiges Filtersystem entfernt 99,9% aller Schadstoffe und Verunreinigungen aus Ihrem Leitungswasser.'
                  : 'Our multi-stage filtration system removes 99.9% of all contaminants and impurities from your tap water.'
              },
              {
                icon: Zap,
                title: lang === 'de' ? 'Sprudel auf Knopfdruck' : 'Sparkling at the Touch',
                desc: lang === 'de'
                  ? 'Still, medium oder sprudelig – wählen Sie Ihre bevorzugte Kohlensäure-Stärke direkt am Gerät.'
                  : 'Still, medium or sparkling – choose your preferred carbonation level directly on the device.'
              },
              {
                icon: Leaf,
                title: lang === 'de' ? 'Nachhaltig & Umweltfreundlich' : 'Sustainable & Eco-Friendly',
                desc: lang === 'de'
                  ? 'Sparen Sie über 1.000 Plastikflaschen pro Jahr und reduzieren Sie Ihren CO2-Fußabdruck erheblich.'
                  : 'Save over 1,000 plastic bottles per year and significantly reduce your carbon footprint.'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-neutral-800/50 backdrop-blur-sm rounded-2xl p-8 border border-neutral-700"
              >
                <div className="w-14 h-14 rounded-2xl bg-sky-500/20 flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-sky-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-neutral-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PARTNER CTA SECTION ====== */}
      <section className="py-24 bg-gradient-to-br from-sky-600 via-sky-500 to-sky-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" 
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} 
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left - Text */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'de' ? 'Karriere-Möglichkeit' : 'Career Opportunity'}</span>
              </span>
              
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                {lang === 'de' 
                  ? 'Werde CLYR Partner' 
                  : 'Become a CLYR Partner'}
              </h2>
              
              <p className="text-sky-100 mb-8 leading-relaxed text-lg">
                {lang === 'de'
                  ? 'Sie sind begeistert von unseren Produkten? Teilen Sie diese Begeisterung und bauen Sie sich ein eigenes Geschäft auf. Wir unterstützen Sie mit Schulungen, Marketing-Material und persönlicher Betreuung.'
                  : 'Passionate about our products? Share that enthusiasm and build your own business. We support you with training, marketing materials, and personal guidance.'}
              </p>

              <Link 
                to="/partner-werden"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-sky-600 font-semibold rounded-full hover:bg-sky-50 transition-all shadow-lg"
              >
                {lang === 'de' ? 'Jetzt Partner werden' : 'Become a Partner'}
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </motion.div>

            {/* Right - Benefits Grid */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="grid grid-cols-2 gap-4">
                {[
                  { 
                    icon: Clock, 
                    title: lang === 'de' ? 'Flexible Arbeitszeiten' : 'Flexible Hours',
                    desc: lang === 'de' ? 'Arbeiten Sie wann und wo Sie wollen' : 'Work when and where you want'
                  },
                  { 
                    icon: TrendingUp, 
                    title: lang === 'de' ? 'Attraktives Einkommen' : 'Attractive Income',
                    desc: lang === 'de' ? 'Bis zu 36% Provision' : 'Up to 36% commission'
                  },
                  { 
                    icon: GraduationCap, 
                    title: lang === 'de' ? 'Kostenlose Schulungen' : 'Free Training',
                    desc: lang === 'de' ? 'CLYR Academy Zugang' : 'CLYR Academy access'
                  },
                  { 
                    icon: Users, 
                    title: lang === 'de' ? 'Starkes Team' : 'Strong Team',
                    desc: lang === 'de' ? 'Teil einer wachsenden Community' : 'Part of a growing community'
                  },
                  { 
                    icon: Heart, 
                    title: lang === 'de' ? 'Premium Produkte' : 'Premium Products',
                    desc: lang === 'de' ? 'Produkte die begeistern' : 'Products that inspire'
                  },
                  { 
                    icon: Briefcase, 
                    title: lang === 'de' ? 'Eigenes Business' : 'Your Own Business',
                    desc: lang === 'de' ? 'Seien Sie Ihr eigener Chef' : 'Be your own boss'
                  },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 hover:bg-white/15 transition-all border border-white/20"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-sky-100">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-16 pt-12 border-t border-white/20"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '500+', label: lang === 'de' ? 'Aktive Partner' : 'Active Partners' },
                { value: '6', label: lang === 'de' ? 'Karrierestufen' : 'Career Levels' },
                { value: '€50', label: lang === 'de' ? 'Min. Auszahlung' : 'Min. Payout' },
                { value: '100%', label: lang === 'de' ? 'Weiterempfehlung' : 'Recommendation' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl lg:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-sky-200">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== CONTACT SECTION ====== */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sky-600 font-semibold text-sm uppercase tracking-wider">
              {lang === 'de' ? 'Kontakt' : 'Contact'}
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-neutral-900 mt-2">
              {lang === 'de' ? 'Wir sind für Sie da' : 'We are here for you'}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sky-100 flex items-center justify-center">
                <Phone className="w-7 h-7 text-sky-600" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{lang === 'de' ? 'Telefon' : 'Phone'}</h3>
              <a href={`tel:${brandConfig.company.phone}`} className="text-sky-600 hover:text-sky-700">
                {brandConfig.company.phone}
              </a>
            </div>
            <div className="text-center p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sky-100 flex items-center justify-center">
                <Mail className="w-7 h-7 text-sky-600" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{lang === 'de' ? 'E-Mail' : 'Email'}</h3>
              <a href={`mailto:${brandConfig.company.email}`} className="text-sky-600 hover:text-sky-700">
                {brandConfig.company.email}
              </a>
            </div>
            <div className="text-center p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sky-100 flex items-center justify-center">
                <MapPin className="w-7 h-7 text-sky-600" />
              </div>
              <h3 className="font-semibold text-neutral-900 mb-2">{lang === 'de' ? 'Adresse' : 'Address'}</h3>
              <p className="text-neutral-600 text-sm">Wien, Österreich</p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== TRUST FOOTER ====== */}
      <section className="py-16 bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Truck, title: lang === 'de' ? 'Schneller Versand' : 'Fast Shipping', desc: lang === 'de' ? '3-7 Werktage' : '3-7 business days' },
              { icon: Shield, title: lang === 'de' ? '14 Tage Rückgabe' : '14 Day Returns', desc: lang === 'de' ? 'Ohne Risiko testen' : 'Risk-free trial' },
              { icon: Award, title: lang === 'de' ? '2 Jahre Garantie' : '2 Year Warranty', desc: lang === 'de' ? 'Voller Schutz' : 'Full coverage' },
              { icon: Headphones, title: lang === 'de' ? 'Premium Support' : 'Premium Support', desc: lang === 'de' ? 'Persönliche Beratung' : 'Personal consultation' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <div className="font-semibold text-neutral-900 text-sm">{item.title}</div>
                  <div className="text-xs text-neutral-500">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
