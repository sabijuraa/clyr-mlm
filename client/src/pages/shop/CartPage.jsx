import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/format';
import { Trash2, ShoppingCart, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, shippingCost, total, country, setCountry } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Ihr Warenkorb ist leer</h1>
        <p className="text-gray-500 mb-6">Entdecken Sie unsere Produkte</p>
        <Link to="/shop" className="btn-primary">Zum Shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Warenkorb</h1>
      <div className="space-y-4 mb-8">
        {items.map(item => (
          <div key={item.key} className="card flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-50 rounded-lg flex-shrink-0 overflow-hidden">
              {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-contain" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.sku}</p>
              <p className="font-semibold mt-1">{formatPrice(item.price)}</p>
            </div>
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button onClick={() => updateQuantity(item.key, item.quantity - 1)} className="px-3 py-1 hover:bg-gray-50">-</button>
              <span className="px-3 py-1 font-medium">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.key, item.quantity + 1)} className="px-3 py-1 hover:bg-gray-50">+</button>
            </div>
            <p className="font-semibold w-24 text-right">{formatPrice(item.price * item.quantity)}</p>
            <button onClick={() => removeItem(item.key)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
          </div>
        ))}
      </div>

      <div className="card max-w-md ml-auto">
        <div className="mb-4">
          <label className="text-sm font-medium mb-1 block">Lieferland</label>
          <select value={country} onChange={e => setCountry(e.target.value)} className="input-field">
            <option value="AT">Österreich</option>
            <option value="DE">Deutschland</option>
            <option value="CH">Schweiz</option>
          </select>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Zwischensumme</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Versand</span><span>{shippingCost === 0 ? 'Kostenlos' : formatPrice(shippingCost)}</span></div>
          <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>Gesamt</span><span>{formatPrice(total)}</span></div>
        </div>
        <Link to="/checkout" className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
          Zur Kasse <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
