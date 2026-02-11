import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Check, Eye, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';

const ProductCard = ({ product, index = 0 }) => {
  const { addItem, isInCart } = useCart();
  const { lang } = useLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const inCart = isInCart(product.id);
  
  // Get images - handle both array and JSON string
  let images = product.images || [];
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch (e) {
      images = [];
    }
  }
  const mainImage = images[0] || '/images/placeholder.jpg';

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (inCart || isAdding) return;
    
    setIsAdding(true);
    addItem(product);
    
    setTimeout(() => setIsAdding(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group"
    >
      <Link to={`/product/${product.slug}`} className="h-full">
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg shadow-secondary-900/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-secondary-50 shrink-0">
            {/* Loading skeleton */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-secondary-200 animate-pulse" />
            )}
            
            {/* Product Image */}
            <img
              src={mainImage}
              alt={product.name}
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Badges - Charcoal badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.is_featured && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-secondary-700 text-white rounded-lg shadow-lg">
                  Bestseller
                </span>
              )}
              {product.is_new && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 text-white rounded-lg shadow-lg">
                  {lang === 'de' ? 'Neu' : 'New'}
                </span>
              )}
              {product.stock <= 5 && product.stock > 0 && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500 text-white rounded-lg shadow-lg">
                  {lang === 'de' ? `Nur ${product.stock} übrig` : `Only ${product.stock} left`}
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className={`absolute bottom-3 left-3 right-3 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <div className="flex gap-2">
                <button
                  onClick={handleAddToCart}
                  disabled={inCart || isAdding || product.stock === 0}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm
                    transition-all duration-200 shadow-lg
                    ${inCart 
                      ? 'bg-emerald-500 text-white cursor-default' 
                      : product.stock === 0
                        ? 'bg-secondary-300 text-secondary-500 cursor-not-allowed'
                        : 'bg-secondary-700 text-white hover:bg-primary-500'
                    }`}
                >
                  {inCart ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lang === 'de' ? 'Im Warenkorb' : 'In Cart'}</span>
                    </>
                  ) : isAdding ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>{lang === 'de' ? 'In den Warenkorb' : 'Add to Cart'}</span>
                    </>
                  )}
                </button>
                <button 
                  className="p-2.5 bg-white rounded-xl shadow-lg hover:bg-secondary-50 transition-colors"
                  title={lang === 'de' ? 'Details ansehen' : 'View Details'}
                >
                  <Eye className="w-4 h-4 text-secondary-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 flex flex-col flex-1">
            {/* Category - Teal accent */}
            {product.category && (
              <p className="text-xs font-medium text-primary-500 uppercase tracking-wider mb-1">
                {product.category.name || product.category}
              </p>
            )}

            {/* Name - Charcoal text */}
            <h3 className="font-heading font-semibold text-secondary-700 mb-2 line-clamp-1 group-hover:text-primary-500 transition-colors">
              {product.name}
            </h3>

            {/* Short Description */}
            {product.short_description && (
              <p className="text-sm text-secondary-500 mb-3 line-clamp-2 min-h-[2.5rem]">
                {product.short_description}
              </p>
            )}

            {/* Price & Shipping */}
            <div className="flex items-end justify-between mt-auto pt-3">
              <div>
                {parseFloat(product.price) > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-secondary-700">
                      {formatCurrency(product.price)}
                    </p>
                    <p className="text-xs text-secondary-500 mt-0.5">
                      {lang === 'de' ? 'netto zzgl. MwSt.' : 'net excl. VAT'}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-bold text-primary-600">
                    {lang === 'de' ? 'Preis auf Anfrage' : 'Price on request'}
                  </p>
                )}
              </div>
              
              {product.is_large_item && (
                <div className="flex items-center gap-1.5 text-xs text-secondary-500">
                  <Truck className="w-3.5 h-3.5 text-primary-400" />
                  <span>{lang === 'de' ? 'Spedition' : 'Freight'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
