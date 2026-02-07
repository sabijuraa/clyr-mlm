import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Search, Filter, Calendar,
  User, Building, Receipt, CreditCard, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminInvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/invoices?type=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Fehler beim Laden der Rechnungen');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      setGenerating(invoice.id);
      // Use admin invoice PDF endpoint for both types
      let endpoint;
      if (invoice.type === 'customer' && invoice.order_id) {
        endpoint = `/api/orders/${invoice.order_id}/invoice`;
      } else {
        endpoint = `/api/admin/invoices/${invoice.id}/pdf`;
      }
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoice_number || 'Rechnung'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('PDF heruntergeladen');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      toast.error('Fehler beim Herunterladen');
    } finally {
      setGenerating(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      generated: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      generated: 'Erstellt',
      pending: 'Ausstehend',
      failed: 'Fehlgeschlagen',
      archived: 'Archiviert'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const styles = {
      customer: 'bg-blue-100 text-blue-800',
      commission: 'bg-purple-100 text-purple-800'
    };
    
    const labels = {
      customer: 'Kundenrechnung',
      commission: 'Provisionsabrechnung'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type] || ''}`}>
        {labels[type] || type}
      </span>
    );
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        invoice.invoice_number?.toLowerCase().includes(search) ||
        invoice.customer_name?.toLowerCase().includes(search) ||
        invoice.partner_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('de-DE');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rechnungen & Abrechnungen
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie Kundenrechnungen und Provisionsgutschriften
          </p>
        </div>
        <button
          onClick={async () => {
            try {
              const token = localStorage.getItem('token');
              const res = await fetch('/api/admin/invoices/generate-missing', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const data = await res.json();
              toast.success(`${data.generated || 0} Rechnungen erstellt`);
              fetchInvoices();
            } catch (err) {
              toast.error('Fehler beim Erstellen');
            }
          }}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition text-sm"
        >
          Fehlende Rechnungen erstellen
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Kundenrechnungen</p>
              <p className="text-lg font-semibold text-gray-900">
                Inkl. MwSt. nach Land
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            DE: 19% | DE+UID: 0% RC | AT: 20% | CH: 8.1%
          </p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Provisionsgutschriften</p>
              <p className="text-lg font-semibold text-gray-900">
                3 Typen verfuegbar
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            AT+UID: +20% | AT ohne UID: Par.6 | DE: RC
          </p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rechnungssteller</p>
              <p className="text-lg font-semibold text-gray-900">
                CLYR Solutions GmbH
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            service@clyr.shop | www.clyr.shop
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            {['all', 'customer', 'commission'].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === type 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'Alle' : type === 'customer' ? 'Kundenrechnungen' : 'Provisionsabrechnungen'}
              </button>
            ))}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Keine Rechnungen gefunden</h3>
            <p className="text-gray-600 mt-1">
              {searchTerm ? 'Versuchen Sie eine andere Suche' : 'Noch keine Rechnungen erstellt'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rechnungsnr.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Typ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empfänger
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Netto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    MwSt.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brutto
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">
                          {invoice.invoice_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(invoice.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-gray-900">
                          {invoice.customer_name || invoice.partner_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {invoice.vat_type === 'reverse_charge' ? 'Reverse Charge' : 
                           invoice.vat_type === 'exempt' ? 'Steuerbefreit' : 
                           `${invoice.vat_rate || 0}% MwSt.`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatDate(invoice.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {formatCurrency(invoice.net_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatCurrency(invoice.vat_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {formatCurrency(invoice.gross_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDownloadPDF(invoice)}
                        disabled={generating === invoice.id}
                        className="p-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200 transition disabled:opacity-50"
                        title="PDF herunterladen"
                      >
                        {generating === invoice.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Commission Statement Types Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Provisionsabrechnungs-Typen
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">
              Typ 1: Deutsche Partner
            </h4>
            <p className="text-sm text-blue-800">
              Netto-Provision + 19% MwSt. separat ausgewiesen.
              Partner benötigt USt-IdNr.
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-2">
              Typ 2: Österreich mit USt-IdNr.
            </h4>
            <p className="text-sm text-purple-800">
              Netto-Provision, Reverse Charge (0% MwSt.).
              Steuerschuldnerschaft geht auf Partner über.
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h4 className="font-medium text-orange-900 mb-2">
              Typ 3: Österreich Kleinunternehmer
            </h4>
            <p className="text-sm text-orange-800">
              Provision ohne separate MwSt.-Ausweisung.
              Steuerbefreit nach §6 Abs.1 Z 27 UStG.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInvoicesPage;
