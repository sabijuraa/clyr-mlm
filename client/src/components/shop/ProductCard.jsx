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
      <Link to={`/produkt/${product.slug}`}>
        <div className="card-hover">
          {/* Image Container */}
          <div className="product-image-container relative">
            {/* Loading skeleton */}
            {!imageLoaded && (
              <div className="absolute inset-0 skeleton" />
            )}
            
            {/* Product Image */}
            <img
              src={mainImage}
              alt={product.name}
              onLoad={() => setImageLoaded(true)}
              className={`product-image group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.is_featured && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-brand-600 text-white rounded-lg shadow-lg">
                  Bestseller
                </span>
              )}
              {product.is_new && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500 text-white rounded-lg shadow-lg">
                  Neu
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
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-gray-900 hover:bg-brand-600 hover:text-white'
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
                  className="p-2.5 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors"
                  title={lang === 'de' ? 'Details ansehen' : 'View Details'}
                >
                  <Eye className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Category */}
            {product.category && (
              <p className="text-xs font-medium text-brand-600 uppercase tracking-wider mb-1">
                {product.category.name || product.category}
              </p>
            )}

            {/* Name */}
            <h3 className="font-heading font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">
              {product.name}
            </h3>

            {/* Short Description */}
            {product.short_description && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                {product.short_description}
              </p>
            )}

            {/* Price & Shipping */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(product.price)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {lang === 'de' ? 'inkl. MwSt.' : 'incl. VAT'}
                </p>
              </div>
              
              {product.is_large_item && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Truck className="w-3.5 h-3.5" />
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
