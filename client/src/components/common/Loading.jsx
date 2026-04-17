import { motion } from 'framer-motion';

// Full page loading - Charcoal spinner with teal accent
export const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-4">
        <motion.div
          className="absolute inset-0 border-4 border-secondary-200 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 border-4 border-transparent border-t-secondary-700 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <p className="text-secondary-500 font-medium">Loading...</p>
    </div>
  </div>
);

// Inline spinner - Charcoal with teal accent
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className={`${sizes[size]} border-secondary-200 border-t-secondary-700 rounded-full animate-spin ${className}`} />
  );
};

// Skeleton loader - Uses secondary colors
export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const variants = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4'
  };

  return (
    <div className={`bg-secondary-200 animate-pulse ${variants[variant]} ${className}`} />
  );
};

// Product card skeleton
export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-3xl overflow-hidden">
    <Skeleton className="aspect-square w-full" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-1/3" />
    </div>
  </div>
);

// Stat card skeleton
export const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 border border-secondary-100">
    <Skeleton className="w-12 h-12 rounded-xl mb-4" />
    <Skeleton className="h-8 w-24 mb-2" />
    <Skeleton className="h-4 w-16" />
  </div>
);

export default LoadingScreen;
