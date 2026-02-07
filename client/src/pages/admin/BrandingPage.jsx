// client/src/pages/admin/BrandingPage.jsx
// GROUP 8 #2: Fix color customization, #3: Fix logo upload
import { useState, useEffect } from 'react';
import { Palette, Image, Globe, Save, Upload, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BrandingPage() {
  const [branding, setBranding] = useState({
    logo_light_url: '', logo_dark_url: '', favicon_url: '',
    primary_color: '#0ea5e9', secondary_color: '#171717', accent_color: '#f59e0b',
    font_heading: 'Inter', font_body: 'Inter',
    facebook_url: '', instagram_url: '', linkedin_url: '', twitter_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBranding(); }, []);

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/branding');
      if (res.ok) {
        const data = await res.json();
        setBranding(prev => ({ ...prev, ...data }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/branding', { method: 'PUT', headers, body: JSON.stringify(branding) });
      if (res.ok) {
        toast.success('Branding gespeichert!');
        document.documentElement.style.setProperty('--color-primary', branding.primary_color);
        document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
        document.documentElement.style.setProperty('--color-accent', branding.accent_color);
      } else { toast.error('Fehler beim Speichern'); }
    } catch (e) { toast.error('Fehler beim Speichern'); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append(type === 'favicon' ? 'favicon' : 'logo', file);
    try {
      const endpoint = type === 'light' ? '/api/admin/branding/logo-light'
                     : type === 'dark' ? '/api/admin/branding/logo-dark'
                     : '/api/admin/branding/favicon';
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setBranding(prev => ({ ...prev, ...data.branding }));
        toast.success('Bild hochgeladen!');
      } else { toast.error('Upload fehlgeschlagen'); }
    } catch (e) { toast.error('Upload fehlgeschlagen'); }
  };

  if (loading) return <div className="p-6">Laden...</div>;

  const ColorField = ({ label, field }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input type="color" value={branding[field] || '#000000'}
          onChange={(e) => setBranding({ ...branding, [field]: e.target.value })}
          className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
        <input type="text" value={branding[field] || ''}
          onChange={(e) => setBranding({ ...branding, [field]: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
          placeholder="#000000" />
        <div className="w-10 h-10 rounded-lg border" style={{ backgroundColor: branding[field] || '#000' }} />
      </div>
    </div>
  );

  const LogoUpload = ({ label, field, type }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-4">
        {branding[field] && (
          <img src={branding[field]} alt={label} className="w-24 h-24 object-contain border rounded-lg p-2 bg-gray-50" />
        )}
        <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition text-sm">
          <Upload className="w-4 h-4" />
          Hochladen
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, type)} />
        </label>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branding & Design</h1>
          <p className="text-gray-500 mt-1">Passen Sie Farben, Logo und Schriften an</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition font-medium">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Speichern
        </button>
      </div>

      {/* Colors (#2) */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Palette className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold">Farben</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <ColorField label="Primaerfarbe" field="primary_color" />
          <ColorField label="Sekundaerfarbe" field="secondary_color" />
          <ColorField label="Akzentfarbe" field="accent_color" />
        </div>
        {/* Preview */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 mb-3">Vorschau:</p>
          <div className="flex gap-3">
            <button style={{ backgroundColor: branding.primary_color }} className="px-4 py-2 rounded-lg text-white text-sm">Primaer</button>
            <button style={{ backgroundColor: branding.secondary_color }} className="px-4 py-2 rounded-lg text-white text-sm">Sekundaer</button>
            <button style={{ backgroundColor: branding.accent_color }} className="px-4 py-2 rounded-lg text-white text-sm">Akzent</button>
          </div>
        </div>
      </section>

      {/* Logo (#3) */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Image className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">Logo & Favicon</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <LogoUpload label="Logo (Hell)" field="logo_light_url" type="light" />
          <LogoUpload label="Logo (Dunkel)" field="logo_dark_url" type="dark" />
          <LogoUpload label="Favicon" field="favicon_url" type="favicon" />
        </div>
      </section>

      {/* Social */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Globe className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold">Social Media</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label: 'Facebook', field: 'facebook_url', placeholder: 'https://facebook.com/...' },
            { label: 'Instagram', field: 'instagram_url', placeholder: 'https://instagram.com/...' },
            { label: 'LinkedIn', field: 'linkedin_url', placeholder: 'https://linkedin.com/...' },
            { label: 'Twitter/X', field: 'twitter_url', placeholder: 'https://x.com/...' },
          ].map(s => (
            <div key={s.field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{s.label}</label>
              <input type="url" value={branding[s.field] || ''}
                onChange={(e) => setBranding({ ...branding, [s.field]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder={s.placeholder} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
