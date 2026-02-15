import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Mail, Phone, MapPin, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../config/app.config';
import { formatDate } from '../../utils/formatters';
import { partnerAPI } from '../../services/api';
import Button from '../../components/common/Button';

const CustomersPage = () => {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
        id: c.id,
        firstName: c.first_name || c.firstName || '',
        lastName: c.last_name || c.lastName || '',
        email: c.email || '',
        phone: c.phone || '',
        city: c.city || '',
        totalOrders: parseInt(c.total_orders || c.totalOrders || 0),
        totalSpent: parseFloat(c.total_spent || c.totalSpent || 0),
        lastOrder: c.last_order_at || c.lastOrder ? new Date(c.last_order_at || c.lastOrder) : null
      })));
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(query) ||
      c.lastName.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.city.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-secondary-700">{t('dashboard.menu.customers')}</h1>
          <p className="text-secondary-500">Kunden, die über Ihre Links bestellt haben</p>
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-gray-100" />)}
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
            {t('dashboard.menu.customers')}
          </h1>
          <p className="text-secondary-500">Kunden, die über Ihre Links bestellt haben</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-xl font-semibold">
            {customers.length} Kunden
          </div>
        </div>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-4"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Kunde suchen (Name, E-Mail, Stadt)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
          />
        </div>
      </motion.div>

      {/* Customer List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-secondary-700 mb-2">Keine Kunden gefunden</h3>
            <p className="text-secondary-500">
              {searchQuery ? 'Versuchen Sie andere Suchbegriffe' : 'Teilen Sie Ihren Link, um Kunden zu gewinnen'}
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Avatar & Name */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-full bg-secondary-700 
                    flex items-center justify-center text-white font-bold text-lg">
                    {customer.firstName[0] || '?'}{customer.lastName[0] || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-700 text-lg">
                      {customer.firstName} {customer.lastName}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-secondary-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {customer.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-secondary-500">
                      <Phone className="w-4 h-4" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.city && (
                    <div className="flex items-center gap-1 text-secondary-500">
                      <MapPin className="w-4 h-4" />
                      {customer.city}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-secondary-700">{customer.totalOrders}</p>
                    <p className="text-xs text-secondary-500">Bestellungen</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary-400">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-xs text-secondary-500">Umsatz</p>
                  </div>
                </div>
              </div>

              {/* Last Order */}
              {customer.lastOrder && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-sm text-secondary-500">
                    Letzte Bestellung: {formatDate(customer.lastOrder)}
                  </span>
                  <Button variant="ghost" size="sm" icon={ShoppingBag}>
                    Bestellungen
                  </Button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Summary */}
      {customers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-secondary-600 to-secondary-700 rounded-2xl p-6 text-white"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-4xl font-bold">{customers.length}</p>
              <p className="text-white/70">Kunden gesamt</p>
            </div>
            <div>
              <p className="text-4xl font-bold">
                {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
              </p>
              <p className="text-white/70">Bestellungen</p>
            </div>
            <div>
              <p className="text-4xl font-bold">
                {formatCurrency(customers.reduce((sum, c) => sum + c.totalSpent, 0))}
              </p>
              <p className="text-white/70">Gesamtumsatz</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CustomersPage;
