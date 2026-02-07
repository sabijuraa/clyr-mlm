// client/src/pages/customer/CustomerDashboardPage.jsx
// GROUP 7: #9 Fix customer dashboard, #42 Documents, #36 Subscriptions
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, RefreshCw, User, LogOut, Download, Calendar, Shield, FileText, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerDashboardPage = () => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  const token = localStorage.getItem('customerToken');

  const apiFetch = async (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers }
    });
  };

  useEffect(() => {
    if (!token) { navigate('/customer/login'); return; }
    fetchAll();
  }, [token]);

  const fetchAll = async () => {
    try {
      const [profileRes, ordersRes, docsRes, subsRes] = await Promise.allSettled([
        apiFetch('/api/customers/profile'),
        apiFetch('/api/customers/orders'),
        apiFetch('/api/customers/documents'),
        apiFetch('/api/customers/subscriptions'),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const d = await profileRes.value.json();
        setCustomer(d.customer || d);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const d = await ordersRes.value.json();
        setOrders(d.orders || []);
      }
      if (docsRes.status === 'fulfilled' && docsRes.value.ok) {
        const d = await docsRes.value.json();
        setDocuments(d.documents || []);
      }
      if (subsRes.status === 'fulfilled' && subsRes.value.ok) {
        const d = await subsRes.value.json();
        setSubscriptions(d.subscriptions || []);
      }
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
      const response = await fetch(`/api/customers/orders/${orderNumber}/invoice`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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

  const cancelSubscription = async (subId) => {
    if (!confirm('Moechten Sie dieses Abonnement wirklich kuendigen?')) return;
    try {
      const res = await apiFetch(`/api/customers/subscriptions/${subId}/cancel`, {
        method: 'POST', body: JSON.stringify({ reason: 'Vom Kunden gekuendigt' })
      });
      if (!res.ok) throw new Error('Kuendigung fehlgeschlagen');
      toast.success('Abonnement gekuendigt');
      fetchAll();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const fmt = (d) => new Date(d).toLocaleDateString('de-DE');
  const fmtC = (a) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(a || 0);

  const statusBadge = (status) => {
    const m = {
      pending: ['Ausstehend', 'bg-yellow-100 text-yellow-700'],
      processing: ['In Bearbeitung', 'bg-blue-100 text-blue-700'],
      shipped: ['Versendet', 'bg-purple-100 text-purple-700'],
      delivered: ['Geliefert', 'bg-green-100 text-green-700'],
      paid: ['Bezahlt', 'bg-green-100 text-green-700'],
      cancelled: ['Storniert', 'bg-red-100 text-red-700'],
    };
    const [label, cls] = m[status] || [status, 'bg-gray-100 text-gray-700'];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-secondary-200 border-t-secondary-700 rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { id: 'orders', icon: Package, label: 'Bestellungen' },
    { id: 'documents', icon: FileText, label: 'Dokumente' },
    { id: 'subscriptions', icon: RefreshCw, label: 'Abonnements' },
    { id: 'profile', icon: User, label: 'Profil' },
    { id: 'privacy', icon: Shield, label: 'Datenschutz' },
  ];

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
            <span className="text-secondary-600 hidden sm:inline">Hallo, {customer?.first_name || 'Kunde'}</span>
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
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    activeTab === tab.id ? 'bg-secondary-700 text-white' : 'hover:bg-slate-50 text-secondary-600'
                  }`}>
                  <tab.icon className="w-5 h-5" /><span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3">
            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-2xl font-bold text-secondary-700">Meine Bestellungen</h2>
                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Package className="w-16 h-16 text-secondary-200 mx-auto mb-4" />
                    <p className="text-secondary-500">Noch keine Bestellungen.</p>
                    <Link to="/products" className="mt-4 inline-block text-primary-500 hover:underline">Jetzt einkaufen &rarr;</Link>
                  </div>
                ) : orders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-semibold text-secondary-700">Bestellung #{order.order_number}</p>
                        <p className="text-sm text-secondary-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-4 h-4" />{fmt(order.created_at)}
                        </p>
                      </div>
                      {statusBadge(order.status || order.payment_status)}
                    </div>
                    {order.items?.length > 0 && (
                      <div className="border-t border-gray-100 pt-4 space-y-2">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-secondary-600">{item.quantity}x {item.name}</span>
                            <span className="text-secondary-700 font-medium">{fmtC(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div>
                        <span className="text-secondary-500 text-sm">Gesamt:</span>
                        <span className="ml-2 font-bold text-secondary-700">{fmtC(order.total)}</span>
                      </div>
                      {order.invoice_number && (
                        <button onClick={() => downloadInvoice(order.order_number)}
                          className="flex items-center gap-2 px-4 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg text-sm">
                          <Download className="w-4 h-4" />Rechnung
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* DOCUMENTS TAB (#42) */}
            {activeTab === 'documents' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-2xl font-bold text-secondary-700">Meine Dokumente</h2>
                <p className="text-secondary-500 text-sm">Installationsanleitungen, Handbuecher und Garantiedokumente</p>
                {documents.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <FileText className="w-16 h-16 text-secondary-200 mx-auto mb-4" />
                    <p className="text-secondary-500">Noch keine Dokumente verfuegbar.</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Dokumente werden nach dem Kauf automatisch bereitgestellt.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-secondary-700 truncate">{doc.title}</p>
                            {doc.product_name && <p className="text-xs text-secondary-500">{doc.product_name}</p>}
                            {doc.description && <p className="text-sm text-gray-500 mt-1">{doc.description}</p>}
                            <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                              {doc.document_type === 'installation_guide' ? 'Installationsanleitung' :
                               doc.document_type === 'manual' ? 'Handbuch' :
                               doc.document_type === 'warranty' ? 'Garantie' : doc.document_type}
                            </span>
                          </div>
                        </div>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="mt-3 flex items-center gap-2 px-3 py-2 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg text-sm w-full justify-center">
                          <Download className="w-4 h-4" />Herunterladen
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* SUBSCRIPTIONS TAB (#36) */}
            {activeTab === 'subscriptions' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-2xl font-bold text-secondary-700">Filter-Abonnements</h2>
                <p className="text-secondary-500 text-sm">
                  Lassen Sie sich Ersatzfilter automatisch zusenden und sparen Sie dabei.
                </p>
                {subscriptions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <RefreshCw className="w-16 h-16 text-secondary-200 mx-auto mb-4" />
                    <p className="text-secondary-500">Keine aktiven Abonnements.</p>
                    <Link to="/products?category=filter" className="mt-4 inline-flex items-center gap-2 text-primary-500 hover:underline">
                      <Plus className="w-4 h-4" />Filter-Abo einrichten
                    </Link>
                  </div>
                ) : subscriptions.map(sub => (
                  <div key={sub.id} className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {sub.product_image && <img src={sub.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                        <div>
                          <p className="font-semibold text-secondary-700">{sub.product_name || 'Filter-Abonnement'}</p>
                          <p className="text-sm text-secondary-500">Alle {sub.interval_months || 12} Monate</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {sub.status === 'active' ? 'Aktiv' : sub.status === 'cancelled' ? 'Gekuendigt' : sub.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
                      <div>
                        <span className="text-secondary-500">Naechste Lieferung:</span>
                        <p className="font-medium text-secondary-700">{sub.next_billing_at ? fmt(sub.next_billing_at) : '-'}</p>
                      </div>
                      <div>
                        <span className="text-secondary-500">Preis:</span>
                        <p className="font-medium text-secondary-700">{fmtC(sub.price || sub.product_price)}</p>
                      </div>
                    </div>
                    {sub.status === 'active' && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button onClick={() => cancelSubscription(sub.id)} className="text-sm text-red-500 hover:text-red-600">
                          Abonnement kuendigen
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold text-secondary-700 mb-6">Mein Profil</h2>
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { label: 'Vorname', value: customer?.first_name },
                      { label: 'Nachname', value: customer?.last_name },
                      { label: 'E-Mail', value: customer?.email },
                      { label: 'Telefon', value: customer?.phone },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-sm font-medium text-secondary-600 mb-1">{f.label}</label>
                        <p className="text-secondary-700">{f.value || '-'}</p>
                      </div>
                    ))}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-secondary-600 mb-1">Adresse</label>
                      <p className="text-secondary-700">
                        {customer?.street || customer?.address_line1 || '-'}<br />
                        {customer?.zip || customer?.postal_code} {customer?.city}<br />
                        {customer?.country}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold text-secondary-700 mb-6">Datenschutz</h2>
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="font-semibold text-secondary-700 mb-2">Daten exportieren</h3>
                    <p className="text-secondary-500 text-sm mb-4">Fordern Sie eine Kopie Ihrer gespeicherten Daten an.</p>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200">
                      <Download className="w-4 h-4" />Datenexport anfordern
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h3 className="font-semibold text-secondary-700 mb-2">Datenschutzerklaerung</h3>
                    <p className="text-secondary-500 text-sm mb-4">
                      Informationen zur Verarbeitung Ihrer personenbezogenen Daten.
                    </p>
                    <Link to="/privacy" className="text-primary-500 hover:underline text-sm">
                      Datenschutzerklaerung lesen &rarr;
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
