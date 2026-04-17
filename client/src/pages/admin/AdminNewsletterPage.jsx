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
  const [newCampaign, setNewCampaign] = useState({ name: '', subject: '', html_content: '', text_content: '', image_url: '' });
  const [uploadingImg, setUploadingImg] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null); // {id, content}

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('file', file); // compatibility with endpoints expecting either field
      // Try newsletter-specific upload first, fall back to CMS upload
      let url = null;
      try {
        const res = await api.post('/newsletter/admin/upload-image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        url = res.data?.url || res.data?.imageUrl;
      } catch (firstErr) {
        console.error('Newsletter upload endpoint failed:', firstErr.response?.data || firstErr.message);
        const res2 = await api.post('/cms/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        url = res2.data?.url || res2.data?.imageUrl || res2.data?.path;
      }
      if (url) { setNewCampaign(p => ({ ...p, image_url: url })); toast.success('Bild hochgeladen!'); }
      else toast.error('Upload fehlgeschlagen - kein URL zurückgegeben');
    } catch(e) { 
      console.error('Image upload error:', e.response?.data || e.message);
      toast.error('Upload fehlgeschlagen: ' + (e.response?.data?.message || e.message)); 
    }
    finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };
  const [campaignMode, setCampaignMode] = useState('text');
  const [sending, setSending] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryImages, setLibraryImages] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);

  const loadImageLibrary = async () => {
    setLibraryLoading(true);
    try {
      const res = await api.get('/newsletter/admin/image-library');
      setLibraryImages(res.data?.images || []);
    } catch (e) {
      console.error('Image library load error:', e);
      toast.error('Bilderbibliothek konnte nicht geladen werden');
    } finally {
      setLibraryLoading(false);
    }
  };

  const openLibrary = () => {
    setLibraryOpen(true);
    loadImageLibrary();
  };

  const selectFromLibrary = (url) => {
    setNewCampaign(p => ({ ...p, image_url: url }));
    setLibraryOpen(false);
    toast.success('Bild ausgewählt');
  };

  const deleteFromLibrary = async (filename) => {
    if (!confirm('Bild wirklich löschen?')) return;
    try {
      await api.delete(`/newsletter/admin/image-library/${filename}`);
      toast.success('Bild gelöscht');
      loadImageLibrary();
    } catch (e) {
      toast.error('Löschen fehlgeschlagen');
    }
  };

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
        // Server returns plain array directly
        setCampaigns(Array.isArray(d) ? d : (d.campaigns || d.data || []));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.subject || (!newCampaign.html_content && !newCampaign.text_content && !newCampaign.image_url)) {
      return toast.error('Bitte Name, Betreff und Inhalt ausfüllen');
    }
    try {
      // Build HTML from text_content regardless of mode
      let finalHtml = '';
      if (newCampaign.image_url) {
        finalHtml += `<div style="text-align:center;margin-bottom:20px"><img src="${newCampaign.image_url}" style="max-width:600px;width:100%;border-radius:8px" alt=""/></div>`;
      }
      if (campaignMode === 'text' && newCampaign.text_content) {
        finalHtml += newCampaign.text_content
          .split('\n')
          .map(p => p.trim() ? `<p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 12px">${p}</p>` : '')
          .filter(Boolean)
          .join('');
      } else if (campaignMode === 'html' && newCampaign.html_content) {
        finalHtml += newCampaign.html_content;
      }
      // If still empty, try the other field
      if (!finalHtml.trim()) {
        finalHtml = newCampaign.html_content || newCampaign.text_content || '';
      }
      console.log('[NEWSLETTER CREATE] finalHtml length:', finalHtml.length, 'mode:', campaignMode);
      await api.post('/newsletter/admin/campaigns', {
        name: newCampaign.name,
        subject: newCampaign.subject,
        html_content: finalHtml,
        text_content: newCampaign.text_content,
        image_url: newCampaign.image_url,
        target_audience: newCampaign.target_audience || 'newsletter',
      });
      toast.success('Kampagne erstellt!');
      setNewCampaign({ name: '', subject: '', html_content: '', text_content: '', image_url: '' });
      loadAll();
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Fehler';
      console.error('[NEWSLETTER CREATE]', msg, e.response?.data);
      toast.error(`Fehler: ${msg}`);
    }
  };

  const deleteCampaign = async (id) => {
    if (!confirm('Kampagne löschen?')) return;
    try {
      await api.delete(`/newsletter/admin/campaigns/${id}`);
      toast.success('Kampagne gelöscht');
      loadAll();
    } catch (e) {
      toast.error('Fehler beim Löschen');
    }
  };



  const saveEditedCampaign = async () => {
    if (!editingCampaign) return;
    try {
      const html = editingCampaign.content.trim()
        ? editingCampaign.content
            .split('\n')
            .map(p => p.trim() ? `<p style="font-size:15px;line-height:1.6;color:#333">${p}</p>` : '<br/>')
            .join('')
        : '';
      if (!html) return toast.error('Bitte Inhalt eingeben');
      await api.put(`/newsletter/admin/campaigns/${editingCampaign.id}`, { html_content: html });
      toast.success('Kampagne aktualisiert!');
      setEditingCampaign(null);
      loadAll();
    } catch (e) { 
      const msg = e.response?.data?.error || e.response?.data?.message || e.message || 'Fehler beim Speichern';
      console.error('[NEWSLETTER EDIT]', msg);
      toast.error(`Speichern fehlgeschlagen: ${msg}`);
    }
  };

  const sendCampaign = async (id) => {
    if (!confirm('Kampagne jetzt an alle aktiven Abonnenten senden?')) return;
    setSending(true);
    try {
      await api.post(`/newsletter/admin/campaigns/${id}/send`);
      toast.success('Kampagne wird versendet!');
      loadAll();
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Versand fehlgeschlagen';
      console.error('[SEND ERROR]', msg, e.response?.data);
      toast.error(`Fehler: ${msg}`);
    } finally {
      setSending(false);
    }
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
          { label: 'Gesamt',     value: stats.total        || subscribers.length,                                        icon: Users,    color: 'blue'  },
          { label: 'Aktiv',      value: stats.active       || subscribers.filter(s => s.status === 'active').length,     icon: Mail,     color: 'green' },
          { label: 'Abgemeldet', value: stats.unsubscribed || subscribers.filter(s => s.status === 'unsubscribed').length, icon: BarChart3, color: 'red'   },
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
          { id: 'campaigns',   icon: Send,  label: 'Kampagnen'  },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3 font-medium">E-Mail</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Quelle</th>
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-4 py-3 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      Noch keine Abonnenten
                    </td>
                  </tr>
                ) : subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{sub.email}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {[sub.first_name, sub.last_name].filter(Boolean).join(' ') || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{sub.source || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(sub.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {sub.status === 'pending' && (
                          <button
                            onClick={async () => {
                              try {
                                await api.post(`/newsletter/admin/confirm/${sub.id}`);
                                toast.success('Bestätigt');
                                loadAll();
                              } catch (e) { toast.error('Fehler'); }
                            }}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">
                            Bestätigen
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (!confirm('Abonnent löschen?')) return;
                            try {
                              await api.delete(`/newsletter/admin/subscribers/${sub.id}`);
                              toast.success('Gelöscht');
                              loadAll();
                            } catch (e) { toast.error('Fehler'); }
                          }}
                          className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100">
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  placeholder="z.B. Frühjahrsaktion 2026" />
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Inhalt</label>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-3">
                <button onClick={() => setCampaignMode('text')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    campaignMode === 'text' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  Text / Bild
                </button>
                <button onClick={() => setCampaignMode('html')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    campaignMode === 'html' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  HTML
                </button>
              </div>

              {campaignMode === 'text' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Bild-URL (optional)</label>
                    <div className="flex gap-2">
                      <input type="url" value={newCampaign.image_url}
                        onChange={(e) => setNewCampaign({ ...newCampaign, image_url: e.target.value })}
                        placeholder="https://... oder Foto hochladen →"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                      <label className={`flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium text-white ${uploadingImg ? 'bg-gray-400' : 'bg-gray-800 hover:bg-gray-700'}`}>
                        {uploadingImg ? '⏳' : '📷'}
                        <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleImageUpload} disabled={uploadingImg} />
                      </label>
                      <button type="button" onClick={openLibrary}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium">
                        🖼️ Bibliothek
                      </button>
                    </div>
                    {newCampaign.image_url && (
                      <img src={newCampaign.image_url} alt="" className="mt-2 max-h-32 rounded-lg object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Nachrichtentext — kein HTML nötig
                    </label>
                    <textarea value={newCampaign.text_content}
                      onChange={(e) => setNewCampaign({ ...newCampaign, text_content: e.target.value })}
                      rows={6}
                      placeholder="Ihren Text hier eingeben. Jede Zeile wird zu einem eigenen Absatz."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y focus:ring-2 focus:ring-gray-400 focus:outline-none" />
                  </div>
                </div>
              ) : (
                <textarea value={newCampaign.html_content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, html_content: e.target.value })}
                  rows={8}
                  placeholder="<h1>Hallo!</h1><p>Ihr Newsletter-Inhalt...</p>"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono resize-y focus:ring-2 focus:ring-gray-400 focus:outline-none" />
              )}
            </div>

            <button onClick={createCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium">
              <Plus className="w-4 h-4" />
              Kampagne erstellen
            </button>
          </div>

          {/* Edit Campaign Dialog */}
          {editingCampaign && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-900 mb-3">✏️ Kampagne bearbeiten</h3>
              <textarea
                value={editingCampaign.content}
                onChange={(e) => setEditingCampaign({...editingCampaign, content: e.target.value})}
                rows={6}
                placeholder="Ihren Text hier eingeben..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y mb-3"
              />
              <div className="flex gap-2">
                <button onClick={saveEditedCampaign}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                  Speichern
                </button>
                <button onClick={() => setEditingCampaign(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Campaign List */}
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              Noch keine Kampagnen erstellt.
            </div>
          ) : campaigns.map(camp => (
            <div key={camp.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{camp.name}</h4>
                  <p className="text-sm text-gray-500 mt-0.5">Betreff: {camp.subject}</p>
                  <p className="text-xs text-gray-400 mt-1">Erstellt: {fmt(camp.created_at)}</p>
                  {camp.sent_count > 0 && (
                    <p className="text-xs text-gray-400">Versendet an: {camp.sent_count} Empfänger</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[camp.status] || 'bg-gray-100 text-gray-600'}`}>
                    {camp.status === 'draft' ? 'Entwurf' : camp.status === 'sent' ? 'Gesendet' : camp.status}
                  </span>
                  <button onClick={() => setEditingCampaign({id: camp.id, content: ''})}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">
                    ✏️ Bearbeiten
                  </button>
                  {camp.status === 'draft' && (
                    <button onClick={() => sendCampaign(camp.id)} disabled={sending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50">
                      <Send className="w-3 h-3" />
                      Senden
                    </button>
                  )}
                  <button onClick={() => deleteCampaign(camp.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Library Modal */}
      {libraryOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setLibraryOpen(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Bilderbibliothek</h2>
              <button onClick={() => setLibraryOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {libraryLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 text-gray-300 animate-spin" />
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p>Noch keine Bilder in der Bibliothek.</p>
                  <p className="text-xs mt-2">Laden Sie Bilder hoch, um sie hier zu sehen.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {libraryImages.map((img) => (
                    <div key={img.filename} className="group relative border border-gray-200 rounded-lg overflow-hidden hover:border-primary-400 cursor-pointer">
                      <img 
                        src={img.url} 
                        alt={img.filename}
                        className="w-full aspect-square object-cover"
                        onClick={() => selectFromLibrary(img.url)}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteFromLibrary(img.filename); }}
                          className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full text-xs">
                          🗑️
                        </button>
                      </div>
                      <div className="p-2 bg-white text-xs text-gray-500 truncate">
                        {new Date(img.uploadedAt).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setLibraryOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
