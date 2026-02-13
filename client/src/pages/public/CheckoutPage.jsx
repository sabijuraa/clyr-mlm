// client/src/pages/public/CheckoutPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { referralAPI, ordersAPI } from '../../services/api';
import api from '../../services/api';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { items: cartItems, referral: cartReferral, partnerName: cartPartnerName, clearCart, total, subtotal, vat, shipping } = useCart();

  // Payment confirmation state - shown INLINE after Stripe redirect
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [confirmedOrderId, setConfirmedOrderId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('checking');
  const [downloading, setDownloading] = useState(false);

  // Handle Stripe redirect back to checkout - show confirmation INLINE
  useEffect(() => {
    const status = searchParams.get('status');
    const orderId = searchParams.get('order');
    const sessionId = searchParams.get('session_id');

    if (status === 'success' && orderId) {
      // Payment successful - show confirmation right here
      setOrderConfirmed(true);
      setConfirmedOrderId(orderId);
      if (typeof clearCart === 'function') clearCart();
      try {
        localStorage.removeItem('cart');
        localStorage.removeItem('clyr_cart');
      } catch (e) {}

      // Verify payment and trigger commission/invoice/email
      setPaymentStatus('verifying');
      api.post(`/orders/${orderId}/verify-payment`, { sessionId })
        .then(res => {
          setPaymentStatus(res.data?.status || 'paid');
        })
        .catch(err => {
          console.error('Payment verification failed:', err);
          setPaymentStatus('paid'); // Stripe only redirects on success
        });
      return;
    }
    if (status === 'cancelled') {
      alert('Zahlung wurde abgebrochen. Sie können es erneut versuchen.');
    }
  }, [searchParams, clearCart]);

  // Download invoice
  const handleDownloadInvoice = async () => {
    if (!confirmedOrderId) return;
    setDownloading(true);
    try {
      const res = await api.get(`/orders/${confirmedOrderId}/public-invoice`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rechnung-${confirmedOrderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Rechnung wird vorbereitet. Bitte versuchen Sie es in wenigen Minuten erneut.');
    } finally { setDownloading(false); }
  };

  // ===== CONFIRMATION VIEW (after successful Stripe payment) =====
  if (orderConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Success Icon */}
          <div className="w-28 h-28 mx-auto mb-8 rounded-full bg-green-100 flex items-center justify-center shadow-lg">
            <svg className="w-14 h-14 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Vielen Dank für Ihre Bestellung!
          </h1>

          <p className="text-xl text-gray-500 mb-8">
            {paymentStatus === 'verifying' 
              ? 'Zahlung wird überprüft...'
              : 'Ihre Zahlung war erfolgreich!'}
          </p>

          {/* Order Number */}
          <div className="inline-block bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-10">
            <p className="text-sm text-gray-500 mb-1">Bestellnummer</p>
            <p className="text-xl font-bold text-gray-800 font-mono">{confirmedOrderId}</p>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-12 text-left">
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">E-Mail Bestätigung</h3>
              <p className="text-sm text-gray-500">
                Sie erhalten in Kürze eine Bestätigung per E-Mail mit Ihrer Rechnung.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Versand</h3>
              <p className="text-sm text-gray-500">
                Ihre Bestellung wird in 2-4 Werktagen geliefert.
              </p>
            </div>
          </div>

          {/* Invoice Download */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-10 text-left">
            <h3 className="font-semibold text-gray-800 mb-2">Rechnung herunterladen</h3>
            <p className="text-sm text-gray-500 mb-3">
              Laden Sie Ihre Rechnung als PDF herunter.
            </p>
            <button onClick={handleDownloadInvoice} disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {downloading ? 'Wird erstellt...' : 'Rechnung PDF herunterladen'}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors">
              Weiter einkaufen
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-full hover:bg-gray-200 transition-colors">
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
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
  
  // Shipping costs per country - always based on checkout form selection
  const shippingByCountry = { DE: 0.50, AT: 0.50, CH: 0.50 };
  const effectiveShipping = formData.country in shippingByCountry ? shippingByCountry[formData.country] : 55;
  
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
  // ALWAYS calculate total locally using the checkout form's country and VAT ID
  // (cart context total uses default AT VAT which doesn't reflect Reverse Charge)
  const effectiveTotal = Math.round((taxableAmount + vatAmount) * 100) / 100;
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
      // Ensure items have integer productId
      const orderItems = effectiveCartItems.map(item => ({
        productId: parseInt(item.id || item.productId, 10),
        quantity: parseInt(item.quantity, 10) || 1
      })).filter(item => !isNaN(item.productId) && item.productId > 0);

      if (orderItems.length === 0) {
        alert('Warenkorb ist leer. Bitte fügen Sie Produkte hinzu.');
        setLoading(false);
        return;
      }

      const orderData = {
        customer: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          company: formData.company?.trim() || null,
          vatId: formData.vatId?.trim() || null
        },
        billing: {
          street: (formData.addressLine1 + (formData.addressLine2 ? ', ' + formData.addressLine2 : '')).trim(),
          zip: formData.postalCode.trim(),
          city: formData.city.trim(),
          country: formData.country
        },
        items: orderItems,
        referralCode: referralValid ? referralCode : null,
        paymentMethod: 'stripe'
      };

      console.log('Submitting order:', JSON.stringify(orderData, null, 2));

      const response = await ordersAPI.create(orderData);
      const data = response.data;
      const orderId = data.order?.id || data.id;
      const orderTotal = parseFloat(data.order?.total || data.total || effectiveTotal);

      // Try Stripe payment
      try {
        const piResponse = await ordersAPI.createPaymentIntent(orderTotal, { orderId: String(orderId) });

        if (piResponse.data?.url) {
          // Redirect to Stripe Checkout
          if (typeof clearCart === 'function') clearCart();
          localStorage.removeItem('cart');
          localStorage.removeItem('clyr_cart');
          window.location.href = piResponse.data.url;
          return;
        }
      } catch (stripeErr) {
        console.log('Stripe not available, redirecting to confirmation:', stripeErr.message);
      }

      // Fallback: no Stripe, show confirmation inline
      if (typeof clearCart === 'function') clearCart();
      localStorage.removeItem('cart');
      localStorage.removeItem('clyr_cart');
      setConfirmedOrderId(orderId);
      setOrderConfirmed(true);
      setPaymentStatus('confirmed');
    } catch (error) {
      console.error('Checkout error:', error);
      console.error('Error response:', error.response?.data);
      
      // Build detailed error message
      let msg = '';
      const errData = error.response?.data;
      if (errData?.details && Array.isArray(errData.details)) {
        msg = errData.details.map(d => d.message || d.msg).join(', ');
      } else if (errData?.message) {
        msg = errData.message;
      } else if (errData?.error) {
        msg = errData.error;
      } else {
        msg = 'Ein Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.';
      }
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

              {/* Billing Address - Rechnungsadresse */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Rechnungsadresse</h2>
                
                <div className="space-y-4">
                  {/* Company & VAT ID - prominent at top of billing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        USt-IdNr. / UID-Nr. (optional)
                        {formData.vatId && (
                          <span className="text-xs text-green-600 ml-2">
                            {formData.country === 'DE' ? 'Reverse Charge' : 'UID erfasst'}
                          </span>
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
                        <option value="AT">Österreich</option>
                        <option value="DE">Deutschland</option>
                        <option value="CH">Schweiz</option>
                      </select>
                    </div>
                  </div>

                  {/* Reverse Charge notice */}
                  {isReverseCharge && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                      Reverse Charge: Die Steuerschuldnerschaft geht auf den Leistungsempfänger über. 
                      Keine MwSt. wird berechnet.
                    </div>
                  )}
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