import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatPrice } from '../../utils/format';
import { Droplets, Shield, Zap, Leaf, ArrowRight, Star } from 'lucide-react';

const features = [
  { icon: Shield, title: '9 Filterstufen', desc: 'Höchste Reinheit durch mehrstufige Filtration inkl. RO-Membran' },
  { icon: Zap, title: 'Kompakt & Elegant', desc: 'Die kompakteste Untertisch-Osmoseanlage am Markt' },
  { icon: Leaf, title: 'Nachhaltig', desc: 'Kein Plastik, minimaler Wasser- und Stromverbrauch' },
  { icon: Droplets, title: 'Sprudelwasser', desc: 'Gekühltes Still- und Sprudelwasser direkt aus dem Hahn' },
];

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [sections, setSections] = useState({});

  useEffect(() => {
    api.get('/products?featured=true').then(r => setProducts(r.data.products || r.data)).catch(() => {});
    api.get('/cms/pages/homepage').then(r => {
      const s = {};
      r.data.sections?.forEach(sec => s[sec.section_key] = sec);
      setSections(s);
    }).catch(() => {});
  }, []);

  const hero = sections.hero || {};

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-clyr-dark via-gray-800 to-clyr-dark overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-clyr-teal rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-clyr-teal rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24 md:py-32 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              {hero.title || 'Mehr als Wasser'}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
              {hero.subtitle || 'Erleben Sie reinstes, vitalisiertes Wasser direkt aus Ihrem Wasserhahn.'}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/shop" className="btn-primary text-lg flex items-center gap-2">
                {hero.button_text || 'Jetzt entdecken'} <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/partner/register" className="btn-outline border-white text-white hover:bg-white hover:text-clyr-dark text-lg">
                Partner werden
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-center mb-12">{sections.features?.title || 'Warum CLYR?'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div key={i} className="card text-center hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-clyr-light rounded-xl flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-7 h-7 text-clyr-teal" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Unsere Produkte</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map(p => (
                <Link key={p.id} to={`/shop/${p.slug}`} className="card hover:shadow-lg transition-all group">
                  <div className="aspect-square bg-gray-50 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                    {p.images?.[0] ? (
                      <img src={p.images[0].url} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                    ) : (
                      <Droplets className="w-16 h-16 text-gray-300" />
                    )}
                  </div>
                  <p className="text-xs text-clyr-teal font-medium uppercase tracking-wide mb-1">{p.category_name}</p>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-clyr-teal transition-colors">{p.name}</h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description_short}</p>
                  <p className="text-xl font-bold text-clyr-dark">{formatPrice(p.price_at)}</p>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/shop" className="btn-outline">Alle Produkte ansehen</Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Partner */}
      <section className="py-20 bg-clyr-teal">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{sections.partner?.title || 'Werde CLYR Partner'}</h2>
          <p className="text-lg text-white/80 mb-8">{sections.partner?.subtitle || 'Starte dein eigenes Business mit unserem attraktiven Partnerprogramm'}</p>
          <Link to="/partner/register" className="bg-white text-clyr-teal px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
            Jetzt starten <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Newsletter</h2>
          <p className="text-gray-500 mb-6">Bleiben Sie informiert über Neuigkeiten und Angebote</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            try { await api.post('/newsletter/subscribe', { email }); alert('Erfolgreich angemeldet!'); e.target.reset(); } catch { alert('Fehler bei der Anmeldung'); }
          }} className="flex gap-3">
            <input name="email" type="email" placeholder="Ihre E-Mail-Adresse" className="input-field flex-1" required />
            <button type="submit" className="btn-primary whitespace-nowrap">Anmelden</button>
          </form>
        </div>
      </section>
    </div>
  );
}
