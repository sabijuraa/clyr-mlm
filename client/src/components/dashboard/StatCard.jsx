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
  // Charcoal icon backgrounds with teal icons
  const colors = {
    primary: {
      bg: 'bg-secondary-700',
      icon: 'text-primary-400',
      trend: 'text-secondary-600'
    },
    teal: {
      bg: 'bg-secondary-700',
      icon: 'text-primary-400',
      trend: 'text-secondary-600'
    },
    success: {
      bg: 'bg-secondary-700',
      icon: 'text-primary-400',
      trend: 'text-green-600'
    },
    warning: {
      bg: 'bg-secondary-700',
      icon: 'text-primary-400',
      trend: 'text-amber-600'
    },
    info: {
      bg: 'bg-secondary-700',
      icon: 'text-primary-400',
      trend: 'text-secondary-600'
    },
    purple: {
      bg: 'bg-secondary-700',
      icon: 'text-primary-400',
      trend: 'text-secondary-600'
    }
  };

  const colorSet = colors[color] || colors.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-2xl border border-secondary-100 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colorSet.bg)}>
          {Icon && <Icon className={cn('w-6 h-6', colorSet.icon)} />}
        </div>
        
        {trend && trendValue && (
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
            trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-600'
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

      <h3 className="text-3xl font-heading font-bold text-secondary-700 mb-1">
        {value}
      </h3>
      
      <p className="text-sm text-secondary-500">{title}</p>
      
      {subtitle && (
        <p className="text-xs text-secondary-400 mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
};

export default StatCard;
