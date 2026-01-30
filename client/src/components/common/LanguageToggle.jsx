import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageToggle = ({ showLabel = true, className = '' }) => {
  const { lang, toggle } = useLanguage();

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors ${className}`}
    >
      <Globe className="w-5 h-5 text-secondary-500" />
      {showLabel && (
        <motion.span 
          key={lang}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium uppercase"
        >
          {lang}
        </motion.span>
      )}
    </button>
  );
};

export default LanguageToggle;