// client/src/pages/admin/AdminNewsletterPage.jsx
// GROUP 9 #44: Newsletter admin - subscribers + campaigns
import { useState, useEffect } from 'react';
import { Mail, Users, Send, Plus, BarChart3, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function AdminNewsletterPage() {
  const [activeTab, setActiveTab] = useState('subscribers');
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [newCampaign, setNewCampaign] = useState({ name: '', subject: '', html_content: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [subsRes, statsRes, campRes] = await Promise.allSettled([
        api.get('/newsletter/admin/subscribers'),
        api.get('/newsletter/admin/stats'),
        api.get('/newsletter/admin/campaigns'),
      ]);
      if (subsRes.status === 'fulfilled') {
        const d = subsRes.value.data;
        setSubscribers(d.subscribers || d.data || []);
      }
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data;
        setStats(d.stats || d);
      }
      if (campRes.status === 'fulfilled') {
        const d = campRes.value.data;
        setCampaigns(d.campaigns || d.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.subject || !newCampaign.html_content) {
      return toast.error('Alle Felder ausfüllen');
    }
    try {
      await api.post('/newsletter/admin/campaigns', newCampaign);
      toast.success('Kampagne erstellt!');
      setNewCampaign({ name: '', subject: '', html_content: '' });
      loadAll();
    } catch (e) { toast.error('Fehler beim Erstellen'); }
  };

  const sendCampaign = async (id) => {
    if (!confirm('Kampagne jetzt an alle aktiven Abonnenten senden?')) return;
    setSending(true);
    try {
      await api.post(`/newsletter/admin/campaigns/${id}/send`);
      toast.success('Kampagne wird versendet!');
      loadAll();
    } catch (e) { toast.error('Versand fehlgeschlagen'); }
    finally { setSending(false); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '-';

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    unsubscribed: 'bg-red-100 text-red-700',
    bounced: 'bg-gray-100 text-gray-700',
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-green-100 text-green-700',
    sending: 'bg-blue-100 text-blue-700',
  };

  if (loading) return <div className="p-6">Laden...</div>;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
          <p className="text-gray-500 mt-1">Abonnenten verwalten und Kampagnen versenden</p>
        </div>
        <button onClick={loadAll} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Gesamt', value: stats.total || subscribers.length, icon: Users, color: 'blue' },
          { label: 'Aktiv', value: stats.active || subscribers.filter(s => s.status === 'active').length, icon: Mail, color: 'green' },
          { label: 'Abgemeldet', value: stats.unsubscribed || subscribers.filter(s => s.status === 'unsubscribed').length, icon: BarChart3, color: 'red' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-${s.color}-100 flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 text-${s.color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'subscribers', icon: Users, label: 'Abonnenten' },
          { id: 'campaigns', icon: Send, label: 'Kampagnen' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition ${
              activeTab === tab.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">E-Mail</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Quelle</th>
                <th className="px-4 py-3 font-medium">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscribers.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Noch keine Abonnenten</td></tr>
              ) : subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{sub.email}</td>
                  <td className="px-4 py-3 text-gray-600">{[sub.first_name, sub.last_name].filter(Boolean).join(' ') || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{sub.source || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt(sub.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Create Campaign */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Neue Kampagne</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (intern)</label>
                <input type="text" value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="z.B. Fruehjahrs-Aktion 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betreffzeile</label>
                <input type="text" value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="Entdecken Sie unsere neuen Filter!" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt (HTML)</label>
              <textarea value={newCampaign.html_content}
                onChange={(e) => setNewCampaign({ ...newCampaign, html_content: e.target.value })}
                rows={6} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                placeholder="<h1>Hallo!</h1><p>Ihr Newsletter-Inhalt...</p>" />
            </div>
            <button onClick={createCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm">
              <Plus className="w-4 h-4" />Kampagne erstellen
            </button>
          </div>

          {/* Campaign List */}
          {campaigns.map(camp => (
            <div key={camp.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{camp.name}</h4>
                  <p className="text-sm text-gray-500 mt-0.5">Betreff: {camp.subject}</p>
                  <p className="text-xs text-gray-400 mt-1">Erstellt: {fmt(camp.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[camp.status] || 'bg-gray-100 text-gray-600'}`}>
                    {camp.status === 'draft' ? 'Entwurf' : camp.status === 'sent' ? 'Gesendet' : camp.status}
                  </span>
                  {camp.status === 'draft' && (
                    <button onClick={() => sendCampaign(camp.id)} disabled={sending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50">
                      <Send className="w-3 h-3" />Senden
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              Noch keine Kampagnen erstellt.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
