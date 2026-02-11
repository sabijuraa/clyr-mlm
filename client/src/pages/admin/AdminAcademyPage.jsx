// client/src/pages/admin/AdminAcademyPage.jsx
import { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit3, Trash2, Save, X, Eye, EyeOff, Video, FileText, Image, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CATEGORIES = [
  { value: 'getting-started', label: 'Erste Schritte' },
  { value: 'products', label: 'Produktwissen' },
  { value: 'sales', label: 'Verkauf & Marketing' },
  { value: 'installation', label: 'Installation' },
  { value: 'business', label: 'Geschäftsaufbau' },
  { value: 'compliance', label: 'Compliance & Recht' },
];

const CONTENT_TYPES = [
  { value: 'article', label: 'Artikel', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'document', label: 'Dokument', icon: FileText },
];

export default function AdminAcademyPage() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  const emptyForm = {
    title: '', description: '', content_body: '', category: 'getting-started',
    content_type: 'article', video_url: '', document_url: '', thumbnail_url: '',
    duration_minutes: 0, sort_order: 0, is_active: true, is_required: false
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadContent(); }, []);

  const loadContent = async () => {
    try {
      const response = await api.get('/academy/admin/all');
      const data = response.data;
      setContent(data.data || data.content || data.items || data || []);
    } catch (e) {
      console.error('Failed to load academy content:', e);
      toast.error('Fehler beim Laden der Academy-Inhalte');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.title) return toast.error('Titel ist erforderlich');
    setSaving(true);
    try {
      // Map form fields to server field names
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const payload = {
        title: form.title,
        slug: slug,
        description: form.description,
        type: form.content_type || 'article',
        category: form.category,
        contentUrl: form.video_url || form.document_url || '',
        contentText: form.content_body || '',
        durationMinutes: form.duration_minutes || 0,
        sortOrder: form.sort_order || 0,
        isRequired: form.is_required || false,
        is_active: form.is_active !== false
      };
      if (editing) {
        await api.put(`/academy/admin/content/${editing}`, payload);
        toast.success('Inhalt aktualisiert!');
      } else {
        await api.post('/academy/admin/content', payload);
        toast.success('Inhalt erstellt!');
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      loadContent();
    } catch (e) { toast.error('Fehler beim Speichern: ' + (e.response?.data?.message || e.message)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Diesen Inhalt wirklich löschen?')) return;
    try {
      await api.delete(`/academy/admin/content/${id}`);
      toast.success('Gelöscht');
      loadContent();
    } catch (e) { toast.error('Fehler beim Löschen'); }
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title || '',
      description: item.description || '',
      content_body: item.content_text || item.content_body || '',
      category: item.category || 'getting-started',
      content_type: item.type || item.content_type || 'article',
      video_url: item.content_url || item.video_url || '',
      document_url: item.document_url || '',
      thumbnail_url: item.thumbnail_url || '',
      duration_minutes: item.duration_minutes || 0,
      sort_order: item.sort_order || 0,
      is_active: item.is_active !== false,
      is_required: item.is_required || false,
    });
    setEditing(item.id);
    setShowForm(true);
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/academy/admin/content/${item.id}`, {
        title: item.title,
        slug: item.slug,
        description: item.description,
        type: item.type,
        category: item.category,
        contentUrl: item.content_url,
        contentText: item.content_text,
        is_active: !item.is_active
      });
      loadContent();
    } catch (e) { toast.error('Fehler'); }
  };

  const filtered = content.filter(c => !filterCategory || c.category === filterCategory);

  if (loading) return <div className="p-6">Laden...</div>;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academy Verwaltung</h1>
          <p className="text-gray-500 mt-1">Schulungsinhalte für Partner erstellen und verwalten</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Neuen Inhalt erstellen
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Gesamt', value: content.length, color: 'blue' },
          { label: 'Aktiv', value: content.filter(c => c.is_active).length, color: 'green' },
          { label: 'Artikel', value: content.filter(c => c.content_type === 'article').length, color: 'purple' },
          { label: 'Videos', value: content.filter(c => c.content_type === 'video').length, color: 'red' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${!filterCategory ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Alle
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat.value} onClick={() => setFilterCategory(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterCategory === cat.value ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              {editing ? 'Inhalt bearbeiten' : 'Neuen Inhalt erstellen'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input type="text" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="z.B. Einführung in CLYR Produkte" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                <select value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                <select value={form.content_type}
                  onChange={(e) => setForm({ ...form, content_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <input type="text" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="Kurze Beschreibung des Inhalts" />
          </div>

          {form.content_type === 'video' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
              <input type="url" value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="https://youtube.com/watch?v=..." />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt (HTML oder Text)</label>
            <textarea value={form.content_body}
              onChange={(e) => setForm({ ...form, content_body: e.target.value })}
              rows={8} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              placeholder="Der eigentliche Schulungsinhalt..." />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Min.)</label>
              <input type="number" value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sortierung</label>
              <input type="number" value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded" />
                Aktiv
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_required}
                  onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                  className="rounded" />
                Pflicht
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium">
              <Save className="w-4 h-4" />{saving ? 'Speichern...' : 'Speichern'}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Content List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Noch keine Academy-Inhalte. Erstellen Sie den ersten oben.</p>
          </div>
        ) : filtered.map(item => (
          <div key={item.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${!item.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                    {CONTENT_TYPES.find(t => t.value === item.content_type)?.label || item.content_type}
                  </span>
                  {item.is_required && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">Pflicht</span>}
                  {!item.is_active && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">Inaktiv</span>}
                </div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                {item.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                {item.duration_minutes > 0 && <p className="text-xs text-gray-400 mt-1">{item.duration_minutes} Min.</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(item)}
                  className="p-1.5 rounded-lg hover:bg-gray-100" title={item.is_active ? 'Deaktivieren' : 'Aktivieren'}>
                  {item.is_active ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-green-500" />}
                </button>
                <button onClick={() => handleEdit(item)}
                  className="p-1.5 rounded-lg hover:bg-gray-100" title="Bearbeiten">
                  <Edit3 className="w-4 h-4 text-blue-500" />
                </button>
                <button onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50" title="Löschen">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
