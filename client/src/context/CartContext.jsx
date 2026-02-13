import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import appConfig, { calculateShipping, calculateVAT, formatCurrency } from '../config/app.config';
import { referralAPI } from '../services/api';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  // Cart items
  const [items, setItems] = useState([]);
  
  // Cart drawer state
  const [isOpen, setIsOpen] = useState(false);
  
  // Country for shipping/tax calculation
  const [country, setCountry] = useState('AT');
  
  // VAT ID status (for reverse charge)
  const [hasVatId, setHasVatId] = useState(false);
  
  // Referral code from URL
  const [referral, setReferral] = useState(null);
  
  // Partner name from referral lookup
  const [partnerName, setPartnerName] = useState(null);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('clyr_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setItems(parsed.items || []);
        setCountry(parsed.country || 'AT');
        setHasVatId(parsed.hasVatId || false);
      } catch (err) {
        console.error('Failed to parse cart:', err);
      }
    }

    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref') || urlParams.get('referral');
    if (ref) {
      setReferral(ref);
      localStorage.setItem('clyr_referral', ref);
      lookupPartner(ref);
    } else {
      // Check if we have a saved referral
      const savedRef = localStorage.getItem('clyr_referral');
      const savedName = localStorage.getItem('clyr_referral_partner');
      if (savedRef) {
        setReferral(savedRef);
        if (savedName) {
          setPartnerName(savedName);
        } else {
          lookupPartner(savedRef);
        }
      }
    }
  }, []);

  // Look up partner name from referral code
  const lookupPartner = async (code) => {
    try {
      const response = await referralAPI.check(code);
      if (response.data?.valid && response.data?.partnerName) {
        setPartnerName(response.data.partnerName);
        localStorage.setItem('clyr_referral_partner', response.data.partnerName);
        // Also track the click
        referralAPI.trackClick(code, window.location.href).catch(() => {});
      }
    } catch (err) {
      console.log('Referral lookup failed:', err);
    }
  };

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('clyr_cart', JSON.stringify({
      items,
      country,
      hasVatId
    }));
  }, [items, country, hasVatId]);

  // Calculate subtotal (net prices)
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [items]);

  // Calculate shipping (flat rate per country)
  const shipping = useMemo(() => {
    if (items.length === 0) return 0;
    return calculateShipping(country);
  }, [country, items.length]);

  // Calculate VAT
  const vat = useMemo(() => {
    if (items.length === 0) return 0;
    return calculateVAT(subtotal + shipping, country, hasVatId);
  }, [subtotal, shipping, country, hasVatId, items.length]);

  // Calculate total
  const total = useMemo(() => {
    return subtotal + shipping + vat;
  }, [subtotal, shipping, vat]);

  // VAT rate for display
  const vatRate = useMemo(() => {
    if (country === 'CH') return 0;
    if (country === 'AT' && hasVatId) return 0;
    return appConfig.countries[country]?.vatRate || 0.19;
  }, [country, hasVatId]);

  // Is reverse charge applicable
  const isReverseCharge = useMemo(() => {
    return country === 'AT' && hasVatId;
  }, [country, hasVatId]);

  // Formatted totals for display
  const totals = useMemo(() => ({
    subtotal,
    shipping,
    vat,
    total,
    vatRate,
    isReverseCharge,
    formatted: {
      subtotal: formatCurrency(subtotal),
      shipping: items.length > 0 ? formatCurrency(shipping) : '€0,00',
      vat: formatCurrency(vat),
      total: formatCurrency(total)
    }
  }), [subtotal, shipping, vat, total, vatRate, isReverseCharge, items.length]);

  // Item count
  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  // Is cart empty
  const isEmpty = useMemo(() => items.length === 0, [items]);

  // Add item to cart
  const addItem = useCallback((product, quantity = 1) => {
    setItems(currentItems => {
      const existingIndex = currentItems.findIndex(item => item.id === product.id);
      
      if (existingIndex >= 0) {
        const updatedItems = [...currentItems];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + quantity
        };
        return updatedItems;
      }

      // Parse images if string
      let images = product.images;
      if (typeof images === 'string') {
        try {
          images = JSON.parse(images);
        } catch (e) {
          images = [];
        }
      }

      return [...currentItems, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        images: images || [],
        image: images?.[0] || null,
        quantity,
        isSubscription: product.is_subscription_eligible || product.isSubscription || false
      }];
    });
    setIsOpen(true);
  }, []);

  // Remove item from cart
  const removeItem = useCallback((productId) => {
    setItems(currentItems => currentItems.filter(item => item.id !== productId));
  }, []);

  // Update item quantity
  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }
    setItems(currentItems => 
      currentItems.map(item => 
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem('clyr_cart');
  }, []);

  // Clear referral code
  const clearReferral = useCallback(() => {
    setReferral(null);
    setPartnerName(null);
    localStorage.removeItem('clyr_referral');
    localStorage.removeItem('clyr_referral_partner');
  }, []);

  // Check if product is in cart
  const isInCart = useCallback((productId) => {
    return items.some(item => item.id === productId);
  }, [items]);

  // Get quantity of specific product in cart
  const getItemQuantity = useCallback((productId) => {
    const item = items.find(item => item.id === productId);
    return item ? item.quantity : 0;
  }, [items]);

  // Cart drawer controls
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen(prev => !prev), []);

  const value = {
    // Items
    items,
    itemCount,
    isEmpty,
    
    // Item operations
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
    
    // Drawer
    isOpen,
    openCart,
    closeCart,
    toggleCart,
    
    // Country & Tax
    country,
    setCountry,
    hasVatId,
    setHasVatId,
    
    // Totals
    subtotal,
    shipping,
    vat,
    total,
    totals,
    vatRate,
    isReverseCharge,
    
    // Referral
    referral,
    setReferral,
    partnerName,
    clearReferral
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;