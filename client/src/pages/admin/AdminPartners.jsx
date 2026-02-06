import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { formatPrice, formatDate } from '../../utils/format';
import { UserCheck, Search, ChevronLeft, ChevronRight, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import toast from '../../utils/toast';

export default function AdminPartners() {
  const [partners, setPartners] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('partners');
  const [commPage, setCommPage] = useState(1);
  const [commTotalPages, setCommTotalPages] = useState(1);

  useEffect(() => {
    fetchPartners();
    fetchRanks();
  }, []);

  useEffect(() => {
    if (tab === 'commissions') fetchCommissions();
  }, [tab, commPage]);

  const fetchPartners = async () => {
    try {
      const { data } = await api.get('/admin/partners');
      setPartners(Array.isArray(data) ? data : data?.partners || []);
    } catch (err) {
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const fetchRanks = async () => {
    try {
      const { data } = await api.get('/partners/ranks/all');
      setRanks(Array.isArray(data) ? data : data?.ranks || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCommissions = async () => {
    try {
      const { data } = await api.get(`/admin/commissions?page=${commPage}&limit=20`);
      setCommissions(data.commissions || []);
      setCommTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    }
  };

  const updateRank = async (partnerId, rankId) => {
    try {
      await api.put(`/admin/partners/${partnerId}/rank`, { rank_id: rankId });
      toast.success('Rang aktualisiert');
      fetchPartners();
    } catch (err) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const togglePartner = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/toggle`);
      toast.success('Status geändert');
      fetchPartners();
    } catch (err) {
      toast.error('Fehler');
    }
  };

  const bulkApproveCommissions = async () => {
    try {
      const { data } = await api.post('/commissions/bulk-approve');
      toast.success(`${data.count} Provisionen genehmigt`);
      fetchCommissions();
    } catch (err) {
      toast.error('Fehler');
    }
  };

  const updateCommissionStatus = async (id, status) => {
    try {
      await api.put(`/commissions/${id}/status`, { status });
      toast.success('Status aktualisiert');
      fetchCommissions();
    } catch (err) {
      toast.error('Fehler');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-gray-400">Laden...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-clyr-dark mb-6">Partner & Provisionen</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {[
          { key: 'partners', label: 'Partner', icon: UserCheck },
          { key: 'commissions', label: 'Provisionen', icon: DollarSign },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-clyr-teal text-clyr-teal' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Partners Tab */}
      {tab === 'partners' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Partner</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Sponsor</th>
                  <th className="px-4 py-3 text-center">Rang</th>
                  <th className="px-4 py-3 text-right">Eigene Verk.</th>
                  <th className="px-4 py-3 text-right">Team Verk.</th>
                  <th className="px-4 py-3 text-right">Provisionen</th>
                  <th className="px-4 py-3 text-center">Team</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(Array.isArray(partners) ? partners : []).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-clyr-dark">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-gray-400">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{p.referral_code}</td>
                    <td className="px-4 py-3 text-gray-500">{p.sponsor_name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={p.rank_id}
                        onChange={e => updateRank(p.id, parseInt(e.target.value))}
                        className="text-xs font-medium rounded-full px-2 py-1 border bg-white cursor-pointer"
                      >
                        {(Array.isArray(ranks) ? ranks : []).map(r => <option key={r.id} value={r.id}>{r.name} ({r.commission_percent}%)</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">{p.personal_sales_count}</td>
                    <td className="px-4 py-3 text-right">{p.team_sales_count}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">{formatPrice(p.total_commission_earned)}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.direct_recruits || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePartner(p.user_id)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.is_active ? 'Aktiv' : 'Inaktiv'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commissions Tab */}
      {tab === 'commissions' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={bulkApproveCommissions} className="btn-primary text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Alle ausstehenden genehmigen
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Datum</th>
                    <th className="px-4 py-3 text-left">Partner</th>
                    <th className="px-4 py-3 text-left">Typ</th>
                    <th className="px-4 py-3 text-left">Beschreibung</th>
                    <th className="px-4 py-3 text-right">%</th>
                    <th className="px-4 py-3 text-right">Betrag</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(Array.isArray(commissions) ? commissions : []).map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                      <td className="px-4 py-3 font-medium">{c.partner_name}</td>
                      <td className="px-4 py-3">{c.type === 'direct_sale' ? 'Direkt' : c.type === 'difference' ? 'Differenz' : c.type}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.description}</td>
                      <td className="px-4 py-3 text-right">{c.percentage}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{formatPrice(c.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={c.status}
                          onChange={e => updateCommissionStatus(c.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${
                            c.status === 'paid' ? 'bg-green-100 text-green-700' :
                            c.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          <option value="pending">Ausstehend</option>
                          <option value="approved">Genehmigt</option>
                          <option value="paid">Ausgezahlt</option>
                          <option value="cancelled">Storniert</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {commTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <p className="text-sm text-gray-500">Seite {commPage} von {commTotalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setCommPage(p => Math.max(1, p - 1))} disabled={commPage === 1} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setCommPage(p => Math.min(commTotalPages, p + 1))} disabled={commPage === commTotalPages} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
