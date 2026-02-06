import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatPrice, formatDateTime, statusLabels, statusColors } from '../../utils/format';
import { Package, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.get('/orders/my').then(r => setOrders(Array.isArray(r.data) ? r.data : r.data.orders || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const downloadInvoice = async (orderId, orderNumber) => {
    try {
      const response = await api.get(`/invoices/order/${orderId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url; a.download = `RE-${orderNumber}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { console.error('Invoice download failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-clyr-teal border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-clyr-dark mb-6">Meine Bestellungen</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Noch keine Bestellungen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                <div>
                  <p className="font-mono font-semibold text-clyr-dark">{order.order_number}</p>
                  <p className="text-sm text-gray-500">{formatDateTime(order.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  <span className="font-bold">{formatPrice(order.total)}</span>
                  {expandedId === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>
              {expandedId === order.id && (
                <div className="border-t px-4 py-4 bg-gray-50 animate-fadeIn">
                  <div className="space-y-2 mb-4">
                    {order.items?.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}× {item.product_name}</span>
                        <span className="font-medium">{formatPrice(item.total_price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm space-y-1 border-t pt-3">
                    <div className="flex justify-between"><span className="text-gray-500">Versand</span><span>{parseFloat(order.shipping_cost) === 0 ? 'Kostenlos' : formatPrice(order.shipping_cost)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Gesamt</span><span>{formatPrice(order.total)}</span></div>
                  </div>
                  {order.payment_status === 'paid' && (
                    <button onClick={() => downloadInvoice(order.id, order.order_number)}
                      className="mt-3 flex items-center gap-2 text-sm text-clyr-teal hover:underline">
                      <FileText className="w-4 h-4" /> Rechnung herunterladen
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
