import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Layout, Edit3, Image, Type, Save, Plus, Trash2, 
  Eye, EyeOff, GripVertical, Upload, X, Check,
  Home, Star, MessageSquare, BarChart3, Megaphone
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const SECTIONS = [
  { id: 'hero', name: 'Hero Banner', icon: Home, description: 'Hauptbanner auf der Startseite' },
  { id: 'features', name: 'Features', icon: Star, description: 'Produkt-Highlights und Vorteile' },
  { id: 'stats', name: 'Statistiken', icon: BarChart3, description: 'Zahlen und Fakten' },
  { id: 'testimonials', name: 'Bewertungen', icon: MessageSquare, description: 'Kundenmeinungen' },
  { id: 'cta', name: 'Call-to-Action', icon: Megaphone, description: 'Handlungsaufforderung' },
];

const AdminCMSPage = () => {
  const { lang } = useLanguage();
  const [activeSection, setActiveSection] = useState('hero');
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cms', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setContent(data.content || {});
    } catch (error) {
      console.error('Failed to fetch CMS content:', error);
      toast.error('Fehler beim Laden der Inhalte');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (item) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/cms/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(item)
      });
      
      if (response.ok) {
        toast.success('Gespeichert!');
        fetchContent();
        setEditingItem(null);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newItem = {
        section: activeSection,
        key: `new_${Date.now()}`,
        title: 'Neuer Inhalt',
        title_en: 'New Content',
        content: '',
        content_en: '',
        sort_order: (content[activeSection]?.length || 0) + 1
      };
      
      const response = await fetch('/api/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newItem)
      });
      
      if (response.ok) {
        toast.success('Neuer Inhalt erstellt');
        fetchContent();
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Diesen Inhalt wirklich löschen?')) return;
    
    try {
      await fetch(`/api/cms/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Gelöscht');
      fetchContent();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleToggleActive = async (item) => {
    await handleSave({ ...item, is_active: !item.is_active });
  };

  const handleImageUpload = async (e, item) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch('/api/cms/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const data = await response.json();
      if (data.url) {
        await handleSave({ ...item, image_url: data.url });
        toast.success('Bild hochgeladen');
      }
    } catch (error) {
      toast.error('Fehler beim Hochladen');
    }
  };

  const sectionItems = content[activeSection] || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Content Management
          </h1>
          <p className="text-gray-600 mt-1">
            Bearbeiten Sie die Inhalte Ihrer Website
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition"
        >
          <Plus className="w-5 h-5" />
          Neuer Inhalt
        </button>
      </div>

      {/* Section Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const itemCount = content[section.id]?.length || 0;
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  isActive 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{section.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20' : 'bg-gray-300'
                }`}>
                  {itemCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Description */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          <strong>{SECTIONS.find(s => s.id === activeSection)?.name}:</strong>{' '}
          {SECTIONS.find(s => s.id === activeSection)?.description}
        </p>
      </div>

      {/* Content Items */}
      <div className="space-y-4">
        {sectionItems.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Layout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine Inhalte vorhanden
            </h3>
            <p className="text-gray-600 mb-4">
              Erstellen Sie den ersten Inhalt für diese Sektion.
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600"
            >
              <Plus className="w-5 h-5" />
              Inhalt erstellen
            </button>
          </div>
        ) : (
          sectionItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl border ${
                item.is_active ? 'border-gray-200' : 'border-orange-300 bg-orange-50'
              } overflow-hidden`}
            >
              {/* Item Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {item.title || 'Ohne Titel'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Key: {item.key}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`p-2 rounded-lg transition ${
                      item.is_active 
                        ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={item.is_active ? 'Aktiv' : 'Inaktiv'}
                  >
                    {item.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setEditingItem(editingItem?.id === item.id ? null : item)}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expanded Edit Form */}
              {editingItem?.id === item.id && (
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* German Content */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        🇩🇪 Deutsch
                      </h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Titel
                        </label>
                        <input
                          type="text"
                          value={editingItem.title || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Untertitel
                        </label>
                        <input
                          type="text"
                          value={editingItem.subtitle || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, subtitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Inhalt
                        </label>
                        <textarea
                          value={editingItem.content || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    {/* English Content */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        🇬🇧 English
                      </h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editingItem.title_en || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, title_en: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subtitle
                        </label>
                        <input
                          type="text"
                          value={editingItem.subtitle_en || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, subtitle_en: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Content
                        </label>
                        <textarea
                          value={editingItem.content_en || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, content_en: e.target.value })}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Image & Link */}
                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bild
                      </label>
                      <div className="flex items-center gap-4">
                        {editingItem.image_url && (
                          <img 
                            src={editingItem.image_url} 
                            alt="" 
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200">
                          <Upload className="w-5 h-5" />
                          Bild hochladen
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, editingItem)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link URL
                      </label>
                      <input
                        type="text"
                        value={editingItem.link_url || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, link_url: e.target.value })}
                        placeholder="/produkte"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Link Text */}
                  <div className="grid md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Button Text (DE)
                      </label>
                      <input
                        type="text"
                        value={editingItem.link_text || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, link_text: e.target.value })}
                        placeholder="Jetzt entdecken"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Button Text (EN)
                      </label>
                      <input
                        type="text"
                        value={editingItem.link_text_en || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, link_text_en: e.target.value })}
                        placeholder="Discover now"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Save/Cancel Buttons */}
                  <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setEditingItem(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => handleSave(editingItem)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      Speichern
                    </button>
                  </div>
                </div>
              )}

              {/* Preview when not editing */}
              {editingItem?.id !== item.id && (
                <div className="p-4">
                  <div className="flex gap-4">
                    {item.image_url && (
                      <img 
                        src={item.image_url} 
                        alt="" 
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      {item.subtitle && (
                        <p className="text-sm text-gray-600 mb-1">{item.subtitle}</p>
                      )}
                      {item.content && (
                        <p className="text-gray-700 line-clamp-2">{item.content}</p>
                      )}
                      {item.link_url && (
                        <p className="text-sm text-primary-600 mt-2">
                          Link: {item.link_url} → "{item.link_text || 'Mehr erfahren'}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCMSPage;
