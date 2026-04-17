// client/src/pages/dashboard/CustomersPage.jsx
// Partner: View all customers with full details and order history
import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin, Calendar, ChevronDown, ChevronUp, Search, Package } from 'lucide-react';
import { partnerAPI } from '../../services/api';
import { formatCurrency } from '../../config/app.config';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEmail, setExpandedEmail] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await partnerAPI.getCustomers({ limit: 100 });
      const data = response.data;
      const customersList = data.customers || data || [];
      setCustomers(customersList.map(c => ({
        id: c.id || c.email,
        firstName: c.first_name || c.firstName || '',
        lastName: c.last_name || c.lastName || '',
        email: c.email || '',
        phone: c.phone || '',
        street: c.street || '',
        zip: c.zip || '',
        city: c.city || '',
        country: c.country || '',
        birthDate: c.birth_date || c.birthDate || null,
        company: c.company || '',
        vatId: c.vat_id || '',
        totalOrders: parseInt(c.order_count || 0),
        totalSpent: parseFloat(c.total_spent || 0),
        firstOrder: c.first_order_at ? new Date(c.first_order_at) : null,
        lastOrder: c.last_order_at ? new Date(c.last_order_at) : null,
        orders: c.orders || []
      })));
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || 
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q);
  });

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.totalOrders, 0);

  const statusBadge = (status) => {
    const map = {
      'pending': { label: 'Ausstehend', c: 'bg-yellow-100 text-yellow-700' },
      'processing': { label: 'In Bearbeitung', c: 'bg-blue-100 text-blue-700' },
      'shipped': { label: 'Versandt', c: 'bg-indigo-100 text-indigo-700' },
      'completed': { label: 'Abgeschlossen', c: 'bg-green-100 text-green-700' },
      'cancelled': { label: 'Storniert', c: 'bg-red-100 text-red-700' },
    };
    return map[status] || { label: status || '-', c: 'bg-gray-100 text-gray-700' };
  };

  const payBadge = (status) => {
    const map = {
      'paid': { label: 'Bezahlt', c: 'bg-green-100 text-green-700' },
      'pending': { label: 'Ausstehend', c: 'bg-yellow-100 text-yellow-700' },
      'failed': { label: 'Fehlgeschlagen', c: 'bg-red-100 text-red-700' },
      'refunded': { label: 'Erstattet', c: 'bg-gray-100 text-gray-700' },
    };
    return map[status] || { label: status || '-', c: 'bg-gray-100 text-gray-700' };
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

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-secondary-700">Kunden</h1>
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-secondary-400">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-heading font-bold text-secondary-700">Meine Kunden</h1>
        <p className="text-sm text-secondary-500 mt-1">Kunden, die über Ihren Empfehlungslink bestellt haben</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-secondary-500">Kunden gesamt</p><p className="text-xl font-bold text-secondary-800">{customers.length}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg"><Package className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-secondary-500">Bestellungen</p><p className="text-xl font-bold text-secondary-800">{totalOrders}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg"><Calendar className="w-5 h-5 text-purple-600" /></div>
          <div><p className="text-xs text-secondary-500">Umsatz</p><p className="text-xl font-bold text-secondary-800">{formatCurrency(totalRevenue)}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input type="text" placeholder="Name, E-Mail oder Stadt suchen..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400" />
        </div>
      </div>

      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-secondary-500">{searchQuery ? 'Keine Ergebnisse' : 'Teilen Sie Ihren Link, um Kunden zu gewinnen'}</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const isExpanded = expandedEmail === customer.email;
            return (
              <div key={customer.email} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 sm:p-5 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedEmail(isExpanded ? null : customer.email)}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary-700 flex-shrink-0 flex items-center justify-center text-white font-bold">
                      {(customer.firstName[0] || '?').toUpperCase()}{(customer.lastName[0] || '').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-secondary-800 truncate">{customer.firstName} {customer.lastName}</h3>
                          <p className="text-xs sm:text-sm text-secondary-500 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 flex-shrink-0" />{customer.email}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-secondary-400" /> : <ChevronDown className="w-5 h-5 text-secondary-400" />}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-secondary-600">
                        <span><strong>{customer.totalOrders}</strong> Bestellungen</span>
                        <span><strong>{formatCurrency(customer.totalSpent)}</strong> Umsatz</span>
                        {customer.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.city}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 sm:p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-secondary-500 uppercase mb-2">Kontaktdaten</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2"><Mail className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0" />
                          <div><p className="text-xs text-secondary-400">E-Mail</p><p className="text-secondary-700 break-all">{customer.email}</p></div>
                        </div>
                        {customer.phone && <div className="flex items-start gap-2"><Phone className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0" />
                          <div><p className="text-xs text-secondary-400">Telefon</p><p className="text-secondary-700">{customer.phone}</p></div>
                        </div>}
                        {(customer.street || customer.city) && <div className="flex items-start gap-2 sm:col-span-2"><MapPin className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0" />
                          <div><p className="text-xs text-secondary-400">Adresse</p><p className="text-secondary-700">
                            {customer.street && <>{customer.street}<br /></>}
                            {customer.zip} {customer.city}{customer.country && `, ${customer.country}`}
                          </p></div>
                        </div>}
                        {customer.birthDate && <div className="flex items-start gap-2"><Calendar className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0" />
                          <div><p className="text-xs text-secondary-400">Geburtsdatum</p><p className="text-secondary-700">{new Date(customer.birthDate).toLocaleDateString('de-DE')}</p></div>
                        </div>}
                        {customer.company && <div><p className="text-xs text-secondary-400">Firma</p><p className="text-secondary-700">{customer.company}</p></div>}
                        {customer.vatId && <div><p className="text-xs text-secondary-400">USt-IdNr.</p><p className="text-secondary-700">{customer.vatId}</p></div>}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-secondary-500 uppercase mb-2">Bestellungen ({customer.orders.length})</h4>
                      {customer.orders.length === 0 ? (
                        <p className="text-sm text-secondary-400 italic">Keine Bestellungen</p>
                      ) : (
                        <div className="space-y-2">
                          {customer.orders.map((order, idx) => {
                            const s = statusBadge(order.status);
                            const p = payBadge(order.payment_status);
                            return (
                              <div key={idx} className="bg-white rounded-lg border border-gray-100 p-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                    <p className="font-mono text-xs text-secondary-500">{order.number}</p>
                                    <p className="text-xs text-secondary-400 mt-0.5">{order.created_at ? new Date(order.created_at).toLocaleDateString('de-DE') : '-'}</p>
                                  </div>
                                  <div className="flex flex-col gap-1 items-end">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.c}`}>{s.label}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.c}`}>{p.label}</span>
                                  </div>
                                </div>
                                {order.items && order.items.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                                    {order.items.map((item, i) => (
                                      <div key={i} className="flex justify-between text-xs text-secondary-600">
                                        <span className="truncate">• {item.quantity}× {item.product_name}
                                          {getVariantText(item) && <span className="text-blue-600 italic"> ({getVariantText(item)})</span>}
                                        </span>
                                        <span className="font-mono ml-2 flex-shrink-0">{formatCurrency(item.total || 0)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex justify-end mt-2 pt-2 border-t border-gray-100">
                                  <span className="text-sm font-bold text-secondary-800">{formatCurrency(order.total || 0)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
