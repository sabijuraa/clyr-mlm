import { useState, useEffect } from 'react';
import api from '../utils/api';
import { FileText, Download, Folder } from 'lucide-react';

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/documents').then(r => {
      const data = r.data;
      setDocs(Array.isArray(data) ? data : Array.isArray(data?.documents) ? data.documents : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const safeDocs = Array.isArray(docs) ? docs : [];
  const grouped = safeDocs.reduce((acc, d) => {
    const cat = d.category || 'Allgemein';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {});

  const handleDownload = async (id, title) => {
    try {
      const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url; a.download = title; document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error('Download failed'); }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Laden...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-clyr-dark mb-6">Dokumente & Downloads</h1>
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Keine Dokumente verfügbar.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Folder className="w-5 h-5 text-clyr-teal" />
              <h2 className="text-lg font-semibold text-clyr-dark">{category}</h2>
            </div>
            <div className="space-y-2">
              {(Array.isArray(items) ? items : []).map(d => (
                <div key={d.id} className="bg-white rounded-lg border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <FileText className="w-8 h-8 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-clyr-dark">{d.title}</p>
                    {d.description && <p className="text-sm text-gray-500 truncate">{d.description}</p>}
                  </div>
                  <button onClick={() => handleDownload(d.id, d.original_name || d.title)}
                    className="p-2 rounded-lg hover:bg-clyr-light text-clyr-teal flex-shrink-0">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
