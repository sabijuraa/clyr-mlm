import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../utils/format';
import api from '../../utils/api';
import toast from '../utils/toast';

export default function CheckoutPage() {
  const { items, subtotal, shippingCost, total, country, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [form, setForm] = useState({
    firstName: user?.firstName || '', lastName: user?.lastName || '',
    street: '', city: '', postalCode: '', country,
    referralCode: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.street || !form.city || !form.postalCode) {
      return toast.error('Bitte alle Pflichtfelder ausfüllen');
    }
    setLoading(true);
    try {
      const orderData = {
        items: ( Array.isArray(items) ? items : []).map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        shippingAddress: {
          first_name: form.firstName, last_name: form.lastName,
          street: form.street, city: form.city, zip: form.postalCode, country: form.country
        },
        referralCode: form.referralCode || null,
        paymentMethod
      };
      const { data: order } = await api.post('/orders', orderData);

      if (paymentMethod === 'stripe') {
        const { data: session } = await api.post('/stripe/create-session', { orderId: order.id });
        if (session.url) { clearCart(); window.location.href = session.url; }
        else toast.error('Fehler beim Erstellen der Zahlung');
      } else {
        // Bank transfer — order created with pending status
        clearCart();
        navigate('/order/success?method=bank_transfer&order=' + order.order_number);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bestellung fehlgeschlagen');
    } finally { setLoading(false); }
  };

  if (items.length === 0) { navigate('/cart'); return null; }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Kasse</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Lieferadresse</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Vorname *" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="input-field" required />
                <input placeholder="Nachname *" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="input-field" required />
              </div>
              <input placeholder="Straße und Hausnummer *" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} className="input-field" required />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="PLZ *" value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} className="input-field" required />
                <input placeholder="Stadt *" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input-field" required />
              </div>
              <select value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="input-field">
                <option value="AT">Österreich</option><option value="DE">Deutschland</option><option value="CH">Schweiz</option>
              </select>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Zahlungsmethode</h2>
            <div className="space-y-3">
              <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'stripe' ? 'border-clyr-teal bg-clyr-light/30' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="payment" value="stripe" checked={paymentMethod === 'stripe'} onChange={e => setPaymentMethod(e.target.value)} className="text-clyr-teal" />
                <div><p className="font-medium">Kreditkarte / Online-Zahlung</p><p className="text-sm text-gray-500">Sichere Zahlung über Stripe</p></div>
              </label>
              <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'bank_transfer' ? 'border-clyr-teal bg-clyr-light/30' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="payment" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={e => setPaymentMethod(e.target.value)} className="text-clyr-teal" />
                <div><p className="font-medium">Banküberweisung (Vorkasse)</p><p className="text-sm text-gray-500">Bestellung wird nach Zahlungseingang bearbeitet</p></div>
              </label>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Empfehlungscode</h2>
            <input placeholder="Partner-Code (optional)" value={form.referralCode} onChange={e => setForm({ ...form, referralCode: e.target.value.toUpperCase() })} className="input-field" maxLength={8} />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg disabled:opacity-50">
            {loading ? 'Wird verarbeitet...' : paymentMethod === 'stripe' ? `Jetzt bezahlen — ${formatPrice(total)}` : `Bestellung aufgeben — ${formatPrice(total)}`}
          </button>
        </form>

        <div className="card h-fit">
          <h2 className="text-lg font-semibold mb-4">Bestellübersicht</h2>
          <div className="space-y-3 mb-4">
            {(Array.isArray(items) ? items : []).map(i => (
              <div key={i.key} className="flex justify-between text-sm"><span className="text-gray-600">{i.quantity}× {i.name}</span><span>{formatPrice(i.price * i.quantity)}</span></div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Zwischensumme</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Versand</span><span>{shippingCost === 0 ? 'Kostenlos' : formatPrice(shippingCost)}</span></div>
            <div className="flex justify-between text-lg font-bold border-t pt-2"><span>Gesamt</span><span>{formatPrice(total)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
