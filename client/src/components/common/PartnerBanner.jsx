// client/src/components/common/PartnerBanner.jsx
// Shows "Ihr Berater ist: [Partner Name]" when customer arrives via referral link
import { useCart } from '../../context/CartContext';
import { User, X } from 'lucide-react';

const PartnerBanner = () => {
  const { referral, partnerName, clearReferral } = useCart();

  if (!referral || !partnerName) return null;

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-3">
        <User className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm font-medium">
          Ihr Berater ist: <span className="font-bold">{partnerName}</span>
        </p>
        <button
          onClick={clearReferral}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          title="Berater entfernen"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default PartnerBanner;
