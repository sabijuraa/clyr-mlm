import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Link2, Share2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const ReferralLinkCard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/ref/${user?.referralCode || 'XXXXX'}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join CLYR',
          text: t('referral.shareText'),
          url: referralLink,
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-secondary-700 rounded-2xl p-6 text-white"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-secondary-600 flex items-center justify-center">
          <Link2 className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h3 className="font-semibold">{t('referral.title')}</h3>
          <p className="text-secondary-300 text-sm">{t('referral.subtitle')}</p>
        </div>
      </div>

      {/* Link Display */}
      <div className="bg-secondary-800 rounded-xl p-3 flex items-center gap-2 mb-4">
        <input
          type="text"
          value={referralLink}
          readOnly
          className="flex-1 bg-transparent text-sm text-secondary-200 outline-none truncate"
        />
        <button
          onClick={copyToClipboard}
          className="p-2 rounded-lg bg-secondary-600 hover:bg-primary-500 transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-primary-400" />
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={copyToClipboard}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl 
            bg-white text-secondary-700 font-medium hover:bg-primary-400 hover:text-white transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? t('referral.copied') : t('referral.copy')}
        </button>
        
        {navigator.share && (
          <button
            onClick={share}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl 
              bg-secondary-600 text-white font-medium hover:bg-primary-500 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {t('referral.share')}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ReferralLinkCard;
