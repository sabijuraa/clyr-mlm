import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Mail, ArrowRight, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import confetti from 'canvas-confetti';

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const { lang } = useLanguage();

  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const interval = setInterval(() => {
      if (Date.now() > end) return clearInterval(interval);

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3d4f5f', '#5fb3b3', '#2DD4BF']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#3d4f5f', '#5fb3b3', '#2DD4BF']
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-28 h-28 mx-auto mb-8 rounded-full bg-secondary-700
              flex items-center justify-center shadow-xl shadow-secondary-700/30"
          >
            <CheckCircle className="w-14 h-14 text-primary-400" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-secondary-700 mb-4"
          >
            {lang === 'de' ? 'Vielen Dank für Ihre Bestellung!' : 'Thank you for your order!'}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-secondary-500 mb-8"
          >
            {lang === 'de' 
              ? 'Ihre Bestellung wurde erfolgreich aufgegeben.' 
              : 'Your order has been successfully placed.'}
          </motion.p>

          {/* Order Number */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="inline-block bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-10"
          >
            <p className="text-sm text-secondary-500 mb-1">{lang === 'de' ? 'Bestellnummer' : 'Order Number'}</p>
            <p className="text-2xl font-bold text-secondary-700">{orderId}</p>
          </motion.div>

          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid md:grid-cols-2 gap-4 mb-12"
          >
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-left">
              <div className="w-12 h-12 rounded-xl bg-secondary-700 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="font-semibold text-secondary-700 mb-2">
                {lang === 'de' ? 'E-Mail Bestätigung' : 'Email Confirmation'}
              </h3>
              <p className="text-sm text-secondary-500">
                {lang === 'de' 
                  ? 'Sie erhalten in Kürze eine Bestätigung per E-Mail.' 
                  : 'You will receive a confirmation email shortly.'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-left">
              <div className="w-12 h-12 rounded-xl bg-secondary-700 flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="font-semibold text-secondary-700 mb-2">
                {lang === 'de' ? 'Versand' : 'Shipping'}
              </h3>
              <p className="text-sm text-secondary-500">
                {lang === 'de' 
                  ? 'Ihre Bestellung wird in 2-4 Werktagen geliefert.' 
                  : 'Your order will be delivered in 2-4 business days.'}
              </p>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Link 
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary-700 text-white font-semibold rounded-full hover:bg-primary-500 transition-colors"
            >
              {lang === 'de' ? 'Weiter einkaufen' : 'Continue Shopping'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary-100 text-secondary-700 font-semibold rounded-full hover:bg-secondary-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              {lang === 'de' ? 'Zur Startseite' : 'Back to Home'}
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
