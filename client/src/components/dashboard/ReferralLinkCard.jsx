import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, ExternalLink, QrCode } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { copyToClipboard } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ReferralLinkCard = ({ 
  title, 
  link, 
  description,
  productImage,
  clicks = 0,
  conversions = 0,
  index = 0 
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(link);
    if (success) {
      setCopied(true);
      toast.success(t('dashboard.referral.copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: link
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      {/* Product Image (if provided) */}
      {productImage && (
        <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          <img 
            src={productImage} 
            alt={title}
            className="w-full h-full object-contain p-4"
          />
        </div>
      )}

      <div className="p-5">
        {/* Title */}
        <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
        
        {description && (
          <p className="text-sm text-gray-500 mb-4">{description}</p>
        )}

        {/* Link Display */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl mb-4">
          <input
            type="text"
            value={link}
            readOnly
            className="flex-1 bg-transparent text-sm text-gray-600 truncate outline-none"
          />
          <a 
            href={link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-teal-500 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex-1 text-center p-2 bg-gray-50 rounded-lg">
            <p className="font-semibold text-gray-900">{clicks}</p>
            <p className="text-xs text-gray-500">Klicks</p>
          </div>
          <div className="flex-1 text-center p-2 bg-gray-50 rounded-lg">
            <p className="font-semibold text-gray-900">{conversions}</p>
            <p className="text-xs text-gray-500">Conversions</p>
          </div>
          <div className="flex-1 text-center p-2 bg-gray-50 rounded-lg">
            <p className="font-semibold text-gray-900">
              {clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-500">Rate</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              copied 
                ? 'bg-green-500 text-white' 
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                {t('dashboard.referral.copied')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {t('dashboard.referral.copy')}
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ReferralLinkCard;