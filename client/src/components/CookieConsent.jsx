import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Shield } from 'lucide-react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('clyr_cookie_consent');
    if (!consent) setTimeout(() => setVisible(true), 1000);
  }, []);

  const accept = () => {
    localStorage.setItem('clyr_cookie_consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('clyr_cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slideUp">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Shield className="w-8 h-8 text-clyr-teal flex-shrink-0 hidden sm:block" />
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            Wir verwenden Cookies, um Ihnen die beste Erfahrung auf unserer Website zu bieten.
            Weitere Informationen finden Sie in unserer{' '}
            <Link to="/datenschutz" className="text-clyr-teal underline">Datenschutzerklärung</Link>.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={decline} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border rounded-lg hover:bg-gray-50 transition-colors">
            Ablehnen
          </button>
          <button onClick={accept} className="px-4 py-2 text-sm bg-clyr-teal text-white rounded-lg hover:bg-clyr-hover transition-colors font-medium">
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
