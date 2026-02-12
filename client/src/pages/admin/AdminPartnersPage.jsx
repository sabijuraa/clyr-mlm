import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, ChevronLeft, ChevronRight, UserCheck, UserX, Eye, X, Mail, Phone, MapPin, Calendar, Award, ShoppingBag, Wallet, Link2, Building, Hash, TrendingUp, CreditCard } from 'lucide-react';
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
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerDetail, setPartnerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
      if (partnerDetail?.id === partnerId) {
        viewPartnerDetail(partnerId);
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const viewPartnerDetail = async (partnerId) => {
    setSelectedPartner(partnerId);
    setDetailLoading(true);
    try {
      const response = await adminAPI.getPartnerById(partnerId);
      setPartnerDetail(response.data);
    } catch (error) {
      console.error('Failed to fetch partner detail:', error);
      toast.error('Fehler beim Laden der Partner-Details');
      setSelectedPartner(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedPartner(null);
    setPartnerDetail(null);
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
                          <button onClick={() => viewPartnerDetail(partner.id)} className="p-2 text-secondary-500 hover:bg-slate-50 hover:text-primary-400 rounded-lg" title="Details">
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

      {/* Partner Detail Modal */}
      <AnimatePresence>
        {selectedPartner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto"
            onClick={closeDetail}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-10"
              onClick={(e) => e.stopPropagation()}
            >
              {detailLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-secondary-500 mt-4">Lade Partner-Details...</p>
                </div>
              ) : partnerDetail ? (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-secondary-700 flex items-center justify-center text-white font-bold text-lg">
                        {partnerDetail.partner?.first_name?.[0]}{partnerDetail.partner?.last_name?.[0]}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-secondary-700">
                          {partnerDetail.partner?.first_name} {partnerDetail.partner?.last_name}
                        </h2>
                        <p className="text-secondary-500">{partnerDetail.partner?.email}</p>
                      </div>
                    </div>
                    <button onClick={closeDetail} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-100">
                    {[
                      { label: 'Bestellungen', value: partnerDetail.stats?.total_orders || 0, icon: ShoppingBag },
                      { label: 'Umsatz', value: formatCurrency(partnerDetail.stats?.total_revenue || 0), icon: TrendingUp },
                      { label: 'Direkt-Partner', value: partnerDetail.stats?.direct_partners || 0, icon: Users },
                      { label: 'Kunden', value: partnerDetail.stats?.total_customers || 0, icon: Building },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <stat.icon className="w-4 h-4 text-primary-500" />
                          <span className="text-xs text-secondary-500">{stat.label}</span>
                        </div>
                        <p className="text-lg font-bold text-secondary-700">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Info Grid */}
                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    {/* Personal Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-secondary-500 uppercase mb-3">Persönliche Daten</h3>
                      <div className="space-y-3">
                        {[
                          { icon: Mail, label: 'E-Mail', value: partnerDetail.partner?.email },
                          { icon: Phone, label: 'Telefon', value: partnerDetail.partner?.phone || '-' },
                          { icon: MapPin, label: 'Adresse', value: [partnerDetail.partner?.street, `${partnerDetail.partner?.zip || ''} ${partnerDetail.partner?.city || ''}`.trim(), partnerDetail.partner?.country].filter(Boolean).join(', ') || '-' },
                          { icon: Calendar, label: 'Registriert', value: formatDate(partnerDetail.partner?.created_at) },
                          { icon: Building, label: 'Firma', value: partnerDetail.partner?.company || '-' },
                          { icon: CreditCard, label: 'USt-IdNr.', value: partnerDetail.partner?.vat_id || '-' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <item.icon className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-secondary-400">{item.label}</p>
                              <p className="text-sm text-secondary-700">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Partner Info & Controls */}
                    <div>
                      <h3 className="text-sm font-semibold text-secondary-500 uppercase mb-3">Partner-Daten</h3>
                      <div className="space-y-3">
                        {/* Editable Rank */}
                        <div className="flex items-start gap-3">
                          <Award className="w-4 h-4 text-secondary-400 mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-secondary-400 mb-1">Rang aendern</p>
                            <select
                              value={partnerDetail.partner?.rank_id || 1}
                              onChange={async (e) => {
                                try {
                                  await adminAPI.updatePartnerRank(partnerDetail.partner.id, parseInt(e.target.value));
                                  toast.success('Rang geaendert!');
                                  loadPartnerDetail(partnerDetail.partner.id);
                                } catch (err) { toast.error('Fehler'); }
                              }}
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                            >
                              <option value={1}>R1 Starter</option>
                              <option value={2}>R2 Bronze</option>
                              <option value={3}>R3 Silber</option>
                              <option value={4}>R4 Gold</option>
                              <option value={5}>R5 Platin</option>
                              <option value={6}>R6 Manager</option>
                              <option value={7}>R7 Direktor</option>
                            </select>
                          </div>
                        </div>
                        {/* Editable Status */}
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 text-secondary-400 mt-2 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-secondary-400 mb-1">Status aendern</p>
                            <select
                              value={partnerDetail.partner?.status || 'pending'}
                              onChange={async (e) => {
                                try {
                                  await adminAPI.updatePartnerStatus(partnerDetail.partner.id, e.target.value);
                                  toast.success('Status geaendert!');
                                  loadPartnerDetail(partnerDetail.partner.id);
                                  fetchPartners();
                                } catch (err) { toast.error('Fehler'); }
                              }}
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                            >
                              <option value="pending">Ausstehend</option>
                              <option value="active">Aktiv</option>
                              <option value="inactive">Inaktiv</option>
                              <option value="suspended">Gesperrt</option>
                            </select>
                          </div>
                        </div>
                        {[
                          { icon: Hash, label: 'Empfehlungscode', value: partnerDetail.partner?.referral_code || '-' },
                          { icon: Users, label: 'Upline', value: partnerDetail.partner?.upline_first_name ? `${partnerDetail.partner.upline_first_name} ${partnerDetail.partner.upline_last_name} (${partnerDetail.partner.upline_email})` : 'Kein Upline' },
                          { icon: CreditCard, label: 'IBAN', value: partnerDetail.partner?.iban || '-' },
                          { icon: Building, label: 'BIC', value: partnerDetail.partner?.bic || '-' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <item.icon className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-secondary-400">{item.label}</p>
                              <p className="text-sm text-secondary-700 break-all">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Orders */}
                  {partnerDetail.recentOrders?.length > 0 && (
                    <div className="px-6 pb-4">
                      <h3 className="text-sm font-semibold text-secondary-500 uppercase mb-3">Letzte Bestellungen</h3>
                      <div className="overflow-x-auto border border-gray-100 rounded-xl">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500">Nr.</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500">Kunde</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500">Datum</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500">Betrag</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {partnerDetail.recentOrders.slice(0, 5).map((order) => (
                              <tr key={order.id}>
                                <td className="px-4 py-2 font-mono text-xs">{order.order_number}</td>
                                <td className="px-4 py-2">{order.customer_first_name} {order.customer_last_name}</td>
                                <td className="px-4 py-2 text-secondary-500">{formatDate(order.created_at)}</td>
                                <td className="px-4 py-2 text-right font-medium">{formatCurrency(order.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recent Commissions */}
                  {partnerDetail.commissions?.length > 0 && (
                    <div className="px-6 pb-6">
                      <h3 className="text-sm font-semibold text-secondary-500 uppercase mb-3">Letzte Provisionen</h3>
                      <div className="overflow-x-auto border border-gray-100 rounded-xl">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500">Datum</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500">Typ</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500">Bestellung</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-secondary-500">Status</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-secondary-500">Betrag</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {partnerDetail.commissions.slice(0, 10).map((c) => (
                              <tr key={c.id}>
                                <td className="px-4 py-2 text-secondary-500">{formatDate(c.created_at)}</td>
                                <td className="px-4 py-2">{c.type}</td>
                                <td className="px-4 py-2 font-mono text-xs">{c.order_number || '-'}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    c.status === 'paid' ? 'bg-green-100 text-green-700' :
                                    c.status === 'released' ? 'bg-blue-100 text-blue-700' :
                                    c.status === 'held' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>{c.status}</span>
                                </td>
                                <td className="px-4 py-2 text-right font-medium text-primary-500">{formatCurrency(c.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    {partnerDetail.partner?.status === 'pending' && (
                      <Button onClick={() => handleStatusChange(partnerDetail.partner.id, 'active')} className="bg-green-600 hover:bg-green-700 text-white">
                        Aktivieren
                      </Button>
                    )}
                    {partnerDetail.partner?.status === 'active' && (
                      <Button onClick={() => handleStatusChange(partnerDetail.partner.id, 'suspended')} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                        Sperren
                      </Button>
                    )}
                    {partnerDetail.partner?.status === 'suspended' && (
                      <Button onClick={() => handleStatusChange(partnerDetail.partner.id, 'active')}>
                        Reaktivieren
                      </Button>
                    )}
                    <Button variant="outline" onClick={closeDetail}>Schließen</Button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPartnersPage;
