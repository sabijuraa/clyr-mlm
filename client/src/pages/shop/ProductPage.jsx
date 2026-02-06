import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/format';
import { ShoppingCart, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from '../utils/toast';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem, country } = useCart();

  useEffect(() => {
    api.get(`/products/slug/${slug}`).then(r => { setProduct(r.data); setSelectedImage(0); }).catch(() => {});
  }, [slug]);

  if (!product) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-clyr-teal border-t-transparent rounded-full" /></div>;

  const images = Array.isArray(product.images) ? product.images : [];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const features = (() => { try { const f = typeof product.features === 'string' ? JSON.parse(product.features) : product.features; return Array.isArray(f) ? f : []; } catch { return []; } })();
  const specs = (() => { try { const s = typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications; return s && typeof s === 'object' && !Array.isArray(s) ? s : {}; } catch { return {}; } })();
  const setIncludes = (() => { try { const s = typeof product.set_includes === 'string' ? JSON.parse(product.set_includes) : product.set_includes; return Array.isArray(s) ? s : []; } catch { return []; } })();
  const priceField = country === 'DE' ? 'price_de' : country === 'CH' ? 'price_ch' : 'price_at';
  const price = selectedVariant ? (selectedVariant[priceField] || selectedVariant.price_at) : (product[priceField] || product.price_at);

  const handleAddToCart = () => {
    addItem(product, selectedVariant, quantity);
    toast.success('Zum Warenkorb hinzugefügt');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-4 relative">
            {images[selectedImage] ? (
              <img src={images[selectedImage].url} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">Kein Bild</div>
            )}
            {images.length > 1 && (
              <>
                <button onClick={() => setSelectedImage(i => (i - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={() => setSelectedImage(i => (i + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white"><ChevronRight className="w-5 h-5" /></button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {(Array.isArray(images) ? images : []).map((img, i) => (
                <button key={img.id} onClick={() => setSelectedImage(i)} className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === selectedImage ? 'border-clyr-teal' : 'border-transparent'}`}>
                  <img src={img.url} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <p className="text-sm text-clyr-teal font-medium uppercase tracking-wide mb-2">{product.category_name}</p>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-gray-600 mb-6">{product.description_short}</p>
          <p className="text-3xl font-bold text-clyr-dark mb-6">{formatPrice(price)}</p>

          {variants.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Variante wählen:</p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(variants) ? variants : []).map(v => (
                  <button key={v.id} onClick={() => setSelectedVariant(v)} className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${selectedVariant?.id === v.id ? 'border-clyr-teal bg-clyr-light text-clyr-dark' : 'border-gray-200 hover:border-clyr-teal'}`}>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-2 hover:bg-gray-50">-</button>
              <span className="px-4 py-2 font-medium">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="px-4 py-2 hover:bg-gray-50">+</button>
            </div>
            <button onClick={handleAddToCart} disabled={!price} className="btn-primary flex items-center gap-2 flex-1 justify-center disabled:opacity-50">
              <ShoppingCart className="w-5 h-5" /> In den Warenkorb
            </button>
          </div>

          {product.description_long && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Beschreibung</h3>
              <p className="text-gray-600 leading-relaxed">{product.description_long}</p>
            </div>
          )}

          {features.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Vorteile</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Array.isArray(features) ? features : []).map((f, i) => (
                  <div key={i} className="flex items-start gap-2"><Check className="w-5 h-5 text-clyr-teal flex-shrink-0 mt-0.5" /><span className="text-sm text-gray-600">{f}</span></div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(specs).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Technische Daten</h3>
              <div className="border rounded-lg divide-y">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-3 text-sm"><span className="text-gray-500 capitalize">{k}</span><span className="font-medium">{v}</span></div>
                ))}
              </div>
            </div>
          )}

          {setIncludes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Im Set enthalten</h3>
              <ul className="space-y-1">
                {(Array.isArray(setIncludes) ? setIncludes : []).map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-clyr-teal" /> {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
