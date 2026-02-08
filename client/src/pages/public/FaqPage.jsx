// client/src/pages/public/FaqPage.jsx
// GROUP 8 #38: Public FAQ page
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';

const FaqPage = () => {
  const { lang } = useLanguage();
  const [faqItems, setFaqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('alle');

  useEffect(() => {
    api.get('/faq')
      .then(r => setFaqItems(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = ['alle', ...new Set(faqItems.map(i => i.category))];

  const filtered = faqItems.filter(item => {
    const matchCat = activeCategory === 'alle' || item.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || 
      (item.question || '').toLowerCase().includes(q) || 
      (item.answer || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const catLabels = {
    alle: 'Alle', allgemein: 'Allgemein', produkte: 'Produkte',
    versand: 'Versand', partner: 'Partner', bestellung: 'Bestellung'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-secondary-700 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <HelpCircle className="w-12 h-12 text-primary-400 mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {lang === 'de' ? 'Haeufig gestellte Fragen' : 'Frequently Asked Questions'}
          </h1>
          <p className="text-secondary-300 max-w-2xl mx-auto">
            {lang === 'de'
              ? 'Finden Sie Antworten auf die wichtigsten Fragen zu unseren Produkten, Versand und Partnerschaft.'
              : 'Find answers to the most important questions about our products, shipping, and partnership.'}
          </p>
          {/* Search */}
          <div className="relative max-w-md mx-auto mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'de' ? 'Frage suchen...' : 'Search questions...'}
              className="w-full pl-12 pr-4 py-3 rounded-xl border-0 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-secondary-700 text-white'
                  : 'bg-white text-secondary-600 hover:bg-secondary-100 border border-gray-200'
              }`}>
              {catLabels[cat] || cat}
            </button>
          ))}
        </div>

        {/* FAQ Items */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-secondary-500">
              {searchQuery ? 'Keine Ergebnisse gefunden.' : 'Noch keine FAQ-Eintraege.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button onClick={() => setOpenId(openId === item.id ? null : item.id)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-secondary-700 pr-4">
                    {lang === 'en' && item.question_en ? item.question_en : item.question}
                  </span>
                  <motion.div animate={{ rotate: openId === item.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-5 h-5 text-secondary-400 flex-shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openId === item.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="px-6 pb-5 text-secondary-600 leading-relaxed border-t border-gray-50 pt-4">
                        {(lang === 'en' && item.answer_en ? item.answer_en : item.answer)
                          .split('\n').map((line, i) => <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <h3 className="text-xl font-semibold text-secondary-700 mb-2">
            {lang === 'de' ? 'Frage nicht gefunden?' : 'Question not found?'}
          </h3>
          <p className="text-secondary-500 mb-4">
            {lang === 'de'
              ? 'Kontaktieren Sie uns direkt - wir helfen Ihnen gerne weiter.'
              : 'Contact us directly - we are happy to help.'}
          </p>
          <a href="mailto:service@clyr.shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-secondary-700 text-white rounded-xl hover:bg-secondary-800 transition-colors font-medium">
            service@clyr.shop
          </a>
        </div>
      </div>
    </div>
  );
};

export default FaqPage;
