import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin } from 'lucide-react';
import {
  ArrowRight, Droplets, Shield, Leaf, Award, Truck, Headphones,
  Star, ShoppingBag, Users, GraduationCap,
  Zap, Clock, Briefcase, Heart, Sparkles, Quote, Target, Download
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import brandConfig from '../../config/brand.config';
import toast from 'react-hot-toast';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: Math.min(i * 0.1, 0.4), ease: [0.22, 1, 0.36, 1] }
  })
};

const HomePage = () => {
  const { lang } = useLanguage();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const newsletter = searchParams.get('newsletter');
    if (newsletter === 'confirmed') {
      toast.success(lang === 'de' ? 'Newsletter-Anmeldung bestaetigt!' : 'Newsletter subscription confirmed!');
      searchParams.delete('newsletter');
      setSearchParams(searchParams, { replace: true });
    } else if (newsletter === 'error') {
      toast.error(lang === 'de' ? 'Link ungueltig oder bereits bestaetigt' : 'Link invalid or already confirmed');
      searchParams.delete('newsletter');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const t = (de, en) => lang === 'de' ? de : en;

  const testimonials = [
    { quote: t('Seit wir CLYR nutzen, trinken wir deutlich mehr Wasser und fühlen uns energiegeladener im Alltag.', 'Since using CLYR, we drink significantly more water and feel more energized in our daily lives.'), author: 'Familie M.', location: t('Kärnten', 'Carinthia') },
    { quote: t('Die Kombination aus Technik, Design und Komfort hat uns sofort überzeugt.', 'The combination of technology, design and comfort convinced us immediately.'), author: 'Thomas & Sarah K.', location: 'Salzburg' },
    { quote: t('Endlich eine Lösung, die Gesundheit und Alltag wirklich verbindet.', 'Finally a solution that truly connects health and everyday life.'), author: 'Dr. Anna W.', location: 'Wien' },
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* SECTION 1 — PREMIUM HERO */}
      <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-800 via-secondary-700 to-primary-900" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-primary-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-[600px] h-[600px] bg-primary-300/8 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm rounded-full text-primary-300 text-sm font-medium mb-10 border border-white/15">
              <Droplets className="w-4 h-4" /><span>CLYR Solutions GmbH</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }}
              className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold text-white leading-[1.1] mb-8">
              {t(<>Mehr als Wasser.<br /><span className="text-primary-300">Ein neuer Standard</span> für<br />Gesundheit und Lebensqualität.</>,
                <>More than Water.<br /><span className="text-primary-300">A New Standard</span> for<br />Health and Quality of Life.</>)}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
              className="text-lg md:text-xl text-secondary-200 max-w-2xl mx-auto leading-relaxed mb-6">
              {t('CLYR verbindet modernste Wassertechnologie mit dem Anspruch, Gesundheit, Komfort und Lifestyle auf ein neues Niveau zu bringen.',
                'CLYR combines cutting-edge water technology with the aspiration to elevate health, comfort and lifestyle to a new level.')}
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}
              className="text-base md:text-lg text-primary-300 font-semibold max-w-2xl mx-auto mb-12">
              {t('Weltweit einzigartig: Gefiltertes Sprudelwasser direkt aus dem Wasserhahn - eine Innovation, die es sonst nirgends gibt.',
                'World-first innovation: Filtered sparkling water straight from your tap - available nowhere else.')}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link to="/products" className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-secondary-800 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-xl hover:-translate-y-0.5">
                <ShoppingBag className="w-5 h-5" />{t('Jetzt entdecken', 'Discover Now')}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/partner/register" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-transparent text-white font-semibold rounded-xl border-2 border-white/25 hover:border-primary-400 hover:text-primary-300 transition-all">
                <Users className="w-5 h-5" />{t('Partner werden', 'Become Partner')}
              </Link>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-8 text-sm text-secondary-300">
              {[{ icon: Shield, text: t('2 Jahre Garantie', '2 Year Warranty') }, { icon: Droplets, text: t('9-Stufen Filtration', '9-Stage Filtration') }, { icon: Leaf, text: t('Nachhaltig & plastikfrei', 'Sustainable & plastic-free') }].map((item, i) => (
                <div key={i} className="flex items-center gap-2"><item.icon className="w-4 h-4 text-primary-400" /><span>{item.text}</span></div>
              ))}
            </motion.div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" className="w-full"><path d="M0,64 C360,0 720,80 1440,32 L1440,80 L0,80 Z" fill="white" /></svg>
        </div>
      </section>

      {/* SECTION 2 — WHY WATER QUALITY MATTERS */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp}>
              <p className="text-primary-500 uppercase tracking-[0.15em] text-sm font-semibold mb-4">{t('Wissen', 'Knowledge')}</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-800 leading-tight mb-6">{t('Warum Wasserqualität entscheidend ist', 'Why Water Quality Matters')}</h2>
              <div className="space-y-4 text-secondary-600 text-lg leading-relaxed">
                <p>{t('Unser Körper besteht zu einem großen Teil aus Wasser. Trotzdem wird Wasserqualität im Alltag oft unterschätzt.', 'Our body is largely made up of water. Yet water quality is often underestimated in everyday life.')}</p>
                <p>{t('Moderne Umweltbelastungen, Rückstände aus Medikamenten, Mikroplastik oder alte Leitungssysteme können die Qualität unseres Trinkwassers beeinflussen.', 'Modern environmental pollutants, medication residues, microplastics or old pipe systems can affect the quality of our drinking water.')}</p>
                <p className="font-medium text-secondary-700">{t('CLYR entwickelt Lösungen, die Wasser wieder zu dem machen, was es sein sollte: rein, hochwertig und zuverlässig.', 'CLYR develops solutions that make water what it should be: pure, high-quality and reliable.')}</p>
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp} custom={2} className="grid grid-cols-2 gap-5">
              {[{ value: '99.9%', label: t('Schadstoff-Filtration', 'Contaminant Filtration'), icon: Shield }, { value: '9', label: t('Filterstufen', 'Filter Stages'), icon: Droplets }, { value: '0%', label: t('Mikroplastik', 'Microplastics'), icon: Leaf }, { value: '24/7', label: t('Reines Wasser', 'Pure Water'), icon: Zap }].map((stat, i) => (
                <motion.div key={i} variants={fadeUp} custom={i * 0.3} className="bg-gray-50 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-gray-100">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-primary-100 flex items-center justify-center mb-4"><stat.icon className="w-6 h-6 text-primary-600" /></div>
                  <div className="text-3xl font-heading font-bold text-secondary-800 mb-1">{stat.value}</div>
                  <div className="text-sm text-secondary-500">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — WHAT MAKES CLYR DIFFERENT */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-secondary-800 via-secondary-700 to-secondary-800 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-[400px] h-[400px] bg-primary-400/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-primary-300/6 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp} className="text-center mb-16">
            <p className="text-primary-400 uppercase tracking-[0.15em] text-sm font-semibold mb-4">{t('Unsere Stärken', 'Our Strengths')}</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-6">{t('Was CLYR anders macht', 'What Makes CLYR Different')}</h2>
            <p className="text-secondary-200 text-lg max-w-2xl mx-auto">{t('CLYR steht für kompromisslose Qualität und Innovation. Unsere Systeme kombinieren modernste Filtertechnologie mit hochwertiger Verarbeitung und intelligentem Design.', 'CLYR stands for uncompromising quality and innovation. Our systems combine cutting-edge filter technology with premium craftsmanship and intelligent design.')}</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Droplets, title: t('Höchste Wasserqualität', 'Highest Water Quality'), desc: t('9-Stufen Filtration eliminiert Schadstoffe, Mikroplastik und Medikamentenrückstände.', '9-stage filtration eliminates contaminants, microplastics and medication residues.') },
              { icon: Sparkles, title: t('Modernes, elegantes Design', 'Modern, Elegant Design'), desc: t('Kompakte Systeme, die sich harmonisch in jede Küche integrieren.', 'Compact systems that blend harmoniously into any kitchen.') },
              { icon: Zap, title: t('Alltagstaugliche Bedienung', 'Everyday Usability'), desc: t('Intuitiv und einfach – reines Wasser direkt aus dem Wasserhahn, ohne komplizierte Routinen.', 'Intuitive and simple – pure water straight from your faucet, no complicated routines.') },
              { icon: Leaf, title: t('Nachhaltige Lösungen', 'Sustainable Solutions'), desc: t('Schluss mit Plastikflaschen. Gut für Ihre Familie und die Umwelt.', 'No more plastic bottles. Good for your family and the environment.') },
              { icon: Shield, title: t('Technologie auf höchstem Niveau', 'Top-Level Technology'), desc: t('LED-UVC Entkeimung, Bio-Tuner und automatische Membranspülung.', 'LED-UVC disinfection, Bio-Tuner and automatic membrane flushing.') },
              { icon: Heart, title: t('Für die ganze Familie', 'For the Whole Family'), desc: t('Gesundes Wasser für Kochen, Trinken und das Wohlbefinden der ganzen Familie.', 'Healthy water for cooking, drinking and the wellbeing of your whole family.') },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp} custom={i * 0.5}
                className="bg-secondary-600/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-primary-400/30 hover:bg-secondary-600/70 transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-primary-400/15 flex items-center justify-center mb-5">
                  <item.icon className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="text-lg font-heading font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-secondary-200 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — ABOUT CLYR TEASER */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp} className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-secondary-100 to-secondary-50 rounded-3xl -rotate-2" />
              <img src="/images/founders-together.jpeg" alt="CLYR Gründer" className="relative rounded-2xl w-full shadow-xl object-cover" />
              <div className="absolute -bottom-3 -right-3 sm:-bottom-6 sm:-right-6 bg-white rounded-2xl p-5 shadow-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center"><Target className="w-6 h-6 text-primary-600" /></div>
                  <div>
                    <p className="font-heading font-bold text-secondary-800">{t('Gegründet aus', 'Founded from')}</p>
                    <p className="text-sm text-primary-600 font-medium">{t('Überzeugung', 'Conviction')}</p>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp} custom={1}>
              <p className="text-primary-500 uppercase tracking-[0.15em] text-sm font-semibold mb-4">{t('Über CLYR', 'About CLYR')}</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-800 leading-tight mb-6">{t('Gesundheit einfacher, zugänglicher und moderner machen', 'Making health simpler, more accessible and more modern')}</h2>
              <div className="space-y-4 text-secondary-600 text-lg leading-relaxed">
                <p>{t('CLYR entstand aus der Vision, Gesundheit einfacher, zugänglicher und moderner zu machen.', 'CLYR was born from the vision of making health simpler, more accessible and more modern.')}</p>
                <p>{t('Gegründet von Menschen, die medizinisches Verständnis, technische Expertise und unternehmerische Leidenschaft vereinen.', 'Founded by people who combine medical understanding, technical expertise and entrepreneurial passion.')}</p>
                <p>{t('Unser Ziel ist es, Wasserqualität neu zu denken – für Familien, Gesundheitsbewusste und Menschen, die ihren Alltag bewusst gestalten möchten.', 'Our goal is to rethink water quality – for families, health-conscious people and those who want to consciously shape their everyday lives.')}</p>
              </div>
              <Link to="/about" className="inline-flex items-center gap-2 mt-8 px-6 py-3 bg-secondary-800 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors">
                {t('Mehr über uns erfahren', 'Learn More About Us')}<ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — LIFESTYLE / EMOTIONAL */}
      <section className="relative py-20 sm:py-32 md:py-44 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-800 via-secondary-700 to-primary-900" />
        <div className="absolute inset-0 opacity-20"><div className="absolute top-0 left-0 w-full h-full bg-[url('/images/products/clyr-soda-system.png')] bg-cover bg-center" /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-900/90 via-secondary-800/80 to-primary-900/70" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp}>
            <p className="text-primary-300 uppercase tracking-[0.2em] text-sm font-medium mb-6">Lifestyle</p>
            <h2 className="text-3xl md:text-5xl font-heading font-bold text-white leading-tight mb-8">{t('CLYR ist nicht nur Technologie – es ist ein Lebensgefühl.', "CLYR is not just technology – it's a way of life.")}</h2>
            <p className="text-xl text-secondary-200 max-w-2xl mx-auto leading-relaxed mb-4">{t('Reines Wasser beeinflusst Energie, Wohlbefinden und Lebensqualität im Alltag.', 'Pure water influences energy, wellbeing and quality of life in everyday life.')}</p>
            <p className="text-lg text-secondary-300 max-w-2xl mx-auto leading-relaxed">{t('Unsere Systeme sind dafür entwickelt, sich harmonisch in moderne Haushalte zu integrieren – stilvoll, effizient und komfortabel.', 'Our systems are designed to integrate harmoniously into modern households – stylish, efficient and comfortable.')}</p>
          </motion.div>
        </div>
      </section>

      {/* SECTION 6 — TESTIMONIALS */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp} className="text-center mb-16">
            <p className="text-primary-500 uppercase tracking-[0.15em] text-sm font-semibold mb-4">{t('Erfahrungen', 'Testimonials')}</p>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-secondary-800">{t('Was unsere Kunden sagen', 'What Our Customers Say')}</h2>
          </motion.div>
          <div className="relative">
            <motion.div key={activeTestimonial} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
              className="bg-white rounded-3xl p-10 md:p-14 shadow-lg border border-gray-100 text-center">
              <Quote className="w-12 h-12 text-primary-200 mx-auto mb-6" />
              <p className="text-xl md:text-2xl text-secondary-700 font-medium leading-relaxed mb-8 italic">&#8222;{testimonials[activeTestimonial].quote}&#8220;</p>
              <p className="font-heading font-semibold text-secondary-800">{testimonials[activeTestimonial].author}</p>
              <p className="text-secondary-500 text-sm">{testimonials[activeTestimonial].location}</p>
            </motion.div>
            <div className="flex justify-center gap-3 mt-8">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${i === activeTestimonial ? 'bg-primary-500 w-8' : 'bg-secondary-300 hover:bg-secondary-400'}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7B — PARTNER / COMMUNITY */}
      <section className="py-20 md:py-28 bg-secondary-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp}>
              <p className="text-primary-400 uppercase tracking-[0.15em] text-sm font-semibold mb-4">{t('Karriere', 'Career')}</p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-white leading-tight mb-6">{t('Werden Sie Teil einer wachsenden Community', 'Become Part of a Growing Community')}</h2>
              <p className="text-secondary-200 text-lg leading-relaxed mb-6">{t('CLYR bietet nicht nur innovative Wasserlösungen, sondern auch die Möglichkeit, Teil einer wachsenden Community zu werden.', 'CLYR offers not only innovative water solutions, but also the opportunity to become part of a growing community.')}</p>
              <p className="text-secondary-300 text-lg leading-relaxed mb-10">{t('Wir geben Menschen die Chance, Gesundheit zu fördern und gleichzeitig neue berufliche Perspektiven aufzubauen.', 'We give people the opportunity to promote health while building new professional perspectives.')}</p>
              <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {[
                  { icon: Briefcase, text: t('Eigenes Business aufbauen', 'Build Your Own Business') },
                  { icon: Users, text: t('Starkes Team & Community', 'Strong Team & Community') },
                  { icon: GraduationCap, text: t('CLYR Academy Schulungen', 'CLYR Academy Training') },
                  { icon: Clock, text: t('Flexible Arbeitszeiten', 'Flexible Working Hours') },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary-700/50 rounded-xl p-4 border border-secondary-600/30">
                    <div className="w-10 h-10 bg-secondary-600 rounded-lg flex items-center justify-center flex-shrink-0"><item.icon className="w-5 h-5 text-primary-400" /></div>
                    <span className="font-medium text-white text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/partner/register" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-secondary-800 font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-lg">
                  {t('Partner werden', 'Become Partner')}<ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/about" className="inline-flex items-center justify-center gap-3 px-8 py-4 border-2 border-white/25 text-white font-semibold rounded-xl hover:border-primary-400 hover:text-primary-300 transition-all">
                  {t('Mehr erfahren', 'Learn More')}
                </Link>
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp} custom={2}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8 pb-8 border-b border-gray-100">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="w-10 h-10 text-primary-700" /></div>
                  <h3 className="text-2xl font-heading font-bold text-secondary-800">{t('Ihre Karriere bei CLYR', 'Your Career at CLYR')}</h3>
                  <p className="text-secondary-500 mt-2">{t('6 Karrierestufen warten auf Sie', '6 career levels await you')}</p>
                </div>
                <div className="space-y-4">
                  {[
                    { icon: Star, title: t('Attraktive Vergütung', 'Attractive Compensation'), desc: t('Leistungsbasierte Provisionen', 'Performance-based rewards') },
                    { icon: GraduationCap, title: t('Umfassende Schulung', 'Comprehensive Training'), desc: t('CLYR Academy für Ihren Erfolg', 'CLYR Academy for your success') },
                    { icon: Shield, title: t('Premium Marke', 'Premium Brand'), desc: t('Hochwertige Produkte verkaufen', 'Sell high-quality products') },
                    { icon: Heart, title: t('Starke Community', 'Strong Community'), desc: t('Teil eines wachsenden Teams', 'Part of a growing team') },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-secondary-800 transition-colors group cursor-default">
                      <div className="w-10 h-10 bg-secondary-800 group-hover:bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"><item.icon className="w-5 h-5 text-primary-400 group-hover:text-white transition-colors" /></div>
                      <div>
                        <h4 className="font-semibold text-secondary-800 group-hover:text-white transition-colors">{item.title}</h4>
                        <p className="text-sm text-secondary-500 group-hover:text-secondary-300 transition-colors">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 8 — FINAL CTA */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.05 }} variants={fadeUp}>
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-8"><Droplets className="w-8 h-8 text-primary-600" /></div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-secondary-800 leading-tight mb-6">{t('Entdecke die neue Dimension von Wasserqualität.', 'Discover the New Dimension of Water Quality.')}</h2>
            <p className="text-secondary-500 text-lg max-w-2xl mx-auto mb-12">{t('Machen Sie den ersten Schritt zu reinerem Wasser, mehr Gesundheit und einem bewussteren Lebensstil.', 'Take the first step towards purer water, better health and a more conscious lifestyle.')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Link to="/products" className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-secondary-800 text-white font-semibold rounded-xl hover:bg-primary-600 transition-all shadow-lg hover:-translate-y-0.5">
                <ShoppingBag className="w-5 h-5" />{t('Produkte entdecken', 'Discover Products')}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="/api/downloads/CLYR-Broschuere.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-lg hover:-translate-y-0.5">
                <Download className="w-5 h-5" />{t('Download Broschüre', 'Download Brochure')}
              </a>
              <Link to="/partner/register" className="inline-flex items-center justify-center gap-3 px-8 py-4 border-2 border-secondary-200 text-secondary-700 font-semibold rounded-xl hover:border-primary-400 hover:text-primary-600 transition-all">
                <Users className="w-5 h-5" />{t('Partner werden', 'Become Partner')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-10 items-center">
            {[{ icon: Shield, text: t('2 Jahre Garantie', '2 Year Warranty') }, { icon: Truck, text: t('Schnelle Lieferung', 'Fast Delivery') }, { icon: Headphones, text: t('Premium Support', 'Premium Support') }, { icon: Award, text: t('Zertifizierte Qualität', 'Certified Quality') }].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-secondary-700">
                <div className="w-10 h-10 bg-secondary-800 rounded-lg flex items-center justify-center"><item.icon className="w-5 h-5 text-primary-400" /></div>
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