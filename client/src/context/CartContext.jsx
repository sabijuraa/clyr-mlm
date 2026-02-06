import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

const EMPTY_CART = { items: [], addItem: () => {}, removeItem: () => {}, updateQuantity: () => {}, clearCart: () => {}, subtotal: 0, shippingCost: 0, total: 0, itemCount: 0, country: 'AT', setCountry: () => {} };

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem('clyr_cart') || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [country, setCountry] = useState(() => localStorage.getItem('clyr_country') || 'AT');

  useEffect(() => {
    try { localStorage.setItem('clyr_cart', JSON.stringify(Array.isArray(items) ? items : [])); } catch {}
  }, [items]);
  useEffect(() => {
    try { localStorage.setItem('clyr_country', country); } catch {}
  }, [country]);

  const addItem = (product, variant = null, quantity = 1) => {
    setItems(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const key = variant ? `${product.id}-${variant.id}` : String(product.id);
      const existing = arr.find(i => i.key === key);
      if (existing) {
        return arr.map(i => i.key === key ? { ...i, quantity: i.quantity + quantity } : i);
      }
      const priceField = country === 'DE' ? 'price_de' : country === 'CH' ? 'price_ch' : 'price_at';
      const price = variant ? (variant[priceField] || variant.price_at) : (product[priceField] || product.price_at);
      return [...arr, {
        key, productId: product.id, variantId: variant?.id || null,
        name: variant ? `${product.name} - ${variant.name}` : product.name,
        price: parseFloat(price) || 0, quantity, image: product.images?.[0]?.url || null,
        sku: variant?.sku || product.sku
      }];
    });
  };

  const removeItem = (key) => setItems(prev => (Array.isArray(prev) ? prev : []).filter(i => i.key !== key));
  const updateQuantity = (key, quantity) => {
    if (quantity <= 0) return removeItem(key);
    setItems(prev => (Array.isArray(prev) ? prev : []).map(i => i.key === key ? { ...i, quantity } : i));
  };
  const clearCart = () => setItems([]);

  const safeItems = Array.isArray(items) ? items : [];
  const subtotal = safeItems.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (i.quantity || 0), 0);
  const itemCount = safeItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const shippingThreshold = country === 'DE' ? 50 : country === 'CH' ? 180 : 69;
  const shippingCost = subtotal >= shippingThreshold ? 0 : (country === 'CH' ? 15 : country === 'DE' ? 6.90 : 5.90);

  return (
    <CartContext.Provider value={{ items: safeItems, addItem, removeItem, updateQuantity, clearCart, subtotal, shippingCost, total: subtotal + shippingCost, itemCount, country, setCountry }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  return ctx || EMPTY_CART;
};
