import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Download,
  Clock,
  CheckCircle,
  ArrowUpRight,
  Ban
} from 'lucide-react';
import { commissionsAPI, downloadBlob } from '../../services/api';
import { formatDate, formatCurrency, formatCommissionType, formatCommissionStatus, getStatusColor } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const AdminCommissionsPage = () => {
  const [commissions, setCommissions] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    fetchCommissions();
  }, [page, statusFilter, typeFilter]);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const response = await commissionsAPI.getAll({ 
        page, 
        limit: 30,
        status: statusFilter || undefined,
        type: typeFilter || undefined
      });
      setCommissions(response.data.commissions);
      setTotals(response.data.totals);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch commissions:', error);
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      const response = await commissionsAPI.release();
      toast.success(`${response.data.released.length} Provisionen freigegeben`);
      fetchCommissions();
    } catch (error) {
      toast.error('Fehler beim Freigeben');
    } finally {
      setReleasing(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await commissionsAPI.getAll({ limit: 10000 });
      // Simple CSV export
      const csv = [
        'Datum,Partner,Typ,Betrag,Status',
        ...response.data.commissions.map(c => 
          `${formatDate(c.created_at)},${c.first_name} ${c.last_name},${c.type},${c.amount},${c.status}`
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadBlob(blob, `provisionen-${Date.now()}.csv`);
      toast.success('Export erfolgreich');
    } catch (error) {
      toast.error('Export fehlgeschlagen');
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending: 'text-gray-600 bg-gray-100',
      held: 'text-teal-700 bg-teal-50',
      released: 'text-teal-600 bg-teal-100',
      paid: 'text-teal-700 bg-teal-100',
      cancelled: 'text-gray-500 bg-gray-100',
    };
    return styles[status] || styles.pending;
  };

  if (loading && commissions.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Provisionen</h1>
          <p className="text-gray-600">Übersicht aller Provisionen im System</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport} icon={Download}>
            Export
          </Button>
          <Button onClick={handleRelease} isLoading={releasing} icon={Play}>
            Freigeben
          </Button>
        </div>
      </div>

      {/* Summary Cards - Consistent Teal Theme */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Zurückgehalten</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.total_held || 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Freigegeben</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.total_released || 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Ausgezahlt</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.total_paid || 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">Ausstehend</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.total_pending || 0)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="held">Zurückgehalten</option>
            <option value="released">Freigegeben</option>
            <option value="paid">Ausgezahlt</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Alle Typen</option>
            <option value="direct">Direkt</option>
            <option value="difference">Differenz</option>
            <option value="leadership_bonus">Leadership</option>
            <option value="rank_bonus">Rang-Bonus</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {commissions.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Keine Provisionen</h3>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Datum</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Partner</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Typ</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Bestellung</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Betrag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {commissions.map((commission, idx) => (
                    <motion.tr
                      key={commission.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(commission.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{commission.first_name} {commission.last_name}</p>
                        <p className="text-sm text-gray-500">{commission.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatCommissionType(commission.type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {commission.order_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(commission.status)}`}>
                          {formatCommissionStatus(commission.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-teal-600">
                        {formatCurrency(commission.amount)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Seite {pagination.page} von {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminCommissionsPage;
