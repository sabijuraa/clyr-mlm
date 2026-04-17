import { createContext, useContext, useState, useEffect } from 'react';
import translations from '../config/translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('fl_lang');
    if (saved) return saved;
    const browser = navigator.language.split('-')[0];
    return browser === 'en' ? 'en' : 'de';
  });

  useEffect(() => {
    localStorage.setItem('fl_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Translation function with nested key support
  const t = (key, vars = {}) => {
    const keys = key.split('.');
    let result = translations[lang];
    
    for (const k of keys) {
      result = result?.[k];
      if (!result) return key;
    }
    
    if (typeof result === 'string') {
      return result.replace(/{(\w+)}/g, (_, k) => vars[k] ?? `{${k}}`);
    }
    
    return result;
  };

  const toggle = () => setLang(l => l === 'de' ? 'en' : 'de');

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be within LanguageProvider');
  return ctx;
};