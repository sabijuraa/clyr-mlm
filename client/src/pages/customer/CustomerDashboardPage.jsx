/**
 * Customer Dashboard Page
 * Order history, subscriptions, profile management
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, RefreshCw, User, LogOut, 
  Download, Calendar, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerDashboardPage = () => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  
  const token = localStorage.getItem('customerToken');
  
  useEffect(() => {
    if (!token) {
      navigate('/customer/login');
      return;
    }
    fetchDashboardData();
  }, [token]);
  
  const fetchDashboardData = async () => {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const profileRes = await fetch(`${import.meta.env.VITE_API_URL}/api/customer/profile`, { headers });
      const profileData = await profileRes.json();
      if (profileRes.ok) setCustomer(profileData.customer);
      
      const ordersRes = await fetch(`${import.meta.env.VITE_API_URL}/api/customer/orders`, { headers });
      const ordersData = await ordersRes.json();
      if (ordersRes.ok) setOrders(ordersData.orders || []);
      
      const subsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/customer/subscriptions`, { headers });
      const subsData = await subsRes.json();
      if (subsRes.ok) setSubscriptions(subsData.subscriptions || []);
      
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerData');
    toast.success('Erfolgreich abgemeldet');
    navigate('/customer/login');
  };
  
  const downloadInvoice = async (orderNumber) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/customer/orders/${orderNumber}/invoice`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Download fehlgeschlagen');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rechnung-${orderNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Rechnung heruntergeladen');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const cancelSubscription = async (subscriptionId) => {
    if (!confirm('Möchten Sie dieses Abonnement wirklich kündigen?')) return;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/customer/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason: 'Vom Kunden gekündigt' })
        }
      );
      
      if (!response.ok) throw new Error('Kündigung fehlgeschlagen');
      
      toast.success('Abonnement gekündigt');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const formatDate = (date) => new Date(date).toLocaleDateString('de-DE');
  
  const formatCurrency = (amount) => new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR'
  }).format(amount);
  
  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-700' },
      processing: { label: 'In Bearbeitung', color: 'bg-blue-100 text-blue-700' },
      shipped: { label: 'Versendet', color: 'bg-purple-100 text-purple-700' },
      delivered: { label: 'Geliefert', color: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Storniert', color: 'bg-red-100 text-red-700' }
    };
    const { label, color } = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-secondary-200 border-t-secondary-700 rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/clyr-logo.png" alt="CLYR" className="h-10" />
            <span className="text-secondary-300">|</span>
            <span className="font-medium text-secondary-600">Kundenbereich</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-secondary-600">Hallo, {customer?.first_name || 'Kunde'}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-secondary-500 hover:text-secondary-700">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <nav className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1">
              {[
                { id: 'orders', icon: Package, label: 'Meine Bestellungen' },
                { id: 'subscriptions', icon: RefreshCw, label: 'Abonnements' },
                { id: 'profile', icon: User, label: 'Mein Profil' },
                { id: 'privacy', icon: Shield, label: 'Datenschutz' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === tab.id ? 'bg-secondary-700 text-white' : 'hover:bg-slate-50 text-secondary-600'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="lg:col-span-3">
            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-2xl font-bold text-secondary-700">Meine Bestellungen</h2>
                
                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Package className="w-16 h-16 text-secondary-200 mx-auto mb-4" />
                    <p className="text-secondary-500">Sie haben noch keine Bestellungen.</p>
                    <Link to="/products" className="mt-4 inline-block text-primary-500 hover:underline">
                      Jetzt einkaufen →
                    </Link>
                  </div>
                ) : (
                  orders.map(order => (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold text-secondary-700">Bestellung #{order.order_number}</p>
                          <p className="text-sm text-secondary-500 flex items-center gap-1 mt-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      
                      <div className="border-t border-gray-100 pt-4 space-y-2">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-secondary-600">{item.quantity}x {item.name}</span>
                            <span className="text-secondary-700 font-medium">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div>
                          <span className="text-secondary-500 text-sm">Gesamt:</span>
                          <span className="ml-2 font-bold text-secondary-700">{formatCurrency(order.total)}</span>
                        </div>
                        <button
                          onClick={() => downloadInvoice(order.order_number)}
                          className="flex items-center gap-2 px-4 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Rechnung
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
            
            {activeTab === 'subscriptions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-2xl font-bold text-secondary-700">Meine Abonnements</h2>
                
                {subscriptions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <RefreshCw className="w-16 h-16 text-secondary-200 mx-auto mb-4" />
                    <p className="text-secondary-500">Sie haben keine aktiven Abonnements.</p>
                  </div>
                ) : (
                  subscriptions.map(sub => (
                    <div key={sub.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-semibold text-secondary-700">{sub.product_name}</p>
                          <p className="text-sm text-secondary-500">Alle {sub.interval_months} Monate</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {sub.status === 'active' ? 'Aktiv' : 'Gekündigt'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
                        <div>
                          <span className="text-secondary-500">Nächste Lieferung:</span>
                          <p className="font-medium text-secondary-700">{formatDate(sub.next_billing_date)}</p>
                        </div>
                        <div>
                          <span className="text-secondary-500">Preis:</span>
                          <p className="font-medium text-secondary-700">{formatCurrency(sub.price)}</p>
                        </div>
                      </div>
                      
                      {sub.status === 'active' && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <button onClick={() => cancelSubscription(sub.id)} className="text-sm text-red-500 hover:text-red-600">
                            Abonnement kündigen
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </motion.div>
            )}
            
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold text-secondary-700 mb-6">Mein Profil</h2>
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { label: 'Vorname', value: customer?.first_name },
                      { label: 'Nachname', value: customer?.last_name },
                      { label: 'E-Mail', value: customer?.email },
                      { label: 'Telefon', value: customer?.phone }
                    ].map(field => (
                      <div key={field.label}>
                        <label className="block text-sm font-medium text-secondary-600 mb-1">{field.label}</label>
                        <p className="text-secondary-700">{field.value || '-'}</p>
                      </div>
                    ))}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-secondary-600 mb-1">Adresse</label>
                      <p className="text-secondary-700">
                        {customer?.street || '-'}<br />
                        {customer?.zip} {customer?.city}<br />
                        {customer?.country}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'privacy' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold text-secondary-700 mb-6">Datenschutz</h2>
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="font-semibold text-secondary-700 mb-2">Daten exportieren</h3>
                    <p className="text-secondary-500 text-sm mb-4">
                      Fordern Sie eine Kopie aller Ihrer gespeicherten Daten an.
                    </p>
                    <Link to="/gdpr/export" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200">
                      <Download className="w-4 h-4" />
                      Datenexport anfordern
                    </Link>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="font-semibold text-secondary-700 mb-2">Konto löschen</h3>
                    <p className="text-secondary-500 text-sm mb-4">
                      Fordern Sie die Löschung Ihres Kontos und aller Daten an.
                    </p>
                    <Link to="/gdpr/delete" className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                      <Shield className="w-4 h-4" />
                      Löschung anfordern
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
