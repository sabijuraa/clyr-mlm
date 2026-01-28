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
  const activityConfig = {
    order: {
      icon: ShoppingBag,
      color: 'bg-blue-100 text-blue-600',
      label: 'Neue Bestellung'
    },
    partner_joined: {
      icon: UserPlus,
      color: 'bg-green-100 text-green-600',
      label: 'Neuer Partner'
    },
    rank_up: {
      icon: Award,
      color: 'bg-purple-100 text-purple-600',
      label: 'Rangaufstieg'
    },
    commission: {
      icon: Wallet,
      color: 'bg-amber-100 text-amber-600',
      label: 'Provision'
    },
    payout: {
      icon: TrendingUp,
      color: 'bg-teal-100 text-teal-600',
      label: 'Auszahlung'
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Noch keine Aktivitäten</p>
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
            {/* Icon */}
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              config.color
            )}>
              <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {activity.title}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {activity.description}
              </p>
            </div>

            {/* Meta */}
            <div className="text-right flex-shrink-0">
              {activity.amount && (
                <p className={cn(
                  "text-sm font-semibold",
                  activity.amount > 0 ? "text-green-600" : "text-gray-900"
                )}>
                  {activity.amount > 0 && '+'}{formatCurrency(activity.amount)}
                </p>
              )}
              <p className="text-xs text-gray-400">
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