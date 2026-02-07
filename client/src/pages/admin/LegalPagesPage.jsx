// client/src/pages/admin/LegalPagesPage.jsx
// GROUP 8 #41: Admin edits Privacy/Imprint/T&C + #38: FAQ management
import { useState, useEffect } from 'react';
import { FileText, Save, Plus, Trash2, ChevronDown, ChevronUp, HelpCircle, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LegalPagesPage() {
  const [activeTab, setActiveTab] = useState('legal');
  const [legalPages, setLegalPages] = useState([]);
  const [faqItems, setFaqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [editContent, setEditContent] = useState({ title: '', content: '' });
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'allgemein' });
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [legalRes, faqRes] = await Promise.allSettled([
        fetch('/api/legal/admin/all', { headers }),
        fetch('/api/faq/admin/all', { headers }),
      ]);
      if (legalRes.status === 'fulfilled' && legalRes.value.ok) {
        const d = await legalRes.value.json();
        setLegalPages(d.pages || []);
      }
      if (faqRes.status === 'fulfilled' && faqRes.value.ok) {
        const d = await faqRes.value.json();
        setFaqItems(d.items || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Legal pages handlers
  const startEditing = (page) => {
    setEditingPage(page.page_key);
    setEditContent({ title: page.title, content: page.content || '' });
  };

  const saveLegalPage = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/legal/admin/${editingPage}`, {
        method: 'PUT', headers, body: JSON.stringify(editContent)
      });
      if (res.ok) {
        toast.success('Seite gespeichert!');
        setEditingPage(null);
        loadAll();
      } else { toast.error('Fehler beim Speichern'); }
    } catch (e) { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  // FAQ handlers
  const addFaq = async () => {
    if (!newFaq.question || !newFaq.answer) return toast.error('Frage und Antwort erforderlich');
    try {
      const res = await fetch('/api/faq/admin', {
        method: 'POST', headers, body: JSON.stringify(newFaq)
      });
      if (res.ok) {
        toast.success('FAQ erstellt!');
        setNewFaq({ question: '', answer: '', category: 'allgemein' });
        loadAll();
      }
    } catch (e) { toast.error('Fehler'); }
  };

  const deleteFaq = async (id) => {
    if (!confirm('FAQ loeschen?')) return;
    try {
      await fetch(`/api/faq/admin/${id}`, { method: 'DELETE', headers });
      toast.success('Geloescht');
      loadAll();
    } catch (e) { toast.error('Fehler'); }
  };

  const toggleFaqActive = async (item) => {
    try {
      await fetch(`/api/faq/admin/${item.id}`, {
        method: 'PUT', headers, body: JSON.stringify({ is_active: !item.is_active })
      });
      loadAll();
    } catch (e) { toast.error('Fehler'); }
  };

  const pageLabels = {
    privacy: 'Datenschutzerklaerung', imprint: 'Impressum',
    terms: 'AGB', withdrawal: 'Widerrufsbelehrung', vp_vertrag: 'VP-Vertrag'
  };

  if (loading) return <div className="p-6">Laden...</div>;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Rechtliches & FAQ</h1>
      <p className="text-gray-500 mb-6">Bearbeiten Sie rechtliche Seiten und FAQ-Eintraege</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'legal', icon: FileText, label: 'Rechtliche Seiten' },
          { id: 'faq', icon: HelpCircle, label: 'FAQ Verwaltung' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition ${
              activeTab === tab.id ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Legal Pages Tab (#41) */}
      {activeTab === 'legal' && (
        <div className="space-y-4">
          {legalPages.map(page => (
            <div key={page.page_key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{pageLabels[page.page_key] || page.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">/{page.page_key} &middot; Zuletzt bearbeitet: {page.updated_at ? new Date(page.updated_at).toLocaleDateString('de-DE') : '-'}</p>
                </div>
                <button onClick={() => editingPage === page.page_key ? setEditingPage(null) : startEditing(page)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                  {editingPage === page.page_key ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {editingPage === page.page_key ? 'Schliessen' : 'Bearbeiten'}
                </button>
              </div>
              {editingPage === page.page_key && (
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                    <input type="text" value={editContent.title}
                      onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt (HTML oder Text)</label>
                    <textarea value={editContent.content}
                      onChange={(e) => setEditContent({ ...editContent, content: e.target.value })}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={saveLegalPage} disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm">
                      <Save className="w-4 h-4" />{saving ? 'Speichern...' : 'Speichern'}
                    </button>
                    <button onClick={() => setEditingPage(null)}
                      className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">Abbrechen</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {legalPages.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              Keine rechtlichen Seiten vorhanden. Bitte fuehren Sie die Migration aus.
            </div>
          )}
        </div>
      )}

      {/* FAQ Tab (#38) */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          {/* Add new FAQ */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Neuen FAQ-Eintrag erstellen</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frage</label>
                <input type="text" value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="z.B. Wie installiere ich das System?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                <select value={newFaq.category}
                  onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="allgemein">Allgemein</option>
                  <option value="produkte">Produkte</option>
                  <option value="versand">Versand</option>
                  <option value="bestellung">Bestellung</option>
                  <option value="partner">Partner</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Antwort</label>
              <textarea value={newFaq.answer}
                onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Die Antwort auf die Frage..." />
            </div>
            <button onClick={addFaq}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm">
              <Plus className="w-4 h-4" />Hinzufuegen
            </button>
          </div>

          {/* FAQ List */}
          <div className="space-y-2">
            {faqItems.map((item) => (
              <div key={item.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${!item.is_active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{item.category}</span>
                      {!item.is_active && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">Inaktiv</span>}
                    </div>
                    <p className="font-medium text-gray-900 mt-1">{item.question}</p>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.answer}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleFaqActive(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${item.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {item.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button onClick={() => deleteFaq(item.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {faqItems.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                Noch keine FAQ-Eintraege. Erstellen Sie den ersten oben.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
