import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FileText, Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp, Eye, HelpCircle, Upload } from 'lucide-react';
import toast from '../../utils/toast';

const PAGES = ['home', 'about', 'impressum', 'datenschutz', 'agb', 'widerruf'];

export default function AdminCMS() {
  const [tab, setTab] = useState('sections');
  const [selectedPage, setSelectedPage] = useState('home');
  const [sections, setSections] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (tab === 'sections') fetchSections();
    else fetchFAQs();
  }, [tab, selectedPage]);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/cms/sections/${selectedPage}`);
      setSections(Array.isArray(data) ? data : data?.sections || []);
    } catch (err) {
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/cms/faq');
      setFaqs(Array.isArray(data) ? data : data?.faqs || []);
    } catch (err) {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Sections ---
  const openSectionEdit = (section) => {
    setEditItem({
      ...section,
      settings: typeof section.settings === 'object' ? JSON.stringify(section.settings, null, 2) : (section.settings || '{}')
    });
    setShowForm(true);
  };

  const openSectionCreate = () => {
    setEditItem({
      page_slug: selectedPage, section_key: '', title: '', subtitle: '', content: '',
      image_url: '', button_text: '', button_url: '', sort_order: (Array.isArray(sections) ? sections.length : 0) + 1,
      is_active: true, settings: '{}'
    });
    setShowForm(true);
  };

  const saveSection = async () => {
    try {
      const payload = {
        ...editItem,
        settings: editItem.settings ? JSON.parse(editItem.settings) : {}
      };
      if (editItem.id) {
        await api.put(`/cms/sections/${editItem.id}`, payload);
      } else {
        await api.post('/cms/sections', payload);
      }
      toast.success('Gespeichert');
      setShowForm(false);
      setEditItem(null);
      fetchSections();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler beim Speichern');
    }
  };

  const deleteSection = async (id) => {
    if (!confirm('Sektion löschen?')) return;
    try {
      await api.delete(`/cms/sections/${id}`);
      toast.success('Gelöscht');
      fetchSections();
    } catch (err) {
      toast.error('Fehler');
    }
  };

  // --- FAQs ---
  const openFaqEdit = (faq) => {
    setEditItem({ ...faq });
    setShowForm(true);
  };

  const openFaqCreate = () => {
    setEditItem({ question: '', answer: '', category: 'Allgemein', sort_order: (Array.isArray(faqs) ? faqs.length : 0) + 1, is_active: true });
    setShowForm(true);
  };

  const saveFaq = async () => {
    try {
      if (editItem.id) {
        await api.put(`/cms/faq/${editItem.id}`, editItem);
      } else {
        await api.post('/cms/faq', editItem);
      }
      toast.success('Gespeichert');
      setShowForm(false);
      setEditItem(null);
      fetchFAQs();
    } catch (err) {
      toast.error('Fehler');
    }
  };

  const deleteFaq = async (id) => {
    if (!confirm('FAQ löschen?')) return;
    try {
      await api.delete(`/cms/faq/${id}`);
      toast.success('Gelöscht');
      fetchFAQs();
    } catch (err) {
      toast.error('Fehler');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await api.post('/cms/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEditItem(prev => ({ ...prev, image_url: data.url }));
      toast.success('Bild hochgeladen');
    } catch (err) {
      toast.error('Upload fehlgeschlagen');
    }
  };

  const updateField = (field, value) => setEditItem(prev => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-clyr-dark mb-6">CMS — Inhalte verwalten</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {[
          { key: 'sections', label: 'Sektionen', icon: FileText },
          { key: 'faq', label: 'FAQ', icon: HelpCircle },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setShowForm(false); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-clyr-teal text-clyr-teal' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Sections Tab */}
      {tab === 'sections' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium text-gray-600">Seite:</label>
            <select value={selectedPage} onChange={e => setSelectedPage(e.target.value)} className="input-field w-auto text-sm">
              {PAGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={openSectionCreate} className="btn-primary text-sm flex items-center gap-1.5 ml-auto">
              <Plus className="w-4 h-4" /> Neue Sektion
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Laden...</div>
          ) : (Array.isArray(sections) ? sections : []).length === 0 ? (
            <div className="text-center py-12 text-gray-400">Keine Sektionen für diese Seite.</div>
          ) : (
            <div className="space-y-3">
              {[...(Array.isArray(sections) ? sections : [])].sort((a, b) => a.sort_order - b.sort_order).map(s => (
                <div key={s.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-400">
                    {s.sort_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-clyr-dark">{s.section_key}</h3>
                      {!s.is_active && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Inaktiv</span>}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{s.title || '(kein Titel)'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openSectionEdit(s)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteSection(s.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAQ Tab */}
      {tab === 'faq' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openFaqCreate} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Neue FAQ
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Laden...</div>
          ) : (Array.isArray(faqs) ? faqs : []).length === 0 ? (
            <div className="text-center py-12 text-gray-400">Keine FAQs vorhanden.</div>
          ) : (
            <div className="space-y-3">
              {(Array.isArray(faqs) ? faqs : []).map(f => (
                <div key={f.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-clyr-dark">{f.question}</p>
                    <p className="text-sm text-gray-500 truncate">{f.answer}</p>
                    <span className="text-xs text-gray-400">{f.category} · #{f.sort_order}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openFaqEdit(f)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteFaq(f.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showForm && editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 mb-10">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold">
                {tab === 'sections' ? (editItem.id ? 'Sektion bearbeiten' : 'Neue Sektion') : (editItem.id ? 'FAQ bearbeiten' : 'Neue FAQ')}
              </h2>
              <button onClick={() => { setShowForm(false); setEditItem(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {tab === 'sections' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sektion Key *</label>
                      <input className="input-field" value={editItem.section_key || ''} onChange={e => updateField('section_key', e.target.value)} placeholder="hero, features, etc." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reihenfolge</label>
                      <input className="input-field" type="number" value={editItem.sort_order || 1} onChange={e => updateField('sort_order', parseInt(e.target.value))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                    <input className="input-field" value={editItem.title || ''} onChange={e => updateField('title', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Untertitel</label>
                    <input className="input-field" value={editItem.subtitle || ''} onChange={e => updateField('subtitle', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt</label>
                    <textarea className="input-field" rows={6} value={editItem.content || ''} onChange={e => updateField('content', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bild URL</label>
                    <div className="flex gap-2">
                      <input className="input-field flex-1" value={editItem.image_url || ''} onChange={e => updateField('image_url', e.target.value)} />
                      <label className="btn-outline flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                        <Upload className="w-4 h-4" /> Hochladen
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
                      <input className="input-field" value={editItem.button_text || ''} onChange={e => updateField('button_text', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Button URL</label>
                      <input className="input-field" value={editItem.button_url || ''} onChange={e => updateField('button_url', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Einstellungen (JSON)</label>
                    <textarea className="input-field font-mono text-sm" rows={3} value={editItem.settings || '{}'} onChange={e => updateField('settings', e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editItem.is_active} onChange={e => updateField('is_active', e.target.checked)} className="rounded border-gray-300" />
                    <span className="text-sm">Aktiv</span>
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frage *</label>
                    <input className="input-field" value={editItem.question || ''} onChange={e => updateField('question', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Antwort *</label>
                    <textarea className="input-field" rows={5} value={editItem.answer || ''} onChange={e => updateField('answer', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                      <input className="input-field" value={editItem.category || ''} onChange={e => updateField('category', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reihenfolge</label>
                      <input className="input-field" type="number" value={editItem.sort_order || 1} onChange={e => updateField('sort_order', parseInt(e.target.value))} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editItem.is_active} onChange={e => updateField('is_active', e.target.checked)} className="rounded border-gray-300" />
                    <span className="text-sm">Aktiv</span>
                  </label>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={() => { setShowForm(false); setEditItem(null); }} className="btn-outline">Abbrechen</button>
                <button onClick={tab === 'sections' ? saveSection : saveFaq} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" /> Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
