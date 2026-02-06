import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatPrice, formatDateTime } from '../../utils/format';
import { Package, Search, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import toast from '../../utils/toast';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Bestätigt', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'In Bearbeitung', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'shipped', label: 'Versendet', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Zugestellt', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Storniert', color: 'bg-red-100 text-red-800' },
  { value: 'refunded', label: 'Erstattet', color: 'bg-gray-100 text-gray-800' },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      const { data } = await api.get(`/orders/admin/all?${params}`);
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      toast.error('Fehler beim Laden der Bestellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success('Status aktualisiert');
      fetchOrders();
      if (viewOrder?.id === orderId) setViewOrder(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const viewOrderDetails = async (id) => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setViewOrder(data);
    } catch (err) {
      toast.error('Fehler beim Laden');
    }
  };

  const getStatusStyle = (status) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const found = STATUS_OPTIONS.find(s => s.value === status);
    return found?.label || status;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-clyr-dark mb-6">Bestellungen</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input-field pl-10 w-64"
              placeholder="Bestellnummer suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-outline text-sm">Suchen</button>
        </form>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-auto text-sm"
        >
          <option value="">Alle Status</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Laden...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Keine Bestellungen gefunden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Bestellnr.</th>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Kunde</th>
                  <th className="px-4 py-3 text-right">Summe</th>
                  <th className="px-4 py-3 text-center">Zahlung</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(orders) ? orders : []).map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-medium text-clyr-dark">{order.order_number}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(order.created_at)}</td>
                    <td className="px-4 py-3">
                      {order.first_name} {order.last_name}
                      {order.referral_code && <span className="text-xs text-clyr-teal ml-1">({order.referral_code})</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(order.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.payment_status === 'paid' ? 'Bezahlt' : 'Offen'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={order.status}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        className={`text-xs font-medium rounded-full px-2.5 py-1 border-0 cursor-pointer ${getStatusStyle(order.status)}`}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => viewOrderDetails(order.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">Seite {page} von {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {viewOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">Bestellung {viewOrder.order_number}</h2>
              <button onClick={() => setViewOrder(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Datum:</span> <span className="font-medium">{formatDateTime(viewOrder.created_at)}</span></div>
                <div><span className="text-gray-500">Status:</span> <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(viewOrder.status)}`}>{getStatusLabel(viewOrder.status)}</span></div>
                <div><span className="text-gray-500">Zahlung:</span> <span className="font-medium">{viewOrder.payment_status}</span></div>
                <div><span className="text-gray-500">Land:</span> <span className="font-medium">{viewOrder.shipping_country}</span></div>
              </div>

              {viewOrder.shipping_address && (
                <div className="text-sm">
                  <h4 className="font-semibold mb-1">Lieferadresse</h4>
                  <p className="text-gray-600">
                    {viewOrder.shipping_address.first_name} {viewOrder.shipping_address.last_name}<br />
                    {viewOrder.shipping_address.street}<br />
                    {viewOrder.shipping_address.zip} {viewOrder.shipping_address.city}<br />
                    {viewOrder.shipping_address.country}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Artikel</h4>
                <div className="space-y-2">
                  {viewOrder.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                      <div>
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-gray-400 ml-2">× {item.quantity}</span>
                      </div>
                      <span className="font-medium">{formatPrice(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm space-y-1 pt-2 border-t">
                <div className="flex justify-between"><span className="text-gray-500">Zwischensumme</span><span>{formatPrice(viewOrder.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Versand</span><span>{formatPrice(viewOrder.shipping_cost)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">MwSt ({viewOrder.tax_rate}%)</span><span>{formatPrice(viewOrder.tax_amount)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Gesamt</span><span>{formatPrice(viewOrder.total)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
