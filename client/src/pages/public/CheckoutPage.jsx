// client/src/pages/public/CheckoutPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { referralAPI, ordersAPI } from '../../services/api';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { items: cartItems, referral: cartReferral, partnerName: cartPartnerName, clearCart, total, subtotal, vat, shipping } = useCart();
  
  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    vatId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: 'AT'
  });

  // Referral code state - auto-fill from CartContext, URL, or cookie
  const urlRef = searchParams.get('ref') || '';
  const initialRef = urlRef || cartReferral || localStorage.getItem('clyr_referral') || '';
  const [referralCode, setReferralCode] = useState(initialRef);
  const [referralValid, setReferralValid] = useState(false);
  const [referralPartner, setReferralPartner] = useState(cartPartnerName ? { first_name: cartPartnerName.split(' ')[0], last_name: cartPartnerName.split(' ')[1] || '' } : null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Auto-verify referral code on mount if present
  useEffect(() => {
    if (initialRef && !referralValid) {
      verifyReferralCodeFn(initialRef);
    }
  }, []); // eslint-disable-line

  // Tax calculation state
  const [taxInfo, setTaxInfo] = useState({ vatRate: 20, vatAmount: 0, isReverseCharge: false, vatNote: '' });

  // Use cart items from context - fallback to localStorage for backward compatibility
  const effectiveCartItems = cartItems.length > 0 ? cartItems : JSON.parse(localStorage.getItem('cart') || '[]');
  const effectiveSubtotal = cartItems.length > 0 ? subtotal : effectiveCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Shipping costs per country
  const shippingByCountry = { DE: 50, AT: 69, CH: 180 };
  const effectiveShipping = cartItems.length > 0 ? shipping : (shippingByCountry[formData.country] || 69);
  
  // VAT calculation based on country and VAT ID
  const getClientVatRate = () => {
    const { country, vatId } = formData;
    if (country === 'DE' && vatId) return 0; // Reverse charge
    if (country === 'DE') return 19;
    if (country === 'AT') return 20;
    if (country === 'CH') return 8.1;
    return 0;
  };
  const vatRate = getClientVatRate();
  const taxableAmount = effectiveSubtotal + effectiveShipping;
  const vatAmount = Math.round(taxableAmount * (vatRate / 100) * 100) / 100;
  const effectiveTotal = cartItems.length > 0 ? total : Math.round((taxableAmount + vatAmount) * 100) / 100;
  const isReverseCharge = formData.country === 'DE' && !!formData.vatId;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const verifyReferralCodeFn = async (code) => {
    const codeToCheck = code || referralCode;
    if (!codeToCheck.trim()) return;
    
    setVerifyingCode(true);
    try {
      const response = await referralAPI.verify(codeToCheck);
      const data = response.data;
      
      if (data.valid !== false) {
        setReferralCode(codeToCheck);
        setReferralValid(true);
        setReferralPartner(data.partner);
        // Store in localStorage for persistence
        localStorage.setItem('clyr_referral', codeToCheck);
        if (data.partner) {
          localStorage.setItem('clyr_referral_partner', `${data.partner.first_name} ${data.partner.last_name}`);
        }
      } else {
        setReferralValid(false);
        setReferralPartner(null);
      }
    } catch (error) {
      console.error('Error verifying referral code:', error);
      setReferralValid(false);
      setReferralPartner(null);
    } finally {
      setVerifyingCode(false);
    }
  };

  const verifyReferralCode = () => verifyReferralCodeFn();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData = {
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          company: formData.company || null,
          vatId: formData.vatId || null
        },
        billing: {
          street: formData.addressLine1 + (formData.addressLine2 ? ', ' + formData.addressLine2 : ''),
          zip: formData.postalCode,
          city: formData.city,
          country: formData.country
        },
        items: effectiveCartItems.map(item => ({
          productId: item.id || item.productId,
          quantity: item.quantity
        })),
        referralCode: referralValid ? referralCode : null,
        paymentMethod: 'invoice'
      };

      const response = await ordersAPI.create(orderData);
      const data = response.data;

      // Clear cart from both context and localStorage
      if (typeof clearCart === 'function') clearCart();
      localStorage.removeItem('cart');
      localStorage.removeItem('clyr_cart');
      navigate(`/order-confirmation/${data.order?.id || data.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      const msg = error.response?.data?.error || 'Fehler beim Erstellen der Bestellung';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Kasse</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Persönliche Daten</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Vorname *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nachname *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">E-Mail *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Telefon</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Lieferadresse</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Straße und Hausnummer *</label>
                    <input
                      type="text"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Adresszusatz</label>
                    <input
                      type="text"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">PLZ *</label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Stadt *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Land *</label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="AT">Oesterreich</option>
                        <option value="DE">Deutschland</option>
                        <option value="CH">Schweiz</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Firma (optional)</label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder="Firmenname"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        USt-IdNr. (optional)
                        {formData.country === 'DE' && formData.vatId && (
                          <span className="text-xs text-green-600 ml-2">Reverse Charge</span>
                        )}
                      </label>
                      <input
                        type="text"
                        name="vatId"
                        value={formData.vatId}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                        placeholder={formData.country === 'DE' ? 'DE123456789' : formData.country === 'AT' ? 'ATU12345678' : 'CHE-123.456.789'}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* REFERRAL CODE SECTION */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow border-2 border-blue-200">
                <h2 className="text-xl font-semibold mb-3 flex items-center">
                   Empfehlungscode (optional)
                </h2>
                <p className="text-sm text-gray-700 mb-4">
                  Haben Sie einen Empfehlungscode von einem Partner erhalten? Geben Sie ihn hier ein, 
                  damit Ihr Partner eine Provision erhält.
                </p>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Z.B. DEMO2025"
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-mono text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={20}
                    disabled={referralValid}
                  />
                  <button
                    type="button"
                    onClick={verifyReferralCode}
                    disabled={referralValid || !referralCode.trim() || verifyingCode}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {verifyingCode ? 'Prüfen...' : referralValid ? ' Angewendet' : 'Anwenden'}
                  </button>
                </div>
                
                {referralValid && referralPartner && (
                  <div className="mt-4 p-4 bg-green-100 border-2 border-green-300 text-green-800 rounded-lg flex items-start">
                    <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold"> Empfehlungscode akzeptiert!</p>
                      <p className="text-sm mt-1">
                        Ihr Partner: <strong>{referralPartner.first_name} {referralPartner.last_name}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {!referralValid && referralCode && (
                  <p className="mt-2 text-sm text-gray-600">
                     Tipp: Empfehlungscodes sind normalerweise 6-10 Zeichen lang
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {loading ? 'Bestellung wird erstellt...' : 'Bestellung abschließen'}
              </button>
            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="bg-white p-6 rounded-lg shadow sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Bestellübersicht</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {effectiveCartItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center border-b pb-4">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Menge: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">€{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span>Zwischensumme (netto)</span>
                  <span>{'\u20AC'}{effectiveSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Versand ({formData.country === 'DE' ? 'Deutschland' : formData.country === 'AT' ? 'Oesterreich' : 'Schweiz'})</span>
                  <span>{'\u20AC'}{effectiveShipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>
                    {isReverseCharge 
                      ? 'MwSt. (Reverse Charge 0%)' 
                      : `MwSt. (${vatRate}%)`
                    }
                  </span>
                  <span>{'\u20AC'}{vatAmount.toFixed(2)}</span>
                </div>
                {isReverseCharge && (
                  <p className="text-xs text-secondary-500 italic">
                    Steuerschuldnerschaft des Leistungsempfaengers
                  </p>
                )}
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Gesamt (brutto)</span>
                  <span>{'\u20AC'}{effectiveTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Security Badge */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Sichere SSL-Verschlüsselung
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}