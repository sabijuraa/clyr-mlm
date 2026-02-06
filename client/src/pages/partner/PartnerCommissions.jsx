import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatPrice, formatDateTime } from '../../utils/format';
import { DollarSign, FileText, Clock, CheckCircle, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PartnerCommissions() {
  const { partner } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState({ total_earned: 0, total_pending: 0, total_paid: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissions();
  }, [page, statusFilter]);

  const downloadStatement = async () => {
    try {
      const now = new Date();
      const response = await api.get(`/invoices/commission-statement?month=${now.getMonth()+1}&year=${now.getFullYear()}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a"); a.href = url; a.download = `Provisionsgutschrift-${now.getMonth()+1}-${now.getFullYear()}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { console.error("Statement download failed"); }
  };
  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);
      const { data } = await api.get(`/commissions/my?${params}`);
      setCommissions(data.commissions || []);
      setSummary(data.summary || { total_earned: 0, total_pending: 0, total_paid: 0 });
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load commissions', err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels = { pending: 'Ausstehend', approved: 'Genehmigt', paid: 'Ausgezahlt', cancelled: 'Storniert' };
    return (
      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const typeLabel = (type) => {
    const labels = { direct_sale: 'Direktverkauf', difference: 'Differenzprovision', bonus: 'Bonus', rank_bonus: 'Rang-Bonus' };
    return labels[type] || type;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-clyr-dark mb-6">Meine Provisionen</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Gesamt verdient</p>
            <p className="text-xl font-bold text-clyr-dark">{formatPrice(summary.total_earned)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ausstehend</p>
            <p className="text-xl font-bold text-clyr-dark">{formatPrice(summary.total_pending)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Ausgezahlt</p>
            <p className="text-xl font-bold text-clyr-dark">{formatPrice(summary.total_paid)}</p>
          </div>
        </div>
      </div>

      {/* Current Rank Info */}
      {partner && (
        <div className="bg-gradient-to-r from-clyr-dark to-gray-700 text-white rounded-xl p-5 mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Aktueller Rang</p>
            <p className="text-lg font-bold">{partner.rank_name || 'Starter'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Provisionssatz</p>
            <p className="text-lg font-bold">{partner.commission_percent || 8}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">Eigene Verkäufe</p>
            <p className="text-lg font-bold">{partner.personal_sales_count || 0}</p>
          </div>
        </div>
      )}

      {/* Filter + Download */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field w-auto text-sm"
          >
            <option value="">Alle</option>
            <option value="pending">Ausstehend</option>
            <option value="approved">Genehmigt</option>
            <option value="paid">Ausgezahlt</option>
            <option value="cancelled">Storniert</option>
          </select>
        </div>
        <button onClick={downloadStatement} className="btn-outline text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" /> Provisionsgutschrift PDF
        </button>
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Laden...</div>
        ) : commissions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Noch keine Provisionen vorhanden.</p>
            <p className="text-sm mt-1">Teile deinen Empfehlungscode um Provisionen zu verdienen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Typ</th>
                  <th className="px-4 py-3 text-left">Beschreibung</th>
                  <th className="px-4 py-3 text-right">Prozent</th>
                  <th className="px-4 py-3 text-right">Betrag</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(c.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{typeLabel(c.type)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.description}</td>
                    <td className="px-4 py-3 text-right">{c.percentage}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatPrice(c.amount)}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(c.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">Seite {page} von {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
