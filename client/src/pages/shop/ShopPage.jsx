import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { formatPrice } from '../../utils/format';
import { Droplets } from 'lucide-react';

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || '';

  useEffect(() => {
    api.get('/products/categories/all').then(r => setCategories(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    const url = activeCategory ? `/products?category=${activeCategory}` : '/products';
    api.get(url).then(r => setProducts(Array.isArray(r.data.products) ? r.data.products : Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Unsere Produkte</h1>
      <div className="flex flex-wrap gap-3 mb-8">
        <button onClick={() => setSearchParams({})} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!activeCategory ? 'bg-clyr-teal text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Alle</button>
        {(Array.isArray(categories) ? categories : []).map(c => (
          <button key={c.id} onClick={() => setSearchParams({ category: c.slug })} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === c.slug ? 'bg-clyr-teal text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c.name_de}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Array.isArray(products) ? products : []).map(p => (
          <Link key={p.id} to={`/shop/${p.slug}`} className="card hover:shadow-lg transition-all group">
            <div className="aspect-square bg-gray-50 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
              {p.images?.[0] ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                : <Droplets className="w-16 h-16 text-gray-300" />}
            </div>
            <p className="text-xs text-clyr-teal font-medium uppercase tracking-wide mb-1">{p.category_name}</p>
            <h3 className="text-lg font-semibold mb-2">{p.name}</h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description_short}</p>
            <p className="text-xl font-bold">{formatPrice(p.price_at)}</p>
          </Link>
        ))}
      </div>
      {(!Array.isArray(products) ? 0 : products.length) === 0 && <p className="text-center text-gray-500 py-12">Keine Produkte gefunden.</p>}
    </div>
  );
}
