// client/src/pages/admin/BrandingPage.jsx
import { useState, useEffect } from 'react';
import { ChromePicker } from 'react-color';

export default function BrandingPage() {
  const [branding, setBranding] = useState({
    logo_light_url: '',
    logo_dark_url: '',
    favicon_url: '',
    primary_color: '#1e40af',
    secondary_color: '#3b82f6',
    accent_color: '#f59e0b',
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
    twitter_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/branding');
      const data = await res.json();
      setBranding(data);
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (color, field) => {
    setBranding({ ...branding, [field]: color.hex });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(branding)
      });

      if (res.ok) {
        setMessage('Branding settings saved successfully!');
        // Apply colors immediately
        document.documentElement.style.setProperty('--color-primary', branding.primary_color);
        document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
        document.documentElement.style.setProperty('--color-accent', branding.accent_color);
      } else {
        setMessage('Error saving branding settings');
      }
    } catch (error) {
      setMessage('Error saving branding settings');
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(type === 'favicon' ? 'favicon' : 'logo', file);

    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'light' ? '/api/admin/branding/logo-light' 
                     : type === 'dark' ? '/api/admin/branding/logo-dark'
                     : '/api/admin/branding/favicon';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setBranding(data.branding);
        setMessage('Image uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage('Error uploading image');
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Branding & Design</h1>

      {message && (
        <div className={`p-4 mb-6 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Logo Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Logo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Light Logo */}
          <div>
            <label className="block text-sm font-medium mb-2">Logo (Light)</label>
            {branding.logo_light_url && (
              <img src={branding.logo_light_url} alt="Logo Light" className="w-32 h-32 object-contain mb-2 border p-2" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'light')}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Dark Logo */}
          <div>
            <label className="block text-sm font-medium mb-2">Logo (Dark)</label>
            {branding.logo_dark_url && (
              <img src={branding.logo_dark_url} alt="Logo Dark" className="w-32 h-32 object-contain mb-2 border p-2 bg-gray-900" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'dark')}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Favicon */}
          <div>
            <label className="block text-sm font-medium mb-2">Favicon</label>
            {branding.favicon_url && (
              <img src={branding.favicon_url} alt="Favicon" className="w-16 h-16 object-contain mb-2 border p-2" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'favicon')}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
      </div>

      {/* Color Scheme Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Farbschema</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium mb-2">Primärfarbe</label>
            <div className="flex items-center gap-2">
              <div
                className="w-12 h-12 rounded border-2 cursor-pointer"
                style={{ backgroundColor: branding.primary_color }}
                onClick={() => setShowColorPicker(showColorPicker === 'primary' ? null : 'primary')}
              />
              <input
                type="text"
                value={branding.primary_color}
                onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                className="flex-1 px-3 py-2 border rounded"
              />
            </div>
            {showColorPicker === 'primary' && (
              <div className="absolute z-10 mt-2">
                <div className="fixed inset-0" onClick={() => setShowColorPicker(null)} />
                <ChromePicker
                  color={branding.primary_color}
                  onChange={(color) => handleColorChange(color, 'primary_color')}
                />
              </div>
            )}
          </div>

          {/* Secondary Color */}
          <div>
            <label className="block text-sm font-medium mb-2">Sekundärfarbe</label>
            <div className="flex items-center gap-2">
              <div
                className="w-12 h-12 rounded border-2 cursor-pointer"
                style={{ backgroundColor: branding.secondary_color }}
                onClick={() => setShowColorPicker(showColorPicker === 'secondary' ? null : 'secondary')}
              />
              <input
                type="text"
                value={branding.secondary_color}
                onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                className="flex-1 px-3 py-2 border rounded"
              />
            </div>
            {showColorPicker === 'secondary' && (
              <div className="absolute z-10 mt-2">
                <div className="fixed inset-0" onClick={() => setShowColorPicker(null)} />
                <ChromePicker
                  color={branding.secondary_color}
                  onChange={(color) => handleColorChange(color, 'secondary_color')}
                />
              </div>
            )}
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium mb-2">Akzentfarbe</label>
            <div className="flex items-center gap-2">
              <div
                className="w-12 h-12 rounded border-2 cursor-pointer"
                style={{ backgroundColor: branding.accent_color }}
                onClick={() => setShowColorPicker(showColorPicker === 'accent' ? null : 'accent')}
              />
              <input
                type="text"
                value={branding.accent_color}
                onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                className="flex-1 px-3 py-2 border rounded"
              />
            </div>
            {showColorPicker === 'accent' && (
              <div className="absolute z-10 mt-2">
                <div className="fixed inset-0" onClick={() => setShowColorPicker(null)} />
                <ChromePicker
                  color={branding.accent_color}
                  onChange={(color) => handleColorChange(color, 'accent_color')}
                />
              </div>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="mt-6 p-4 border rounded">
          <p className="text-sm font-medium mb-2">Live-Vorschau:</p>
          <div className="flex gap-4">
            <button style={{ backgroundColor: branding.primary_color }} className="px-4 py-2 text-white rounded">
              Primär Button
            </button>
            <button style={{ backgroundColor: branding.secondary_color }} className="px-4 py-2 text-white rounded">
              Sekundär Button
            </button>
            <button style={{ backgroundColor: branding.accent_color }} className="px-4 py-2 text-white rounded">
              Akzent Button
            </button>
          </div>
        </div>
      </div>

      {/* Social Media Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Social Media</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Facebook URL</label>
            <input
              type="url"
              value={branding.facebook_url || ''}
              onChange={(e) => setBranding({ ...branding, facebook_url: e.target.value })}
              placeholder="https://facebook.com/..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Instagram URL</label>
            <input
              type="url"
              value={branding.instagram_url || ''}
              onChange={(e) => setBranding({ ...branding, instagram_url: e.target.value })}
              placeholder="https://instagram.com/..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
            <input
              type="url"
              value={branding.linkedin_url || ''}
              onChange={(e) => setBranding({ ...branding, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Twitter URL</label>
            <input
              type="url"
              value={branding.twitter_url || ''}
              onChange={(e) => setBranding({ ...branding, twitter_url: e.target.value })}
              placeholder="https://twitter.com/..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {saving ? 'Speichern...' : 'Änderungen speichern'}
        </button>
      </div>
    </div>
  );
}