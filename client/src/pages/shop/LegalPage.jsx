import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function LegalPage({ slug }) {
  const [page, setPage] = useState(null);
  useEffect(() => { api.get(`/cms/pages/${slug}`).then(r => setPage(r.data.page)).catch(() => {}); }, [slug]);
  if (!page) return <div className="max-w-4xl mx-auto px-4 py-12"><div className="animate-pulse h-8 bg-gray-200 rounded w-1/3 mb-4" /></div>;
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">{page.title}</h1>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} />
    </div>
  );
}
