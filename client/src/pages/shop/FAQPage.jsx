import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQPage() {
  const [faqs, setFaqs] = useState([]);
  const [open, setOpen] = useState(null);
  useEffect(() => { api.get('/cms/faq').then(r => setFaqs(r.data)).catch(() => {}); }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Häufig gestellte Fragen</h1>
      <div className="space-y-3">
        {faqs.map(faq => (
          <div key={faq.id} className="card">
            <button onClick={() => setOpen(open === faq.id ? null : faq.id)} className="w-full flex items-center justify-between text-left">
              <span className="font-medium pr-4">{faq.question}</span>
              {open === faq.id ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
            </button>
            {open === faq.id && <p className="text-gray-600 mt-3 pt-3 border-t">{faq.answer}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
