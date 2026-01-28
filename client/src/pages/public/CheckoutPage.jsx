import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, CreditCard } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import CheckoutForm from '../../components/shop/CheckoutForm';
import { formatCurrency } from '../../config/app.config';
import toast from 'react-hot-toast';

const CheckoutPage = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { items, totals, clearCart, isEmpty, referral } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);

  if (isEmpty) {
    navigate('/warenkorb');
    return null;
  }

  const handleSubmit = async (formData) => {
    setIsProcessing(true);
    try {
      const orderData = {
        customer: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          company: formData.company,
          vatId: formData.vatId,
          phone: formData.phone
        },
        billingAddress: {
          street: formData.street,
          zip: formData.zip,
          city: formData.city,
          country: formData.country
        },
        shippingAddress: formData.sameShipping ? null : {
          street: formData.shippingStreet,
          zip: formData.shippingZip,
          city: formData.shippingCity,
          country: formData.shippingCountry
        },
        items: items.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        referralCode: referral,
        paymentMethod: formData.paymentMethod
      };

      const { ordersAPI } = await import('../../services/api');
      const response = await ordersAPI.create(orderData);
      const orderId = response.data.order.order_number;
      
      clearCart();
      toast.success(lang === 'de' ? 'Bestellung erfolgreich!' : 'Order successful!');
      navigate(`/bestellung/${orderId}`);
      
    } catch (error) {
      toast.error(lang === 'de' ? 'Fehler bei der Bestellung.' : 'Order failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              {lang === 'de' ? 'Kasse' : 'Checkout'}
            </h1>
            <div className="flex items-center gap-2 text-teal-600">
              <Lock className="w-5 h-5" />
              <span className="text-sm font-medium">{lang === 'de' ? 'Sichere Verbindung' : 'Secure Connection'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <CheckoutForm onSubmit={handleSubmit} isProcessing={isProcessing} />
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-24"
            >
              <h3 className="font-bold text-xl text-gray-900 mb-6">
                {lang === 'de' ? 'Bestellübersicht' : 'Order Summary'}
              </h3>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => {
                  const images = typeof item.images === 'string' ? JSON.parse(item.images) : item.images || [];
                  const image = images[0] || item.image || '/images/placeholder.jpg';
                  
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        <img src={image} alt={item.name} className="w-full h-full object-contain p-2" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-sm text-gray-500">{lang === 'de' ? 'Menge' : 'Qty'}: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>{lang === 'de' ? 'Zwischensumme' : 'Subtotal'}</span>
                  <span>{totals.formatted?.subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{lang === 'de' ? 'Versand' : 'Shipping'}</span>
                  <span>{totals.formatted?.shipping}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{lang === 'de' ? 'MwSt.' : 'VAT'}</span>
                  <span>{totals.formatted?.vat}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t border-gray-100">
                  <span>{lang === 'de' ? 'Gesamt' : 'Total'}</span>
                  <span className="text-teal-600">{totals.formatted?.total}</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-teal-800">{lang === 'de' ? 'Sicher einkaufen' : 'Secure Shopping'}</p>
                    <p className="text-xs text-teal-600">{lang === 'de' ? 'SSL-verschlüsselt' : 'SSL encrypted'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <CreditCard className="w-6 h-6 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{lang === 'de' ? 'Sichere Zahlung' : 'Secure Payment'}</p>
                    <p className="text-xs text-gray-500">Visa, Mastercard, PayPal</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;