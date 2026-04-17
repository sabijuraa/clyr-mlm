import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Trash2, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import CartItem from '../../components/shop/CartItem';
import CartSummary from '../../components/shop/CartSummary';

const CartPage = () => {
  const { lang } = useLanguage();
  const { items, clearCart, itemCount } = useCart();

  const isEmpty = itemCount === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-700">
                {lang === 'de' ? 'Warenkorb' : 'Shopping Cart'}
              </h1>
              <p className="text-secondary-500 mt-1">
                {itemCount} {itemCount === 1 ? (lang === 'de' ? 'Artikel' : 'item') : (lang === 'de' ? 'Artikel' : 'items')} {lang === 'de' ? 'in Ihrem Warenkorb' : 'in your cart'}
              </p>
            </div>
            {!isEmpty && (
              <button
                onClick={clearCart}
                className="flex items-center gap-2 px-4 py-2 text-secondary-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'de' ? 'Leeren' : 'Clear'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary-700 flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-700 mb-3">
              {lang === 'de' ? 'Ihr Warenkorb ist leer' : 'Your cart is empty'}
            </h2>
            <p className="text-secondary-500 mb-8 max-w-md mx-auto">
              {lang === 'de' 
                ? 'Entdecken Sie unsere Produkte und finden Sie Ihren perfekten Wasserfilter.'
                : 'Discover our products and find your perfect water filter.'}
            </p>
            <Link 
              to="/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary-700 text-white font-semibold rounded-full hover:bg-primary-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {lang === 'de' ? 'Produkte entdecken' : 'Browse Products'}
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </AnimatePresence>

              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium mt-6"
              >
                <ArrowLeft className="w-4 h-4" />
                {lang === 'de' ? 'Weiter einkaufen' : 'Continue Shopping'}
              </Link>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-24">
                <CartSummary />
                
                <div className="mt-6 p-4 bg-secondary-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-primary-400" />
                    <div>
                      <p className="font-medium text-white">{lang === 'de' ? 'Sicher einkaufen' : 'Secure Shopping'}</p>
                      <p className="text-sm text-gray-300">{lang === 'de' ? 'SSL-verschlüsselt' : 'SSL encrypted'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
