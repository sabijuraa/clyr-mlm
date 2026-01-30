/**
 * Cookie Consent Banner
 * GDPR-compliant cookie consent with granular options
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, Check, X, Shield } from 'lucide-react';

const CookieConsentBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    preferences: false
  });
  
  useEffect(() => {
    // Check if consent already given
    const savedConsent = localStorage.getItem('cookieConsent');
    if (!savedConsent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);
  
  const generateVisitorId = () => {
    return 'visitor_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  };
  
  const saveConsent = async (consentData) => {
    const visitorId = localStorage.getItem('visitorId') || generateVisitorId();
    localStorage.setItem('visitorId', visitorId);
    localStorage.setItem('cookieConsent', JSON.stringify(consentData));
    
    // Send to server
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/gdpr/cookie-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          ...consentData
        })
      });
    } catch (error) {
      console.error('Failed to save cookie consent:', error);
    }
    
    setShowBanner(false);
    setShowSettings(false);
    
    // Trigger analytics if accepted
    if (consentData.analytics && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
    
    if (consentData.marketing && window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage: 'granted'
      });
    }
  };
  
  const acceptAll = () => {
    const allConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    setConsent(allConsent);
    saveConsent(allConsent);
  };
  
  const acceptSelected = () => {
    saveConsent(consent);
  };
  
  const rejectOptional = () => {
    const minimalConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    setConsent(minimalConsent);
    saveConsent(minimalConsent);
  };
  
  if (!showBanner) return null;
  
  return (
    <AnimatePresence>
      {/* Backdrop */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[9998]"
          onClick={() => setShowSettings(false)}
        />
      )}
      
      {/* Banner */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4"
      >
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Main Banner */}
          {!showSettings ? (
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary-50 rounded-xl">
                  <Cookie className="w-6 h-6 text-primary-500" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-secondary-700 text-lg mb-2">
                    Wir verwenden Cookies 🍪
                  </h3>
                  <p className="text-secondary-500 text-sm">
                    Diese Website verwendet Cookies, um Ihre Erfahrung zu verbessern. 
                    Notwendige Cookies sind für die Grundfunktionen erforderlich. 
                    Optionale Cookies helfen uns, die Website zu verbessern und 
                    relevante Inhalte anzuzeigen.
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-4">
                    <button
                      onClick={acceptAll}
                      className="px-5 py-2.5 bg-secondary-700 hover:bg-secondary-800 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Alle akzeptieren
                    </button>
                    
                    <button
                      onClick={rejectOptional}
                      className="px-5 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 font-medium rounded-xl transition-colors"
                    >
                      Nur notwendige
                    </button>
                    
                    <button
                      onClick={() => setShowSettings(true)}
                      className="px-5 py-2.5 text-secondary-600 hover:text-secondary-700 font-medium flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Einstellungen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Settings Panel */
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-secondary-700" />
                  <h3 className="font-bold text-secondary-700 text-lg">Cookie-Einstellungen</h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-secondary-500" />
                </button>
              </div>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {/* Necessary */}
                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl">
                  <div>
                    <p className="font-medium text-secondary-700">Notwendige Cookies</p>
                    <p className="text-sm text-secondary-500 mt-1">
                      Diese Cookies sind für die Grundfunktionen der Website erforderlich.
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Immer aktiv
                  </div>
                </div>
                
                {/* Analytics */}
                <label className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-secondary-200 transition-colors">
                  <div>
                    <p className="font-medium text-secondary-700">Analyse-Cookies</p>
                    <p className="text-sm text-secondary-500 mt-1">
                      Helfen uns zu verstehen, wie Besucher die Website nutzen.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={consent.analytics}
                      onChange={(e) => setConsent({ ...consent, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-checked:bg-primary-500 rounded-full transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                </label>
                
                {/* Marketing */}
                <label className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-secondary-200 transition-colors">
                  <div>
                    <p className="font-medium text-secondary-700">Marketing-Cookies</p>
                    <p className="text-sm text-secondary-500 mt-1">
                      Werden verwendet, um Ihnen relevante Werbung anzuzeigen.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={consent.marketing}
                      onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-checked:bg-primary-500 rounded-full transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                </label>
                
                {/* Preferences */}
                <label className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-secondary-200 transition-colors">
                  <div>
                    <p className="font-medium text-secondary-700">Präferenz-Cookies</p>
                    <p className="text-sm text-secondary-500 mt-1">
                      Speichern Ihre Einstellungen wie Sprache und Region.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={consent.preferences}
                      onChange={(e) => setConsent({ ...consent, preferences: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-checked:bg-primary-500 rounded-full transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                </label>
              </div>
              
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-100">
                <button
                  onClick={acceptSelected}
                  className="flex-1 px-5 py-2.5 bg-secondary-700 hover:bg-secondary-800 text-white font-medium rounded-xl transition-colors"
                >
                  Auswahl speichern
                </button>
                <button
                  onClick={acceptAll}
                  className="px-5 py-2.5 bg-secondary-100 hover:bg-secondary-200 text-secondary-700 font-medium rounded-xl transition-colors"
                >
                  Alle akzeptieren
                </button>
              </div>
              
              <p className="text-xs text-secondary-400 mt-4 text-center">
                Weitere Informationen finden Sie in unserer{' '}
                <a href="/datenschutz" className="text-primary-500 hover:underline">
                  Datenschutzerklärung
                </a>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CookieConsentBanner;
