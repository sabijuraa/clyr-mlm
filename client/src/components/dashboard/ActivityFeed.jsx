import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  UserPlus, 
  TrendingUp, 
  Wallet, 
  Award,
  Clock
} from 'lucide-react';
import { formatDate, cn } from '../../utils/helpers';
import { formatCurrency } from '../../config/app.config';

const ActivityFeed = ({ activities, isLoading = false, limit = 5 }) => {
  // Charcoal icon backgrounds with teal icons
  const activityConfig = {
    order: {
      icon: ShoppingBag,
      bgColor: 'bg-secondary-700',
      iconColor: 'text-primary-400',
      label: 'New Order'
    },
    partner_joined: {
      icon: UserPlus,
      bgColor: 'bg-secondary-700',
      iconColor: 'text-primary-400',
      label: 'New Partner'
    },
    rank_up: {
      icon: Award,
      bgColor: 'bg-secondary-700',
      iconColor: 'text-primary-400',
      label: 'Rank Up'
    },
    commission: {
      icon: Wallet,
      bgColor: 'bg-secondary-700',
      iconColor: 'text-primary-400',
      label: 'Commission'
    },
    payout: {
      icon: TrendingUp,
      bgColor: 'bg-secondary-700',
      iconColor: 'text-primary-400',
      label: 'Payout'
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="bg-secondary-200 animate-pulse w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="bg-secondary-200 animate-pulse h-4 w-3/4 rounded" />
              <div className="bg-secondary-200 animate-pulse h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-primary-400 mx-auto mb-3" />
        <p className="text-secondary-500">No activities yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.slice(0, limit).map((activity, index) => {
        const config = activityConfig[activity.type] || activityConfig.order;
        const Icon = config.icon;

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex gap-3"
          >
            {/* Icon - Charcoal bg with teal icon */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              config.bgColor
            )}>
              <Icon className={cn("w-5 h-5", config.iconColor)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-700 truncate">
                {activity.title}
              </p>
              <p className="text-xs text-secondary-500 truncate">
                {activity.description}
              </p>
            </div>

            {/* Meta */}
            <div className="text-right flex-shrink-0">
              {activity.amount && (
                <p className={cn(
                  "text-sm font-semibold",
                  activity.amount > 0 ? "text-green-600" : "text-secondary-700"
                )}>
                  {activity.amount > 0 && '+'}{formatCurrency(activity.amount)}
                </p>
              )}
              <p className="text-xs text-secondary-400">
                {formatDate(activity.createdAt, { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;
