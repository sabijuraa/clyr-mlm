import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Mail, Phone, MapPin, ShoppingBag, Calendar, Download } from 'lucide-react';
import { formatCurrency } from '../../config/app.config';
import { formatDate } from '../../utils/helpers';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import api from '../../services/api';

const AdminCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => { fetchCustomers(); }, [page, searchQuery]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/customers', {
        params: { page, limit: 20, search: searchQuery || undefined }
      });
      const data = response.data;
      setCustomers(data.customers || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error('Failed to load customers:', err);
      toast.error('Fehler beim Laden der Kunden');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerOrders = async (email) => {
    if (customerOrders[email] !== undefined) { 
      setExpandedCustomer(email); 
      return; 
    }
    try {
      // Use exact customer_email filter to get complete order history
      const res = await api.get('/orders', { 
        params: { customer_email: email, limit: 200, page: 1 }
      });
      const orders = res.data?.orders || res.data?.data || [];
      console.log('[CUSTOMERS] Orders for', email, ':', orders.length);
      setCustomerOrders(prev => ({ ...prev, [email]: orders }));
      setExpandedCustomer(email);
    } catch(e) { 
      console.error('Load customer orders error:', e.message);
      setCustomerOrders(prev => ({ ...prev, [email]: [] }));
      setExpandedCustomer(email);
    }
  };

  const getVariantText = (item) => {
    if (item?.variant_description) return item.variant_description;
    if (!item?.variant_data) return '';
    try {
      const data = typeof item.variant_data === 'string'
        ? JSON.parse(item.variant_data)
        : item.variant_data;
      return Object.values(data || {}).map(v => v?.name).filter(Boolean).join(', ');
    } catch {
      return '';
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/customers', { params: { limit: 10000 } });
      const customers = response.data.customers || [];
      const csv = [
        'Name,E-Mail,Telefon,Stadt,Land,Bestellungen,Umsatz,Registriert',
        ...customers.map(c =>
          `${c.first_name} ${c.last_name},${c.email},${c.phone || ''},${c.city || ''},${c.country || ''},${c.order_count || 0},${c.total_spent || 0},${c.created_at}`
        )
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `kunden-${Date.now()}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Export erfolgreich');
    } catch { toast.error('Export fehlgeschlagen'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">Kunden</h1>
          <p className="text-secondary-500">Alle registrierten Kunden</p>
        </div>
        <Button variant="outline" icon={Download} onClick={handleExport}>Export CSV</Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Suche nach Name, E-Mail, Stadt..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? <Loading /> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {customers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-secondary-700 mb-2">Keine Kunden gefunden</h3>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Name', 'E-Mail', 'Ort', 'Partner', 'Bestellungen', 'Umsatz', 'Registriert'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers.map((c, idx) => (
                      <React.Fragment key={c.id}>
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => expandedCustomer === c.email ? setExpandedCustomer(null) : loadCustomerOrders(c.email)}>
                        <td className="px-4 py-3 font-medium text-secondary-700">
                          <div className="flex items-center gap-2">
                            <span>{expandedCustomer === c.email ? '▾' : '▸'}</span>
                            <div>
                              {c.first_name} {c.last_name}
                              {c.phone && <div className="text-xs text-gray-400 mt-0.5">{c.phone}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-secondary-500 text-sm">{c.email}</td>
                        <td className="px-4 py-3 text-secondary-500 text-sm">
                          {c.street && <div className="text-xs">{c.street}</div>}
                          <div>{c.zip && `${c.zip} `}{c.city || '-'}{c.country && `, ${c.country}`}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{c.partner_name ? <span className="px-2 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">{c.partner_name}</span> : <span className="text-gray-400">-</span>}</td>
                        <td className="px-4 py-3 text-center font-medium">{c.order_count || 0}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary-600">{formatCurrency(c.total_spent || 0)}</td>
                        <td className="px-4 py-3 text-secondary-500 text-sm">{formatDate(c.created_at)}</td>
                      </motion.tr>
                      {expandedCustomer === c.email && (
                        <tr className="bg-blue-50">
                          <td colSpan="7" className="px-6 py-4">
                            <p className="font-semibold text-sm text-gray-700 mb-2">Bestellungen von {c.first_name} {c.last_name}:</p>
                            {customerOrders[c.email]?.length > 0 ? (
                              <table className="w-full text-xs">
                                <thead><tr className="text-gray-500 border-b border-blue-200">
                                  <th className="py-1 text-left">Bestellnr.</th>
                                  <th className="py-1 text-left">Datum</th>
                                  <th className="py-1 text-left">Status</th>
                                  <th className="py-1 text-left">Zahlung</th>
                                  <th className="py-1 text-right">Betrag</th>
                                </tr></thead>
                                <tbody>{customerOrders[c.email].map(o => (
                                  <React.Fragment key={o.id}>
                                  <tr className="border-b border-blue-100">
                                    <td className="py-1 font-mono">{o.order_number}</td>
                                    <td className="py-1">{o.created_at ? new Date(o.created_at).toLocaleDateString('de-DE') : '-'}</td>
                                    <td className="py-1"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${o.status==='completed'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{o.status}</span></td>
                                    <td className="py-1"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${o.payment_status==='paid'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{o.payment_status}</span></td>
                                    <td className="py-1 text-right font-semibold">€{parseFloat(o.total||0).toFixed(2)}</td>
                                  </tr>
                                  {o.items && o.items.length > 0 && (
                                    <tr>
                                      <td colSpan="5" className="pl-4 pb-2 pt-1">
                                        <div className="text-[11px] text-gray-600 space-y-0.5">
                                          {o.items.map((item, i) => (
                                            <div key={i} className="flex justify-between">
                                              <span>
                                                • {item.quantity}x {item.product_name}
                                                {getVariantText(item) && <span className="text-blue-600 italic"> ({getVariantText(item)})</span>}
                                              </span>
                                              <span className="font-mono">€{parseFloat(item.total||0).toFixed(2)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  </React.Fragment>
                                ))}</tbody>
                              </table>
                            ) : <p className="text-sm text-gray-400">Keine Bestellungen gefunden</p>}
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination && pagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-secondary-500">Seite {page} von {pagination.totalPages} ({pagination.total} Kunden)</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>←</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page === pagination.totalPages}>→</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCustomersPage;
