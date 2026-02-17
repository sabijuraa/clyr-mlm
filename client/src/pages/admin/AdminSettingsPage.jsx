import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Image, 
  Building, 
  Save, 
  Upload, 
  RefreshCw,
  Check,
  Eye,
  Truck,
  Award,
  Percent
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { useBrand } from '../../context/BrandContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const AdminSettingsPage = () => {
  const { lang } = useLanguage();
  const { refreshBranding, ...currentBranding } = useBrand();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [ranks, setRanks] = useState([]);
  const [myRankId, setMyRankId] = useState(user?.rank_id || 6);
  
  const [branding, setBranding] = useState({
    companyName: '',
    tagline: '',
    taglineEn: '',
    email: '',
    phone: '',
    website: '',
    primaryColor: '#0d9488',
    primaryHover: '#0f766e',
    primaryLight: '#ccfbf1',
    secondaryColor: '#f97316',
    secondaryHover: '#ea580c',
    logo: '',
  });
  
  const [legal, setLegal] = useState({
    companyName: '',
    street: '',
    city: '',
    zip: '',
    country: '',
    vatId: '',
    registrationNumber: '',
    court: '',
    managingDirector: '',
  });
  
  const [social, setSocial] = useState({
    facebook: '',
    instagram: '',
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  
  const [shipping, setShipping] = useState({
    AT: { large: 55, small: 9.90 },
    DE: { large: 70, small: 14.90 },
    CH: { large: 180, small: 35 }
  });

  // Load current settings
  useEffect(() => {
    if (currentBranding) {
      setBranding({
        companyName: currentBranding.company?.name || '',
        tagline: currentBranding.company?.tagline || '',
        taglineEn: currentBranding.company?.taglineEn || '',
        email: currentBranding.company?.email || '',
        phone: currentBranding.company?.phone || '',
        website: currentBranding.company?.website || '',
        primaryColor: currentBranding.colors?.primary || '#0d9488',
        primaryHover: currentBranding.colors?.primaryHover || '#0f766e',
        primaryLight: currentBranding.colors?.primaryLight || '#ccfbf1',
        secondaryColor: currentBranding.colors?.secondary || '#f97316',
        secondaryHover: currentBranding.colors?.secondaryHover || '#ea580c',
        logo: currentBranding.logo || '',
      });
      setLegal(currentBranding.legal || {});
      setSocial(currentBranding.social || {});
      setLogoPreview(currentBranding.logo || '');
    }
  }, [currentBranding]);

  // Load ranks
  useEffect(() => {
    const loadRanks = async () => {
      try {
        const res = await adminAPI.getRanks();
        setRanks(res.data);
      } catch (err) {
        console.error('Failed to load ranks:', err);
      }
    };
    loadRanks();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Upload logo first if changed
      let logoUrl = branding.logo;
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const uploadRes = await adminAPI.uploadLogo(formData);
        logoUrl = uploadRes.data.url;
      }

      // Save branding settings
      const brandingData = {
        company: {
          name: branding.companyName,
          tagline: branding.tagline,
          taglineEn: branding.taglineEn,
          email: branding.email,
          phone: branding.phone,
          website: branding.website,
        },
        colors: {
          primary: branding.primaryColor,
          primaryHover: branding.primaryHover,
          primaryLight: branding.primaryLight,
          secondary: branding.secondaryColor,
          secondaryHover: branding.secondaryHover,
        },
        logo: logoUrl,
        legal,
        social,
      };

      await adminAPI.updateBranding(brandingData);
      await refreshBranding();
      
      toast.success(lang === 'de' ? 'Einstellungen gespeichert!' : 'Settings saved!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(lang === 'de' ? 'Fehler beim Speichern' : 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'branding', label: lang === 'de' ? 'Marke & Farben' : 'Brand & Colors', icon: Palette },
    { id: 'company', label: lang === 'de' ? 'Unternehmen' : 'Company', icon: Building },
    { id: 'shipping', label: lang === 'de' ? 'Versand' : 'Shipping', icon: Truck },
    { id: 'commissions', label: lang === 'de' ? 'Provisionen & Ränge' : 'Commissions & Ranks', icon: Percent },
    { id: 'logo', label: lang === 'de' ? 'Logo' : 'Logo', icon: Image },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-700">
            {lang === 'de' ? 'Einstellungen' : 'Settings'}
          </h1>
          <p className="text-secondary-500">
            {lang === 'de' ? 'Marke, Farben und Unternehmenseinstellungen verwalten' : 'Manage brand, colors, and company settings'}
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          isLoading={isSaving}
          icon={Save}
        >
          {lang === 'de' ? 'Speichern' : 'Save Changes'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap text-sm sm:text-base min-w-fit
                ${activeTab === tab.id 
                  ? 'text-primary-400 bg-slate-50 border-b-2 border-secondary-600' 
                  : 'text-secondary-500 hover:text-secondary-700 hover:bg-gray-50'
                }`}
            >
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    {lang === 'de' ? 'Firmenname' : 'Company Name'}
                  </label>
                  <input
                    type="text"
                    value={branding.companyName}
                    onChange={(e) => setBranding(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                    placeholder="CLYR"
                  />
                </div>

                {/* Tagline DE */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Tagline (DE)
                  </label>
                  <input
                    type="text"
                    value={branding.tagline}
                    onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                    placeholder="Frisches Wasser für Ihr Zuhause"
                  />
                </div>
              </div>

              {/* Colors */}
              <div>
                <h3 className="font-semibold text-secondary-700 mb-4">
                  {lang === 'de' ? 'Markenfarben' : 'Brand Colors'}
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      {lang === 'de' ? 'Primärfarbe' : 'Primary Color'}
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-14 h-14 rounded-xl border-2 border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100 font-mono"
                      />
                    </div>
                  </div>

                  {/* Primary Hover */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Primary Hover
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={branding.primaryHover}
                        onChange={(e) => setBranding(prev => ({ ...prev, primaryHover: e.target.value }))}
                        className="w-14 h-14 rounded-xl border-2 border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={branding.primaryHover}
                        onChange={(e) => setBranding(prev => ({ ...prev, primaryHover: e.target.value }))}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100 font-mono"
                      />
                    </div>
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      {lang === 'de' ? 'Sekundärfarbe' : 'Secondary Color'}
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-14 h-14 rounded-xl border-2 border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Preview */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h4 className="font-medium text-secondary-700 mb-4">
                  {lang === 'de' ? 'Vorschau' : 'Preview'}
                </h4>
                <div className="flex gap-4 flex-wrap">
                  <button 
                    style={{ backgroundColor: branding.primaryColor }}
                    className="px-6 py-3 text-white font-medium rounded-xl shadow-lg"
                  >
                    {lang === 'de' ? 'Primär Button' : 'Primary Button'}
                  </button>
                  <button 
                    style={{ backgroundColor: branding.secondaryColor }}
                    className="px-6 py-3 text-white font-medium rounded-xl shadow-lg"
                  >
                    {lang === 'de' ? 'Sekundär Button' : 'Secondary Button'}
                  </button>
                  <span 
                    style={{ color: branding.primaryColor }}
                    className="px-6 py-3 font-medium"
                  >
                    {lang === 'de' ? 'Link Text' : 'Link Text'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Company Tab */}
          {activeTab === 'company' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    {lang === 'de' ? 'Rechtlicher Firmenname' : 'Legal Company Name'}
                  </label>
                  <input
                    type="text"
                    value={legal.companyName}
                    onChange={(e) => setLegal(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                    placeholder="CLYR Solutions GmbH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    {lang === 'de' ? 'Geschäftsführer' : 'Managing Director'}
                  </label>
                  <input
                    type="text"
                    value={legal.managingDirector}
                    onChange={(e) => setLegal(prev => ({ ...prev, managingDirector: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    {lang === 'de' ? 'Straße' : 'Street'}
                  </label>
                  <input
                    type="text"
                    value={legal.street}
                    onChange={(e) => setLegal(prev => ({ ...prev, street: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">PLZ</label>
                    <input
                      type="text"
                      value={legal.zip}
                      onChange={(e) => setLegal(prev => ({ ...prev, zip: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">{lang === 'de' ? 'Stadt' : 'City'}</label>
                    <input
                      type="text"
                      value={legal.city}
                      onChange={(e) => setLegal(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">USt-IdNr.</label>
                  <input
                    type="text"
                    value={legal.vatId}
                    onChange={(e) => setLegal(prev => ({ ...prev, vatId: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                    placeholder="ATU12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">{lang === 'de' ? 'Firmenbuchnummer' : 'Registration Number'}</label>
                  <input
                    type="text"
                    value={legal.registrationNumber}
                    onChange={(e) => setLegal(prev => ({ ...prev, registrationNumber: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                    placeholder="FN 123456a"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-secondary-700 mb-4">{lang === 'de' ? 'Kontakt' : 'Contact'}</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">E-Mail</label>
                    <input
                      type="email"
                      value={branding.email}
                      onChange={(e) => setBranding(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">{lang === 'de' ? 'Telefon' : 'Phone'}</label>
                    <input
                      type="tel"
                      value={branding.phone}
                      onChange={(e) => setBranding(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                    />
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-secondary-700 mb-4">Social Media</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Facebook</label>
                    <input
                      type="url"
                      value={social.facebook}
                      onChange={(e) => setSocial(prev => ({ ...prev, facebook: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Instagram</label>
                    <input
                      type="url"
                      value={social.instagram}
                      onChange={(e) => setSocial(prev => ({ ...prev, instagram: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-500 focus:ring-4 focus:ring-secondary-100"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Shipping Tab */}
          {activeTab === 'shipping' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-secondary-700 mb-4">Versandkosten (netto)</h3>
              <p className="text-sm text-secondary-500 mb-6">Grosse Produkte (Soda-Anlagen) und kleine Produkte (Aroma Dusche, Zubehoer) haben unterschiedliche Versandkosten.</p>
              <div className="space-y-6">
                {[
                  { code: 'AT', name: 'Oesterreich' },
                  { code: 'DE', name: 'Deutschland' },
                  { code: 'CH', name: 'Schweiz' }
                ].map(c => (
                  <div key={c.code} className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-secondary-700 mb-3">{c.name} ({c.code})</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-secondary-500 mb-1">Grosse Produkte (Soda)</label>
                        <div className="flex items-center gap-2">
                          <span className="text-secondary-500">€</span>
                          <input type="number" step="0.01" value={shipping[c.code]?.large ?? 0}
                            onChange={(e) => setShipping({ ...shipping, [c.code]: { ...shipping[c.code], large: parseFloat(e.target.value) || 0 } })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-secondary-500 mb-1">Kleine Produkte (Dusche etc.)</label>
                        <div className="flex items-center gap-2">
                          <span className="text-secondary-500">€</span>
                          <input type="number" step="0.01" value={shipping[c.code]?.small ?? 0}
                            onChange={(e) => setShipping({ ...shipping, [c.code]: { ...shipping[c.code], small: parseFloat(e.target.value) || 0 } })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button onClick={async () => {
                  try {
                    await adminAPI.put('/settings/admin/shipping-costs', shipping);
                    toast.success('Versandkosten gespeichert!');
                  } catch (e) { toast.error('Fehler beim Speichern'); }
                }} icon={Save}>Versandkosten speichern</Button>
              </div>
            </motion.div>
          )}

          {/* Commissions & Ranks Tab */}
          {activeTab === 'commissions' && (
            <div className="space-y-6">
              {/* My Rank */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-secondary-700 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary-500" />
                  {lang === 'de' ? 'Mein Rang' : 'My Rank'}
                </h3>
                <p className="text-sm text-secondary-500 mb-3">
                  {lang === 'de' 
                    ? 'Als Admin kannst du deinen eigenen Rang und damit deine Provisionsstufe festlegen.' 
                    : 'As admin you can set your own rank and commission level.'}
                </p>
                <div className="flex items-center gap-3">
                  <select
                    value={myRankId}
                    onChange={(e) => setMyRankId(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {ranks.map(r => (
                      <option key={r.id} value={r.id}>
                        R{r.level} {r.name} — {r.commission_rate}%
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={async () => {
                      try {
                        await adminAPI.updateOwnRank(myRankId);
                        toast.success(lang === 'de' ? 'Rang aktualisiert!' : 'Rank updated!');
                      } catch (err) { toast.error('Fehler'); }
                    }}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600"
                  >
                    <Save className="w-4 h-4 mr-1 inline" />
                    {lang === 'de' ? 'Speichern' : 'Save'}
                  </Button>
                </div>
              </div>

              {/* Commission Rates */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-secondary-700 mb-4 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-primary-500" />
                  {lang === 'de' ? 'Provisionssätze pro Rang' : 'Commission Rates per Rank'}
                </h3>
                <p className="text-sm text-secondary-500 mb-4">
                  {lang === 'de'
                    ? 'Die Differenz zwischen deinem Rang und dem Rang deiner Downline-Partner ist deine Provision auf deren Verkäufe.'
                    : 'The difference between your rank and your downline partner\'s rank is your commission on their sales.'}
                </p>
                <div className="space-y-3">
                  {ranks.map((rank) => (
                    <div key={rank.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: rank.color }}>
                        {rank.level}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-secondary-700">{rank.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={rank.commission_rate}
                          onChange={(e) => {
                            setRanks(prev => prev.map(r => 
                              r.id === rank.id ? { ...r, commission_rate: parseFloat(e.target.value) || 0 } : r
                            ));
                          }}
                          className="w-20 px-2 py-1.5 text-sm border border-gray-200 rounded-lg text-center"
                        />
                        <span className="text-sm text-secondary-500">%</span>
                        <button
                          onClick={async () => {
                            try {
                              await adminAPI.updateRank(rank.id, { commission_rate: rank.commission_rate });
                              toast.success(`${rank.name}: ${rank.commission_rate}%`);
                            } catch (err) { toast.error('Fehler'); }
                          }}
                          className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-xs hover:bg-primary-600 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  <strong>{lang === 'de' ? 'Beispiel:' : 'Example:'}</strong>{' '}
                  {lang === 'de'
                    ? 'Du bist Sales Manager (31%). Dein Partner ist Starter (8%). Du verdienst 31% - 8% = 23% Differenzprovision auf seine Verkäufe.'
                    : 'You are Sales Manager (31%). Your partner is Starter (8%). You earn 31% - 8% = 23% differential commission on their sales.'}
                </p>
              </div>
            </div>
          )}

          {/* Logo Tab */}
          {activeTab === 'logo' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-8">
                {/* Upload */}
                <div>
                  <h3 className="font-semibold text-secondary-700 mb-4">
                    {lang === 'de' ? 'Logo hochladen' : 'Upload Logo'}
                  </h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-secondary-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-secondary-500 mb-2">
                        {lang === 'de' ? 'Klicken oder Datei hierher ziehen' : 'Click or drag file here'}
                      </p>
                      <p className="text-sm text-gray-400">PNG, JPG, SVG (max. 2MB)</p>
                    </label>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <h3 className="font-semibold text-secondary-700 mb-4">
                    {lang === 'de' ? 'Vorschau' : 'Preview'}
                  </h3>
                  <div className="space-y-4">
                    {/* Light Background */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <p className="text-xs text-gray-400 mb-2">{lang === 'de' ? 'Heller Hintergrund' : 'Light Background'}</p>
                      {logoPreview && (
                        <img src={logoPreview} alt="Logo Preview" className="h-12 w-auto" />
                      )}
                    </div>
                    {/* Dark Background */}
                    <div className="bg-secondary-800 rounded-xl p-6">
                      <p className="text-xs text-gray-400 mb-2">{lang === 'de' ? 'Dunkler Hintergrund' : 'Dark Background'}</p>
                      {logoPreview && (
                        <img src={logoPreview} alt="Logo Preview" className="h-12 w-auto brightness-0 invert" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;