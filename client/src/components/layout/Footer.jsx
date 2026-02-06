import { Link, useNavigate } from 'react-router-dom';
import { Droplets } from 'lucide-react';

export default function Footer() {
  const scrollLink = (to) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return to;
  };

  return (
    <footer className="bg-clyr-dark text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-6 h-6 text-clyr-teal" />
              <span className="text-lg font-bold">CLYR</span>
            </div>
            <p className="text-sm text-gray-400 mb-2">Mehr als Wasser</p>
            <p className="text-xs text-gray-500">CLYR Solutions GmbH<br />Pappelweg 4b<br />9524 St. Magdalen</p>
            <p className="text-xs text-gray-500 mt-2">service@clyr.shop</p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-300">Shop</h4>
            <div className="space-y-2">
              <Link to="/shop" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">Alle Produkte</Link>
              <Link to="/faq" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">FAQ</Link>
              <Link to="/cart" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">Warenkorb</Link>
            </div>
          </div>

          {/* Partner */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-300">Partner</h4>
            <div className="space-y-2">
              <Link to="/partner/register" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">Partner werden</Link>
              <Link to="/partner/dashboard" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">Partner Login</Link>
              <Link to="/documents" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">Dokumente</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-gray-300">Rechtliches</h4>
            <div className="space-y-2">
              <Link to="/impressum" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">Impressum</Link>
              <Link to="/datenschutz" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">Datenschutz</Link>
              <Link to="/agb" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">AGB</Link>
              <Link to="/widerruf" onClick={() => window.scrollTo(0,0)} className="block text-sm text-gray-400 hover:text-clyr-teal transition-colors">Widerruf</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center">
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} CLYR Solutions GmbH. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  );
}
