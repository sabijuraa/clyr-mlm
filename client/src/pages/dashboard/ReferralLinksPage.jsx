import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, Copy, Share2, QrCode, Download, Lightbulb } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import ReferralLinkCard from '../../components/dashboard/ReferralLinkCard';
import Button from '../../components/common/Button';
import { copyToClipboard } from '../../utils/helpers';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ReferralLinksPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);

  const referralCode = user?.referralCode || user?.referral_code || 'CODE';
  const baseUrl = window.location.origin;

  const mainLink = `${baseUrl}?ref=${referralCode}`;
  const partnerLink = `${baseUrl}/partner/register?ref=${referralCode}`;

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await api.get('/products');
        const prods = res.data.products || res.data || [];
        setProducts(Array.isArray(prods) ? prods : []);
      } catch (e) { console.error('Failed to load products:', e); }
    };
    loadProducts();
  }, []);

  const handleCopy = async (link) => {
    const success = await copyToClipboard(link);
    if (success) {
      toast.success('Link kopiert!');
    }
  };

  const productLinks = products.map(product => {
    let images = product.images || [];
    if (typeof images === 'string') { try { images = JSON.parse(images); } catch(e) { images = []; } }
    return {
      ...product,
      link: `${baseUrl}/product/${product.slug}?ref=${referralCode}`,
      image: images[0] || '/images/products/clyr-soda-system.png'
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-secondary-700">
          Empfehlungslinks
        </h1>
        <p className="text-secondary-500">
          Teilen Sie diese Links, um Provisionen zu verdienen
        </p>
      </div>

      {/* Main Links */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Shop Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-secondary-600 to-secondary-700 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Haupt-Shoplink</h3>
              <p className="text-white/70 text-sm">Für Kundenbestellungen</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-white/20 rounded-xl mb-4">
            <input
              type="text"
              value={mainLink}
              readOnly
              className="flex-1 bg-transparent text-sm truncate outline-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 bg-white/20 hover:bg-white/30 text-white"
              icon={Copy}
              onClick={() => handleCopy(mainLink)}
            >
              Link kopieren
            </Button>
            <button className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <QrCode className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Partner Registration Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Partner-Registrierung</h3>
              <p className="text-white/70 text-sm">Für neue Teammitglieder</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-white/20 rounded-xl mb-4">
            <input
              type="text"
              value={partnerLink}
              readOnly
              className="flex-1 bg-transparent text-sm truncate outline-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 bg-white/20 hover:bg-white/30 text-white"
              icon={Copy}
              onClick={() => handleCopy(partnerLink)}
            >
              Link kopieren
            </Button>
            <button className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <QrCode className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Referral Code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 p-6"
      >
        <h3 className="font-semibold text-secondary-700 mb-4">Ihr Empfehlungscode</h3>
        <div className="flex items-center gap-4">
          <div className="px-6 py-4 bg-gray-100 rounded-xl">
            <span className="text-3xl font-mono font-bold text-gradient">{referralCode}</span>
          </div>
          <div className="text-sm text-secondary-500">
            <p>Teilen Sie diesen Code mit Kunden.</p>
            <p>Sie können ihn beim Checkout eingeben.</p>
          </div>
        </div>
      </motion.div>

      {/* Product Links */}
      <div>
        <h2 className="text-xl font-heading font-semibold text-secondary-700 mb-6">
          Produktspezifische Links
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {productLinks.map((product, index) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <img src={product.image} alt={product.name} className="w-12 h-12 object-contain rounded-lg bg-gray-50 p-1" />
                <h3 className="font-semibold text-secondary-700 text-sm">{product.name}</h3>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-3">
                <input type="text" value={product.link} readOnly
                  className="flex-1 bg-transparent text-xs truncate outline-none text-secondary-600" />
              </div>
              <Button variant="outline" size="sm" icon={Copy} className="w-full"
                onClick={() => handleCopy(product.link)}>
                Link kopieren
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-50 rounded-2xl p-6 border border-secondary-100"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary-700 mb-3">Tipps für mehr Erfolg</h3>
            <ul className="space-y-2 text-sm text-secondary-700">
              <li>Teilen Sie produktspezifische Links in relevanten Gruppen</li>
              <li>Nutzen Sie den Partner-Link, wenn jemand Interesse am Geschäft zeigt</li>
              <li>Erstellen Sie QR-Codes für Ihre Visitenkarten</li>
              <li>Verfolgen Sie Ihre Klicks und Conversions, um zu optimieren</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReferralLinksPage;