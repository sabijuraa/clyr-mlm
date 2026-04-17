// client/src/pages/admin/AdminAcademyPage.jsx
import { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Edit3, Trash2, Save, X, Eye, EyeOff, Video, FileText, Upload, File, CheckCircle } from 'lucide-react';
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
  { value: 'article', label: 'Artikel / Text', icon: FileText },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'document', label: 'Dokument / PDF', icon: File },
];

export default function AdminAcademyPage() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const fileInputRef = useRef(null);

  const emptyForm = {
    title: '', description: '', content_body: '', category: 'getting-started',
    content_type: 'article', content_url: '', duration_minutes: 0,
    sort_order: 0, is_active: true, is_required: false, uploaded_filename: ''
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadContent(); }, []);

  const loadContent = async () => {
    try {
      const response = await api.get('/academy/admin/all');
      const data = response.data;
      const items = data?.data || data?.content || data?.items || [];
      setContent(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error('Failed to load academy content:', e);
    } finally { setLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Datei zu groß (max. 100 MB)');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/academy/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      const url = res.data?.url;
      if (url) {
        setForm(prev => ({ ...prev, content_url: url, uploaded_filename: file.name }));
        toast.success(`"${file.name}" hochgeladen!`);
      }
    } catch (err) {
      toast.error('Upload fehlgeschlagen: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.title) return toast.error('Titel ist erforderlich');
    setSaving(true);
    try {
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const payload = {
        title: form.title, slug, description: form.description,
        type: form.content_type || 'article', category: form.category,
        contentUrl: form.content_url || '',
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
    } catch (e) {
      toast.error('Fehler: ' + (e.response?.data?.message || e.message));
    } finally { setSaving(false); }
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
      title: item.title || '', description: item.description || '',
      content_body: item.content_text || '',
      category: item.category || 'getting-started',
      content_type: item.type || 'article',
      content_url: item.content_url || '',
      duration_minutes: item.duration_minutes || 0,
      sort_order: item.sort_order || 0,
      is_active: item.is_active !== false,
      is_required: item.is_required || false,
      uploaded_filename: item.content_url ? item.content_url.split('/').pop() : ''
    });
    setEditing(item.id);
    setShowForm(true);
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/academy/admin/content/${item.id}`, {
        title: item.title, slug: item.slug, description: item.description,
        type: item.type, category: item.category,
        contentUrl: item.content_url, contentText: item.content_text,
        is_active: !item.is_active
      });
      loadContent();
    } catch (e) { toast.error('Fehler'); }
  };

  const filtered = content.filter(c => !filterCategory || c.category === filterCategory);
  const getTypeLabel = (type) => CONTENT_TYPES.find(t => t.value === type)?.label || type;
  const getCatLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat;

  if (loading) return <div className="p-6">Laden...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academy Verwaltung</h1>
          <p className="text-gray-500 mt-1">Schulungsinhalte fuer Partner</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium">
          <Plus className="w-4 h-4" /> Neuen Inhalt
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Gesamt', value: content.length },
          { label: 'Aktiv', value: content.filter(c => c.is_active).length },
          { label: 'Artikel', value: content.filter(c => c.type === 'article').length },
          { label: 'Videos/Docs', value: content.filter(c => c.type === 'video' || c.type === 'document').length },
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
                placeholder="z.B. Einfuehrung in CLYR Produkte" />
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
              placeholder="Kurze Beschreibung" />
          </div>

          {/* FILE UPLOAD — for video and document types */}
          {(form.content_type === 'video' || form.content_type === 'document') && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {form.content_type === 'video' ? 'Video hochladen oder URL' : 'Datei hochladen oder URL'}
              </label>
              <div className="mb-3">
                <input ref={fileInputRef} type="file" onChange={handleFileUpload}
                  accept={form.content_type === 'video' ? 'video/*' : '.pdf,.doc,.docx,.pptx,.xlsx,.zip'}
                  className="hidden" id="academy-file-upload" />
                <label htmlFor="academy-file-upload"
                  className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition text-sm font-medium ${
                    uploading ? 'border-blue-300 bg-blue-50 text-blue-600' :
                    form.content_url && form.uploaded_filename ? 'border-green-300 bg-green-50 text-green-700' :
                    'border-gray-300 hover:border-gray-400 text-gray-600 hover:bg-gray-100'
                  }`}>
                  {uploading ? (
                    <><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> Wird hochgeladen...</>
                  ) : form.content_url && form.uploaded_filename ? (
                    <><CheckCircle className="w-4 h-4" /> {form.uploaded_filename}</>
                  ) : (
                    <><Upload className="w-4 h-4" /> {form.content_type === 'video' ? 'Video auswaehlen (MP4, MOV, max. 100 MB)' : 'Datei auswaehlen (PDF, DOCX, max. 100 MB)'}</>
                  )}
                </label>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">ODER URL</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <input type="url" value={form.content_url}
                onChange={(e) => setForm({ ...form, content_url: e.target.value, uploaded_filename: '' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder={form.content_type === 'video' ? 'https://youtube.com/watch?v=...' : 'https://example.com/dokument.pdf'} />
              {form.content_url && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {form.content_url.length > 80 ? form.content_url.substring(0, 80) + '...' : form.content_url}
                </p>
              )}
            </div>
          )}

          {/* Text content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.content_type === 'article' ? 'Inhalt (Text) *' : 'Zusaetzlicher Text (optional)'}
            </label>
            <textarea value={form.content_body}
              onChange={(e) => setForm({ ...form, content_body: e.target.value })}
              rows={form.content_type === 'article' ? 10 : 4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder={form.content_type === 'article' ? 'Der Schulungsinhalt...' : 'Optionale Notizen...'} />
          </div>

          {/* Duration, Sort, Flags */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                Aktiv
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_required}
                  onChange={(e) => setForm({ ...form, is_required: e.target.checked })} className="rounded" />
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
            <p>Noch keine Academy-Inhalte.</p>
          </div>
        ) : filtered.map(item => (
          <div key={item.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${!item.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{getCatLabel(item.category)}</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{getTypeLabel(item.type)}</span>
                  {item.is_required && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">Pflicht</span>}
                  {!item.is_active && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">Inaktiv</span>}
                </div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                {item.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                {item.content_url && (
                  <a href={item.content_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 inline-block truncate max-w-xs">
                    {item.content_url}
                  </a>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(item)}
                  className="p-1.5 rounded-lg hover:bg-gray-100" title={item.is_active ? 'Deaktivieren' : 'Aktivieren'}>
                  {item.is_active ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-green-500" />}
                </button>
                <button onClick={() => handleEdit(item)}
                  className="p-1.5 rounded-lg hover:bg-gray-100"><Edit3 className="w-4 h-4 text-blue-500" /></button>
                <button onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
