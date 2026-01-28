import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/helpers';

const StatCard = ({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend, 
  trendValue,
  color = 'primary',
  index = 0 
}) => {
  // All colors now use teal-based theme for consistency
  const colors = {
    primary: {
      bg: 'bg-teal-100',
      icon: 'text-teal-600',
      trend: 'text-teal-600'
    },
    teal: {
      bg: 'bg-teal-100',
      icon: 'text-teal-600',
      trend: 'text-teal-600'
    },
    success: {
      bg: 'bg-teal-100',
      icon: 'text-teal-600',
      trend: 'text-teal-600'
    },
    warning: {
      bg: 'bg-teal-50',
      icon: 'text-teal-500',
      trend: 'text-teal-500'
    },
    info: {
      bg: 'bg-teal-100',
      icon: 'text-teal-600',
      trend: 'text-teal-600'
    },
    purple: {
      bg: 'bg-teal-100',
      icon: 'text-teal-600',
      trend: 'text-teal-600'
    }
  };

  const colorSet = colors[color] || colors.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-2xl border border-gray-100 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colorSet.bg)}>
          {Icon && <Icon className={cn('w-6 h-6', colorSet.icon)} />}
        </div>
        
        {trend && trendValue && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
            trend === 'up' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
          )}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trendValue}
          </div>
        )}
      </div>

      <h3 className="text-3xl font-heading font-bold text-gray-900 mb-1">
        {value}
      </h3>
      
      <p className="text-sm text-gray-500">{title}</p>
      
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
};

export default StatCard;
