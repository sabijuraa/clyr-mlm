// client/src/pages/admin/LegalPagesPage.jsx
import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function LegalPagesPage() {
  const [activeTab, setActiveTab] = useState('privacy');
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    onUpdate: ({ editor }) => {
      setDocuments({
        ...documents,
        [activeTab]: {
          ...documents[activeTab],
          content: editor.getHTML()
        }
      });
    }
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (editor && documents[activeTab]) {
      editor.commands.setContent(documents[activeTab].content || '');
    }
  }, [activeTab, documents, editor]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/legal');
      const data = await res.json();
      const docsObj = {};
      data.forEach(doc => {
        docsObj[doc.document_type] = doc;
      });
      setDocuments(docsObj);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const doc = documents[activeTab];
      
      const res = await fetch(`/api/admin/legal/${activeTab}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: doc.title,
          content: doc.content
        })
      });

      if (res.ok) {
        setMessage('Dokument erfolgreich gespeichert!');
        fetchDocuments();
      } else {
        setMessage('Fehler beim Speichern');
      }
    } catch (error) {
      setMessage('Fehler beim Speichern');
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { key: 'privacy', label: 'Datenschutzerklärung' },
    { key: 'terms', label: 'AGB' },
    { key: 'imprint', label: 'Impressum' },
    { key: 'returns', label: 'Widerrufsbelehrung' }
  ];

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Rechtliche Dokumente</h1>

      {message && (
        <div className={`p-4 mb-6 rounded ${message.includes('Fehler') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex space-x-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 font-medium border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {documents[activeTab] && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Titel</label>
            <input
              type="text"
              value={documents[activeTab].title || ''}
              onChange={(e) => setDocuments({
                ...documents,
                [activeTab]: { ...documents[activeTab], title: e.target.value }
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {/* Editor Toolbar */}
          <div className="border rounded-t p-2 bg-gray-50 flex gap-2 flex-wrap">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('bold') ? 'bg-blue-200' : 'bg-white'} border`}
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('italic') ? 'bg-blue-200' : 'bg-white'} border`}
            >
              <em>I</em>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-3 py-1 rounded ${editor?.isActive('heading', { level: 1 }) ? 'bg-blue-200' : 'bg-white'} border`}
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-3 py-1 rounded ${editor?.isActive('heading', { level: 2 }) ? 'bg-blue-200' : 'bg-white'} border`}
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('bulletList') ? 'bg-blue-200' : 'bg-white'} border`}
            >
              • Liste
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-3 py-1 rounded ${editor?.isActive('orderedList') ? 'bg-blue-200' : 'bg-white'} border`}
            >
              1. Liste
            </button>
          </div>

          {/* Editor Content */}
          <div className="border border-t-0 rounded-b p-4 min-h-[400px] prose max-w-none">
            <EditorContent editor={editor} />
          </div>

          {/* Save Button */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Version: {documents[activeTab].version} | 
              Zuletzt aktualisiert: {new Date(documents[activeTab].last_updated).toLocaleDateString('de-DE')}
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}