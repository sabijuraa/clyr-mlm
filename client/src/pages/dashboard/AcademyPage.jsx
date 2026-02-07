// client/src/pages/dashboard/AcademyPage.jsx
// GROUP 9 #43: Documents for affiliates only - Academy/restricted docs
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Video, FileText, Award, CheckCircle, Clock, Play, Download, Filter, Search, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const AcademyPage = () => {
  const [content, setContent] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => { loadAcademy(); }, []);

  const loadAcademy = async () => {
    try {
      const [contentRes, progressRes] = await Promise.allSettled([
        fetch('/api/academy', { headers }),
        fetch('/api/academy/progress', { headers }),
      ]);
      if (contentRes.status === 'fulfilled' && contentRes.value.ok) {
        const d = await contentRes.value.json();
        setContent(d.content || d.data || d.items || []);
      }
      if (progressRes.status === 'fulfilled' && progressRes.value.ok) {
        const d = await progressRes.value.json();
        setProgress(d.progress || d.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markComplete = async (contentId) => {
    try {
      const res = await fetch(`/api/academy/complete/${contentId}`, {
        method: 'POST', headers
      });
      if (res.ok) {
        toast.success('Als abgeschlossen markiert!');
        loadAcademy();
      }
    } catch (e) { toast.error('Fehler'); }
  };

  const getProgress = (contentId) => {
    return progress.find(p => p.content_id === contentId);
  };

  const categories = ['all', ...new Set(content.map(c => c.category).filter(Boolean))];
  const catLabels = {
    all: 'Alle', onboarding: 'Einstieg', sales: 'Verkauf',
    products: 'Produkte', compliance: 'Recht', marketing: 'Marketing'
  };

  const typeIcons = {
    video: Video, document: FileText, article: BookOpen, quiz: Award
  };
  const typeLabels = {
    video: 'Video', document: 'Dokument', article: 'Artikel', quiz: 'Quiz'
  };

  const filtered = content.filter(item => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || (item.title || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const completedCount = content.filter(c => getProgress(c.id)?.status === 'completed').length;
  const totalRequired = content.filter(c => c.is_required).length;
  const completedRequired = content.filter(c => c.is_required && getProgress(c.id)?.status === 'completed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-secondary-700">Partner Academy</h1>
        <p className="text-secondary-500">Schulungen, Dokumente und Materialien fuer Ihren Erfolg</p>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-700">{content.length}</p>
              <p className="text-sm text-secondary-500">Inhalte gesamt</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-700">{completedCount}/{content.length}</p>
              <p className="text-sm text-secondary-500">Abgeschlossen</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-700">{completedRequired}/{totalRequired}</p>
              <p className="text-sm text-secondary-500">Pflichtinhalte</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Inhalte durchsuchen..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-secondary-500 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                activeCategory === cat
                  ? 'bg-secondary-700 text-white'
                  : 'bg-white text-secondary-600 border border-gray-200 hover:bg-gray-50'
              }`}>
              {catLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (<div key={i} className="h-48 bg-white rounded-2xl animate-pulse" />))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-secondary-500">
            {content.length === 0 ? 'Noch keine Inhalte verfuegbar.' : 'Keine Ergebnisse gefunden.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, idx) => {
            const prog = getProgress(item.id);
            const isCompleted = prog?.status === 'completed';
            const TypeIcon = typeIcons[item.type] || FileText;

            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition ${
                  isCompleted ? 'border-green-200' : 'border-gray-100'
                }`}>
                {/* Type Badge */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.type === 'video' ? 'bg-red-100' :
                        item.type === 'document' ? 'bg-blue-100' :
                        item.type === 'quiz' ? 'bg-purple-100' : 'bg-gray-100'
                      }`}>
                        <TypeIcon className={`w-4 h-4 ${
                          item.type === 'video' ? 'text-red-600' :
                          item.type === 'document' ? 'text-blue-600' :
                          item.type === 'quiz' ? 'text-purple-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className="text-xs text-gray-500">{typeLabels[item.type] || item.type}</span>
                    </div>
                    {item.is_required && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">Pflicht</span>
                    )}
                    {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>

                  <h3 className="font-semibold text-secondary-700 mb-1 line-clamp-2">{item.title}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{item.description}</p>
                  )}

                  {item.duration_minutes && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                      <Clock className="w-3 h-3" />{item.duration_minutes} Min.
                    </p>
                  )}

                  <div className="flex gap-2">
                    {item.content_url && (
                      <a href={item.content_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 rounded-lg text-xs font-medium transition">
                        {item.type === 'video' ? <Play className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                        {item.type === 'video' ? 'Abspielen' : 'Herunterladen'}
                      </a>
                    )}
                    {!isCompleted && (
                      <button onClick={() => markComplete(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition">
                        <CheckCircle className="w-3 h-3" />Abschliessen
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Restricted Notice */}
      <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex items-start gap-3">
        <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900">Exklusiver Partner-Bereich</h3>
          <p className="text-sm text-blue-700 mt-1">
            Diese Inhalte sind ausschliesslich fuer registrierte CLYR-Partner zugaenglich. 
            Die Materialien duerfen nicht an Dritte weitergegeben werden.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcademyPage;
