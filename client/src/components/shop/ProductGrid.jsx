import { Package } from 'lucide-react';
import ProductCard from './ProductCard';
import { ProductCardSkeleton } from '../common/Loading';

const ProductGrid = ({ products, isLoading = false, columns = 3 }) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  };

  if (isLoading) {
    return (
      <div className={`grid ${gridCols[columns]} gap-6`}>
        {[...Array(6)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary-100 flex items-center justify-center">
          <Package className="w-12 h-12 text-primary-400" />
        </div>
        <h3 className="text-xl font-semibold text-secondary-700 mb-2">No Products Found</h3>
        <p className="text-secondary-500">Try different filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-6`}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
};

export default ProductGrid;
