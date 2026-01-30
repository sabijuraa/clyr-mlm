import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, ChevronLeft, ChevronRight, UserCheck, UserX, Eye } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { formatDate, formatCurrency, formatPartnerStatus } from '../../utils/formatters';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const AdminPartnersPage = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPartners();
  }, [page, statusFilter]);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getPartners({ 
        page, 
        limit: 20, 
        status: statusFilter || undefined,
        search: searchTerm || undefined
      });
      setPartners(response.data.partners);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch partners:', error);
      toast.error('Fehler beim Laden der Partner');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchPartners();
  };

  const handleStatusChange = async (partnerId, newStatus) => {
    try {
      await adminAPI.updatePartnerStatus(partnerId, newStatus);
      toast.success('Status aktualisiert');
      fetchPartners();
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      active: 'text-primary-400 bg-secondary-100',
      pending: 'text-secondary-500 bg-gray-100',
      inactive: 'text-secondary-500 bg-gray-100',
      suspended: 'text-secondary-500 bg-gray-100',
    };
    return styles[status] || styles.pending;
  };

  if (loading && partners.length === 0) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">Partner verwalten</h1>
          <p className="text-secondary-500">Übersicht aller Partner im System</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Name, E-Mail oder Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500"
          >
            <option value="">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="suspended">Gesperrt</option>
          </select>
          <Button type="submit">Suchen</Button>
        </form>
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {partners.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-secondary-700 mb-2">Keine Partner gefunden</h3>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-500 uppercase">Partner</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-500 uppercase">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-500 uppercase">Rang</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-secondary-500 uppercase">Verkäufe</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-secondary-500 uppercase">Verdient</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-secondary-500 uppercase">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partners.map((partner, idx) => (
                    <motion.tr
                      key={partner.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary-700 flex items-center justify-center text-white font-semibold text-sm">
                            {partner.first_name?.[0]}{partner.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-secondary-700">{partner.first_name} {partner.last_name}</p>
                            <p className="text-sm text-secondary-500">{partner.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{partner.referral_code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700">
                          {partner.rank_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(partner.status)}`}>
                          {formatPartnerStatus(partner.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">{partner.own_sales_count}</td>
                      <td className="px-6 py-4 text-right font-medium text-primary-400">
                        {formatCurrency(partner.total_earned || 0)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {partner.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(partner.id, 'active')}
                              className="p-2 text-primary-400 hover:bg-slate-50 rounded-lg"
                              title="Aktivieren"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          {partner.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(partner.id, 'suspended')}
                              className="p-2 text-secondary-500 hover:bg-gray-100 rounded-lg"
                              title="Sperren"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-2 text-secondary-500 hover:bg-slate-50 hover:text-primary-400 rounded-lg" title="Details">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-secondary-500">
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

export default AdminPartnersPage;
