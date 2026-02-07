import { motion } from 'framer-motion';
import { Wallet, Filter, Download } from 'lucide-react';
import { formatCurrency } from '../../config/app.config';
import { formatDate, cn } from '../../utils/helpers';

const CommissionTable = ({ commissions = [], isLoading = false, commissionVatInfo = null }) => {
  const statusStyles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    paid: 'bg-secondary-700 text-white',
    cancelled: 'bg-red-100 text-red-700'
  };

  // Calculate VAT for a commission amount based on partner's country/UID status
  const getVatDisplay = (amount) => {
    if (!commissionVatInfo) return null;
    const { vatRate, vatDisplay } = commissionVatInfo;
    if (vatDisplay === 'separate') {
      // AT with UID: VAT shown separately (amount is net, VAT on top)
      const vat = Math.round(amount * (vatRate / 100) * 100) / 100;
      return { net: amount, vat, gross: Math.round((amount + vat) * 100) / 100, label: `+ ${vatRate}% USt.` };
    } else if (vatDisplay === 'included') {
      // AT without UID: amount is gross (VAT included)
      const net = Math.round((amount / (1 + vatRate / 100)) * 100) / 100;
      const vat = Math.round((amount - net) * 100) / 100;
      return { net, vat, gross: amount, label: `inkl. ${vatRate}% USt.` };
    }
    return null; // DE (reverse charge) or CH (no VAT)
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-secondary-100 overflow-hidden">
        <div className="p-6 border-b border-secondary-100">
          <div className="h-6 w-40 bg-secondary-200 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-full bg-secondary-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-secondary-100 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-700 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-400" />
          </div>
          <h3 className="font-heading font-semibold text-secondary-700">Commissions</h3>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-xl bg-secondary-100 hover:bg-secondary-200 text-secondary-600 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl bg-secondary-100 hover:bg-secondary-200 text-secondary-600 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary-50">
            <tr>
              <th className="text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider px-6 py-3">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider px-6 py-3">
                Type
              </th>
              <th className="text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider px-6 py-3">
                Source
              </th>
              <th className="text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider px-6 py-3">
                Amount
              </th>
              <th className="text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider px-6 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {commissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-secondary-500">
                  No commissions yet
                </td>
              </tr>
            ) : (
              commissions.map((commission) => (
                <tr key={commission.id} className="hover:bg-secondary-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-secondary-600">
                    {formatDate(commission.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-secondary-700">
                    {commission.type}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary-600">
                    {commission.source}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-secondary-700 text-right">
                    {(() => {
                      const vatDisplay = getVatDisplay(commission.amount);
                      if (vatDisplay) {
                        return (
                          <div>
                            <div>{formatCurrency(commission.amount)}</div>
                            <div className="text-xs font-normal text-secondary-400">{vatDisplay.label}</div>
                          </div>
                        );
                      }
                      return formatCurrency(commission.amount);
                    })()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-semibold',
                      statusStyles[commission.status] || statusStyles.pending
                    )}>
                      {commission.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VAT Info Footer */}
      {commissionVatInfo && commissionVatInfo.vatNote && (
        <div className="px-6 py-3 bg-secondary-50 border-t border-secondary-100 text-xs text-secondary-500">
          {commissionVatInfo.vatNote}
        </div>
      )}
    </motion.div>
  );
};

export default CommissionTable;
