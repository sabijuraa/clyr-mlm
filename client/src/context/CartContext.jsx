import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clyr_cart') || '[]'); } catch { return []; }
  });
  const [country, setCountry] = useState(() => localStorage.getItem('clyr_country') || 'AT');

  useEffect(() => { localStorage.setItem('clyr_cart', JSON.stringify(items)); }, [items]);
  useEffect(() => { localStorage.setItem('clyr_country', country); }, [country]);

  const addItem = (product, variant = null, quantity = 1) => {
    setItems(prev => {
      const key = variant ? `${product.id}-${variant.id}` : product.id;
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + quantity } : i);
      }
      const priceField = country === 'DE' ? 'price_de' : country === 'CH' ? 'price_ch' : 'price_at';
      const price = variant ? (variant[priceField] || variant.price_at) : (product[priceField] || product.price_at);
      return [...prev, {
        key, productId: product.id, variantId: variant?.id || null,
        name: variant ? `${product.name} - ${variant.name}` : product.name,
        price: parseFloat(price), quantity, image: product.images?.[0]?.url || null,
        sku: variant?.sku || product.sku
      }];
    });
  };

  const removeItem = (key) => setItems(prev => prev.filter(i => i.key !== key));
  const updateQuantity = (key, quantity) => {
    if (quantity <= 0) return removeItem(key);
    setItems(prev => prev.map(i => i.key === key ? { ...i, quantity } : i));
  };
  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const shippingThreshold = country === 'DE' ? 50 : country === 'CH' ? 180 : 69;
  const shippingCost = subtotal >= shippingThreshold ? 0 : (country === 'CH' ? 15 : country === 'DE' ? 6.90 : 5.90);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, shippingCost, total: subtotal + shippingCost, itemCount, country, setCountry }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
