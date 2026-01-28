import { motion } from 'framer-motion';
import { Eye, Download, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../config/app.config';
import { formatDate, cn } from '../../utils/helpers';

const CommissionTable = ({ commissions, isLoading = false }) => {
  const statusConfig = {
    pending: {
      label: 'Ausstehend',
      icon: Clock,
      color: 'bg-amber-100 text-amber-700'
    },
    held: {
      label: 'In Wartezeit',
      icon: AlertCircle,
      color: 'bg-blue-100 text-blue-700'
    },
    released: {
      label: 'Freigegeben',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700'
    },
    paid: {
      label: 'Ausgezahlt',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700'
    },
    cancelled: {
      label: 'Storniert',
      icon: XCircle,
      color: 'bg-red-100 text-red-700'
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!commissions || commissions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">Noch keine Provisionen</h3>
        <p className="text-sm text-gray-500">
          Ihre Provisionen erscheinen hier, sobald Verkäufe generiert werden.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Datum</th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Typ</th>
              <th className="text-left py-4 px-4 text-sm font-semibold text-gray-600">Beschreibung</th>
              <th className="text-right py-4 px-4 text-sm font-semibold text-gray-600">Betrag</th>
              <th className="text-center py-4 px-4 text-sm font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((commission, index) => {
              const status = statusConfig[commission.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              
              return (
                <motion.tr
                  key={commission.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600">
                      {formatDate(commission.createdAt)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-medium text-gray-900">
                      {commission.type === 'direct' ? 'Direktverkauf' : 
                       commission.type === 'difference' ? 'Differenzprovision' : 
                       commission.type === 'bonus' ? 'Bonus' : commission.type}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-600">
                      {commission.description || `Bestellung #${commission.orderId}`}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={cn(
                      "text-sm font-semibold",
                      commission.amount >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {commission.amount >= 0 ? '+' : ''}{formatCurrency(commission.amount)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
                        status.color
                      )}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {commissions.map((commission, index) => {
          const status = statusConfig[commission.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          
          return (
            <motion.div
              key={commission.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {commission.type === 'direct' ? 'Direktverkauf' : 
                     commission.type === 'difference' ? 'Differenzprovision' : 
                     commission.type === 'bonus' ? 'Bonus' : commission.type}
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(commission.createdAt)}</p>
                </div>
                <span className={cn(
                  "text-lg font-bold",
                  commission.amount >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {commission.amount >= 0 ? '+' : ''}{formatCurrency(commission.amount)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {commission.description || `Bestellung #${commission.orderId}`}
                </p>
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                  status.color
                )}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CommissionTable;