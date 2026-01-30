/**
 * Admin Credit Notes Page
 * Manage credit notes (Gutschriften) for refunds
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Download, Plus, Search, RefreshCw,
  Calendar, Euro, CheckCircle, XCircle, Building2
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminCreditNotesPage = () => {
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });
  const [createForm, setCreateForm] = useState({
    orderId: '',
    reason: ''
  });
  
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    fetchCreditNotes();
  }, [filters]);
  
  const fetchCreditNotes = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/credit-notes?${params}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const data = await response.json();
      if (response.ok) setCreditNotes(data.creditNotes || []);
    } catch (error) {
      console.error('Failed to fetch credit notes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const createCreditNote = async () => {
    if (!createForm.orderId || !createForm.reason) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/credit-notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }
      
      toast.success('Gutschrift erstellt');
      setShowCreateModal(false);
      setCreateForm({ orderId: '', reason: '' });
      fetchCreditNotes();
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const downloadPDF = async (id, creditNoteNumber) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/credit-notes/${id}/pdf`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Download fehlgeschlagen');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Gutschrift-${creditNoteNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF heruntergeladen');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  const formatCurrency = (amount) => new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR'
  }).format(amount || 0);
  
  const formatDate = (date) => new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  
  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: 'Entwurf', color: 'bg-gray-100 text-gray-700' },
      issued: { label: 'Ausgestellt', color: 'bg-green-100 text-green-700' },
      applied: { label: 'Angerechnet', color: 'bg-blue-100 text-blue-700' },
      cancelled: { label: 'Storniert', color: 'bg-red-100 text-red-700' }
    };
    const { label, color } = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-secondary-700">Gutschriften</h1>
          <p className="text-secondary-500 mt-1">Verwalten Sie Gutschriften für Erstattungen</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Neue Gutschrift
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border border-gray-200 rounded-lg"
        >
          <option value="">Alle Status</option>
          <option value="draft">Entwurf</option>
          <option value="issued">Ausgestellt</option>
          <option value="applied">Angerechnet</option>
          <option value="cancelled">Storniert</option>
        </select>
        
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          className="px-4 py-2 border border-gray-200 rounded-lg"
          placeholder="Von"
        />
        
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          className="px-4 py-2 border border-gray-200 rounded-lg"
          placeholder="Bis"
        />
      </div>
      
      {/* Credit Notes List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-secondary-300 animate-spin mx-auto" />
        </div>
      ) : creditNotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText className="w-12 h-12 text-secondary-200 mx-auto mb-3" />
          <p className="text-secondary-500">Keine Gutschriften gefunden</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Nr.
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Kunde
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Bestellung
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Betrag
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {creditNotes.map(cn => (
                <tr key={cn.id} className="hover:bg-secondary-50/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-secondary-700">{cn.credit_note_number}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-secondary-700">{cn.customer_name}</p>
                    <p className="text-sm text-secondary-500">{cn.customer_country}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-secondary-600">{cn.order_number || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-secondary-700">{formatCurrency(cn.total)}</p>
                    <p className="text-xs text-secondary-500">
                      inkl. {formatCurrency(cn.vat_amount)} MwSt.
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-secondary-600">{formatDate(cn.issued_at)}</p>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(cn.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => downloadPDF(cn.id, cn.credit_note_number)}
                      className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-600 hover:text-secondary-700"
                      title="PDF herunterladen"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6"
          >
            <h2 className="text-xl font-bold text-secondary-700 mb-4">Neue Gutschrift erstellen</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1">
                  Bestellungs-ID *
                </label>
                <input
                  type="number"
                  value={createForm.orderId}
                  onChange={(e) => setCreateForm({ ...createForm, orderId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary-500"
                  placeholder="z.B. 123"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1">
                  Grund der Gutschrift *
                </label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-primary-500"
                  rows={3}
                  placeholder="z.B. Rücksendung, Beschädigung, etc."
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={createCreditNote}
                className="flex-1 px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg"
              >
                Gutschrift erstellen
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2.5 text-secondary-600 hover:text-secondary-700"
              >
                Abbrechen
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminCreditNotesPage;
