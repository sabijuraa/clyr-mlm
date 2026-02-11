import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Shield, Scale, RotateCcw } from 'lucide-react';
import api from '../../services/api';

const ICONS = { privacy: Shield, imprint: FileText, terms: Scale, withdrawal: RotateCcw };

const LegalPageView = ({ pageKey, fallbackTitle, fallbackContent }) => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/legal/page/${pageKey}`);
        const data = res.data?.page || res.data;
        if (data && data.content) setPage(data);
      } catch (e) {
        console.log('Legal page not in DB, using fallback');
      } finally { setLoading(false); }
    };
    load();
  }, [pageKey]);

  const Icon = ICONS[pageKey] || FileText;
  const title = page?.title || fallbackTitle;
  const content = page?.content || fallbackContent;

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary-700 mb-5">
              <Icon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-secondary-700">{title}</h1>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-secondary-700 leading-relaxed whitespace-pre-line">
            {content}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LegalPageView;
