import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api, { ordersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  ShoppingBag,
  Search,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Package,
  CreditCard,
  Calendar,
  User,
  MapPin,
  FileText,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';
import { formatDate } from '../../utils/helpers';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/dashboard/StatCard';

const AdminOrdersPage = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await ordersAPI.getAll({ limit: 200 });
      const data = response.data;
      const ordersList = data.orders || data || [];
      // Normalize order data from API
      setOrders(ordersList.map(o => ({
        id: o.order_number || o.id,
        rawId: o.id,
        customer: {
          firstName: o.customer_first_name || o.customerFirstName || '',
          lastName: o.customer_last_name || o.customerLastName || '',
          email: o.customer_email || o.customerEmail || ''
        },
        items: o.items || [],
        total: parseFloat(o.total || 0),
        status: o.status || 'pending',
        paymentStatus: o.payment_status || o.paymentStatus || 'pending',
        partner: o.partner_first_name ? {
          name: `${o.partner_first_name} ${o.partner_last_name || ''}`.trim(),
          code: o.partner_referral_code || o.referral_code || ''
        } : null,
        shippingAddress: {
          street: o.shipping_street || o.customer_street || '',
          city: o.shipping_city || o.customer_city || '',
          zip: o.shipping_zip || o.customer_zip || '',
          country: o.shipping_country || o.customer_country || ''
        },
        createdAt: new Date(o.created_at),
        shippedAt: o.shipped_at ? new Date(o.shipped_at) : null,
        order_number: o.order_number
      })));
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    processing: orders.filter(o => o.status === 'processing').length,
    pending: orders.filter(o => o.status === 'pending').length,
    revenue: orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0)
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = !searchQuery ||
      (o.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status) => {
    const configs = {
      completed: { label: 'Abgeschlossen', icon: CheckCircle, color: 'text-primary-400 bg-secondary-100' },
      processing: { label: 'In Bearbeitung', icon: Truck, color: 'text-primary-400 bg-slate-50' },
      pending: { label: 'Ausstehend', icon: Clock, color: 'text-secondary-500 bg-gray-100' },
      cancelled: { label: 'Storniert', icon: XCircle, color: 'text-secondary-500 bg-gray-100' },
    };
    return configs[status] || configs.pending;
  };

  const getPaymentConfig = (status) => {
    const configs = {
      paid: { label: 'Bezahlt', icon: CheckCircle, color: 'text-primary-400' },
      pending: { label: 'Ausstehend', icon: Clock, color: 'text-secondary-500' },
      refunded: { label: 'Erstattet', icon: XCircle, color: 'text-secondary-500' },
    };
    return configs[status] || configs.pending;
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      fetchOrders();
      setShowDetailModal(false);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">Bestellungen</h1>
          <p className="text-secondary-500">Alle Bestellungen verwalten</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">
            Bestellungen
          </h1>
          <p className="text-secondary-500">Alle Bestellungen verwalten</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={Download}>
            Export
          </Button>
          <Button variant="outline" icon={FileText}>
            Bericht
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Gesamt" value={stats.total} icon={ShoppingBag} color="primary" index={0} />
        <StatCard title="Abgeschlossen" value={stats.completed} icon={CheckCircle} color="primary" index={1} />
        <StatCard title="In Bearbeitung" value={stats.processing} icon={Truck} color="primary" index={2} />
        <StatCard title="Ausstehend" value={stats.pending} icon={Clock} color="primary" index={3} />
        <StatCard title="Umsatz" value={formatCurrency(stats.revenue)} icon={CreditCard} color="primary" index={4} />
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Bestellung suchen (ID, Kunde, E-Mail)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Alle' },
              { value: 'pending', label: 'Ausstehend' },
              { value: 'processing', label: 'In Bearbeitung' },
              { value: 'completed', label: 'Abgeschlossen' },
              { value: 'cancelled', label: 'Storniert' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  statusFilter === option.value
                    ? 'bg-secondary-100 text-secondary-700'
                    : 'bg-gray-100 text-secondary-500 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Orders Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-secondary-700 mb-2">Keine Bestellungen</h3>
            <p className="text-secondary-500">
              {searchQuery ? 'Keine Ergebnisse für Ihre Suche' : 'Es gibt noch keine Bestellungen'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-secondary-500">Bestellung</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-secondary-500">Kunde</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-secondary-500">Partner</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-secondary-500">Betrag</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-secondary-500">Status</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-secondary-500">Zahlung</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-secondary-500">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const statusConfig = getStatusConfig(order.status);
                  const StatusIcon = statusConfig.icon;
                  const paymentConfig = getPaymentConfig(order.paymentStatus);
                  const PaymentIcon = paymentConfig.icon;
                  return (
                    <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-secondary-700">{order.id}</p>
                            <p className="text-sm text-secondary-500">{formatDate(order.createdAt)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-medium text-secondary-700">
                          {order.customer.firstName} {order.customer.lastName}
                        </p>
                        <p className="text-sm text-secondary-500">{order.customer.email}</p>
                      </td>
                      <td className="py-4 px-6">
                        {order.partner ? (
                          <div>
                            <p className="text-secondary-700">{order.partner.name}</p>
                            <p className="text-sm text-secondary-500">{order.partner.code}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">Kein Partner</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-semibold text-secondary-700">{formatCurrency(order.total)}</p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1 ${paymentConfig.color}`}>
                            <PaymentIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{paymentConfig.label}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }}
                            className="p-2 text-gray-400 hover:text-primary-400 hover:bg-slate-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Bestellung ${order.order_number || order.id} wirklich loeschen?`)) return;
                              try {
                                await ordersAPI.delete(order.rawId || order.id);
                                toast.success('Bestellung geloescht');
                                fetchOrders();
                              } catch (e) { toast.error('Fehler beim Loeschen'); }
                            }}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Order Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Bestellung ${selectedOrder?.id}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Status Row */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-secondary-700">{formatDate(selectedOrder.createdAt, { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const cfg = getStatusConfig(selectedOrder.status);
                  const Icon = cfg.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-secondary-700 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-400" />
                  Kunde
                </h4>
                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <p className="font-medium text-secondary-700">
                    {selectedOrder.customer.firstName} {selectedOrder.customer.lastName}
                  </p>
                  <p className="text-secondary-500">{selectedOrder.customer.email}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-secondary-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-400" />
                  Lieferadresse
                </h4>
                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                  <p className="text-secondary-700">{selectedOrder.shippingAddress.street}</p>
                  <p className="text-secondary-500">
                    {selectedOrder.shippingAddress.zip} {selectedOrder.shippingAddress.city}
                  </p>
                  <p className="text-secondary-500">{selectedOrder.shippingAddress.country}</p>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl font-semibold">
              <span className="text-secondary-700">Gesamt</span>
              <span className="text-lg text-secondary-700">{formatCurrency(selectedOrder.total)}</span>
            </div>

            {/* Partner Info */}
            {selectedOrder.partner && (
              <div className="p-4 bg-slate-50 rounded-xl border border-secondary-100">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="font-medium text-secondary-700">Partner: {selectedOrder.partner.name}</p>
                    <p className="text-sm text-secondary-700">Code: {selectedOrder.partner.code}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              {selectedOrder.status === 'pending' && (
                <Button variant="primary" className="flex-1" icon={CheckCircle}
                  onClick={() => handleUpdateStatus(selectedOrder.rawId, 'processing')}>
                  Bestätigen
                </Button>
              )}
              {selectedOrder.status === 'processing' && (
                <Button variant="primary" className="flex-1" icon={Truck}
                  onClick={() => handleUpdateStatus(selectedOrder.rawId, 'completed')}>
                  Als versendet markieren
                </Button>
              )}
              <Button 
                variant="outline" 
                className="flex-1" 
                icon={FileText}
                onClick={async () => {
                  try {
                    await api.post(`/admin/invoices/generate/${selectedOrder.rawId}`).catch(() => {});
                    const res = await api.get(`/orders/${selectedOrder.rawId}/invoice`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(res.data);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Rechnung-${selectedOrder.order_number || selectedOrder.id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    alert('Rechnung konnte nicht erstellt werden');
                  }
                }}
              >
                Rechnung
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOrdersPage;
