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
        // Only use DB content if it's real content (not placeholder)
        if (data && data.content && data.content.length > 50 && !data.content.includes('Bitte im Admin-Panel bearbeiten')) {
          setPage(data);
        }
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

  const isHtml = content && (content.includes('<h') || content.includes('<p') || content.includes('<ul') || content.includes('<div'));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-400 mb-5">
              <Icon className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-secondary-700">{title}</h1>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-8 md:p-10 shadow-sm">
            {isHtml ? (
              <div className="legal-content" dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <div className="text-secondary-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">{content}</div>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Zuletzt aktualisiert: {page?.updated_at ? new Date(page.updated_at).toLocaleDateString('de-AT') : new Date().toLocaleDateString('de-AT')}
          </p>
        </motion.div>
      </div>
      <style>{`
        .legal-content { color: #374151; line-height: 1.8; font-size: 0.9375rem; }
        .legal-content h2 {
          font-size: 1.3rem; font-weight: 700;
          color: #3d4f5f;
          margin-top: 2rem; margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #5fb3b3;
        }
        .legal-content h3 {
          font-size: 1.1rem; font-weight: 600;
          color: #5fb3b3;
          margin-top: 1.5rem; margin-bottom: 0.5rem;
        }
        .legal-content p { margin-bottom: 1rem; }
        .legal-content ul, .legal-content ol { margin-bottom: 1rem; padding-left: 1.75rem; }
        .legal-content ul { list-style-type: disc; }
        .legal-content ol { list-style-type: decimal; }
        .legal-content li { margin-bottom: 0.5rem; line-height: 1.6; }
        .legal-content a { color: #5fb3b3; text-decoration: underline; word-break: break-all; }
        .legal-content a:hover { color: #4a9d9d; }
        .legal-content .contact-block {
          background: #f0fdfa; border: 1px solid #ccfbf1;
          border-left: 4px solid #5fb3b3;
          border-radius: 0.75rem; padding: 1.25rem 1.5rem; margin: 1.25rem 0;
        }
        .legal-content .contact-block p { margin-bottom: 0.25rem; }
        .legal-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
        .legal-content strong { font-weight: 700; color: #3d4f5f; }
        .legal-content em { color: #6b7280; }
        @media (max-width: 640px) {
          .legal-content { font-size: 0.875rem; line-height: 1.7; }
          .legal-content h2 { font-size: 1.15rem; margin-top: 1.5rem; }
          .legal-content h3 { font-size: 1rem; }
          .legal-content .contact-block { padding: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default LegalPageView;
