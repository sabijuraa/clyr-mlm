import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Truck, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import appConfig from '../../config/app.config';
import Button from '../common/Button';

const CartSummary = ({ showCheckoutButton = true }) => {
  const { totals, country, setCountry, isEmpty } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (isEmpty) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-24"
    >
      <h3 className="font-heading font-semibold text-xl text-gray-900 mb-6">
        {t('cart.title')}
      </h3>

      {/* Country Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('form.country')}
        </label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl 
            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          {Object.entries(appConfig.countries).map(([code, data]) => (
            <option key={code} value={code}>
              {data.name}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Lines */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-gray-600">
          <span>{t('cart.subtotal')}</span>
          <span className="font-medium">{totals.formatted.subtotal}</span>
        </div>
        
        <div className="flex justify-between text-gray-600">
          <span className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            {t('cart.shipping')}
          </span>
          <span className="font-medium">{totals.formatted.shipping}</span>
        </div>
        
        <div className="flex justify-between text-gray-600">
          <span>{t('cart.vat')} ({appConfig.countries[country]?.vatLabel})</span>
          <span className="font-medium">{totals.formatted.vat}</span>
        </div>

        <hr className="border-gray-200 my-4" />

        <div className="flex justify-between text-xl font-bold text-gray-900">
          <span>{t('cart.total')}</span>
          <span className="text-gradient">{totals.formatted.total}</span>
        </div>
      </div>

      {/* Checkout Button */}
      {showCheckoutButton && (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          icon={ArrowRight}
          iconPosition="right"
          onClick={() => navigate('/kasse')}
        >
          {t('cart.checkout')}
        </Button>
      )}

      {/* Trust Badges */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <ShieldCheck className="w-5 h-5 text-green-500" />
          <span>Sichere Zahlung mit SSL-Verschlüsselung</span>
        </div>
        <div className="flex gap-2">
          <img src="/visa.svg" alt="Visa" className="h-8 opacity-60" />
          <img src="/mastercard.svg" alt="Mastercard" className="h-8 opacity-60" />
          <img src="/sepa.svg" alt="SEPA" className="h-8 opacity-60" />
        </div>
      </div>
    </motion.div>
  );
};

export default CartSummary;