import { motion } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../config/app.config';
import { Link } from 'react-router-dom';

const CartItem = ({ item }) => {
  const { updateQuantity, removeItem } = useCart();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="flex gap-4 p-4 bg-white rounded-2xl border border-secondary-100"
    >
      {/* Image */}
      <Link to={`/product/${item.slug}`} className="flex-shrink-0">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-secondary-100">
          <img
            src={item.image || '/placeholder-product.jpg'}
            alt={item.name}
            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
          />
        </div>
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <Link to={`/product/${item.slug}`}>
          <h3 className="font-semibold text-secondary-700 hover:text-primary-500 transition-colors truncate">
            {item.name}
          </h3>
        </Link>
        
        <p className="text-lg font-bold text-secondary-700 mt-1">
          {formatCurrency(item.price)}
        </p>

        {/* Quantity Controls - Charcoal styling */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center bg-secondary-100 rounded-xl">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="p-2 hover:bg-secondary-200 rounded-l-xl transition-colors"
            >
              <Minus className="w-4 h-4 text-secondary-600" />
            </button>
            
            <span className="w-10 text-center font-semibold text-secondary-700">
              {item.quantity}
            </span>
            
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="p-2 hover:bg-secondary-200 rounded-r-xl transition-colors"
            >
              <Plus className="w-4 h-4 text-secondary-600" />
            </button>
          </div>

          <button
            onClick={() => removeItem(item.id)}
            className="p-2 text-secondary-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="text-right">
        <p className="text-lg font-bold text-secondary-700">
          {formatCurrency(item.price * item.quantity)}
        </p>
      </div>
    </motion.div>
  );
};

export default CartItem;
