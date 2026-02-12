// client/src/components/common/CookieConsent.jsx
// GROUP 8 #39: Cookie consent banner
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, Check } from 'lucide-react';

const CookieConsent = () => {
  const [show, setShow] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('clyr_cookie_consent');
    if (!saved) {
      // Delay show slightly for UX
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  const getVisitorId = () => {
    let id = localStorage.getItem('clyr_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 16);
      localStorage.setItem('clyr_visitor_id', id);
    }
    return id;
  };

  const saveConsent = (consentData) => {
    localStorage.setItem('clyr_cookie_consent', JSON.stringify(consentData));
    setShow(false);

    // Send to server
    fetch('/api/legal/cookie-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: getVisitorId(), ...consentData })
    }).catch(() => {});
  };

  const acceptAll = () => {
    const all = { necessary: true, analytics: true, marketing: true, preferences: true };
    saveConsent(all);
  };

  const acceptSelected = () => {
    saveConsent(consent);
  };

  const rejectAll = () => {
    const minimal = { necessary: true, analytics: false, marketing: false, preferences: false };
    saveConsent(minimal);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4"
      >
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-secondary-700 text-lg mb-1">Cookie-Einstellungen</h3>
                <p className="text-secondary-500 text-sm leading-relaxed">
                  Wir verwenden Cookies, um Ihnen die bestmoegliche Nutzererfahrung zu bieten. 
                  Sie koennen waehlen, welche Cookies Sie zulassen moechten.
                </p>
              </div>
            </div>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="mt-4 space-y-3">
                  {[
                    { key: 'necessary', label: 'Notwendig', desc: 'Fuer die Grundfunktionen der Website erforderlich.', disabled: true },
                    { key: 'analytics', label: 'Analyse', desc: 'Hilft uns zu verstehen, wie Besucher die Website nutzen.' },
                    { key: 'marketing', label: 'Marketing', desc: 'Wird verwendet, um personalisierte Werbung anzuzeigen.' },
                    { key: 'preferences', label: 'Praeferenzen', desc: 'Speichert Ihre Einstellungen und Vorlieben.' },
                  ].map(cat => (
                    <label key={cat.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                      <div>
                        <span className="font-medium text-secondary-700 text-sm">{cat.label}</span>
                        <p className="text-xs text-secondary-400">{cat.desc}</p>
                      </div>
                      <input type="checkbox" checked={consent[cat.key]} disabled={cat.disabled}
                        onChange={(e) => setConsent({ ...consent, [cat.key]: e.target.checked })}
                        className="w-5 h-5 rounded accent-primary-500" />
                    </label>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-5">
              <button onClick={rejectAll}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-secondary-600 hover:bg-gray-50 transition text-sm font-medium">
                Nur notwendige
              </button>
              <button onClick={() => setShowSettings(!showSettings)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-secondary-600 hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2 justify-center">
                <Settings className="w-4 h-4" />
                {showSettings ? 'Einstellungen ausblenden' : 'Einstellungen'}
              </button>
              {showSettings ? (
                <button onClick={acceptSelected}
                  className="px-5 py-2.5 rounded-xl bg-secondary-700 text-white hover:bg-secondary-800 transition text-sm font-medium flex items-center gap-2 justify-center sm:ml-auto">
                  <Check className="w-4 h-4" />Auswahl speichern
                </button>
              ) : (
                <button onClick={acceptAll}
                  className="px-5 py-2.5 rounded-xl bg-secondary-700 text-white hover:bg-secondary-800 transition text-sm font-medium sm:ml-auto">
                  Alle akzeptieren
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieConsent;
