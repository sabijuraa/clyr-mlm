// client/src/pages/admin/CompanySettingsPage.jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState({
    company_name: '',
    company_legal_name: '',
    tax_id: '',
    registration_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postal_code: '',
    country: 'Deutschland',
    phone: '',
    email: '',
    support_email: '',
    bank_name: '',
    iban: '',
    bic: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/company');
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put('/admin/company', settings);
      setMessage('Einstellungen erfolgreich gespeichert!');
      fetchSettings();
    } catch (error) {
      setMessage('Fehler beim Speichern');
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Firmeneinstellungen</h1>

      {message && (
        <div className={`p-4 mb-6 rounded ${message.includes('Fehler') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Company Information */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Firmendaten</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Firmenname *</label>
            <input
              type="text"
              value={settings.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Rechtliche Firmenbezeichnung</label>
            <input
              type="text"
              value={settings.company_legal_name || ''}
              onChange={(e) => handleChange('company_legal_name', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Steuernummer / UID</label>
            <input
              type="text"
              value={settings.tax_id || ''}
              onChange={(e) => handleChange('tax_id', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="ATU12345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Firmenbuchnummer</label>
            <input
              type="text"
              value={settings.registration_number || ''}
              onChange={(e) => handleChange('registration_number', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Adresse</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Straße und Hausnummer *</label>
            <input
              type="text"
              value={settings.address_line1 || ''}
              onChange={(e) => handleChange('address_line1', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Adresszusatz</label>
            <input
              type="text"
              value={settings.address_line2 || ''}
              onChange={(e) => handleChange('address_line2', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">PLZ *</label>
              <input
                type="text"
                value={settings.postal_code || ''}
                onChange={(e) => handleChange('postal_code', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Stadt *</label>
              <input
                type="text"
                value={settings.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Land *</label>
              <select
                value={settings.country || 'Deutschland'}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="Deutschland">Deutschland</option>
                <option value="Österreich">Österreich</option>
                <option value="Schweiz">Schweiz</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Kontakt</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Telefon</label>
            <input
              type="tel"
              value={settings.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="+43 1 234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">E-Mail *</label>
            <input
              type="email"
              value={settings.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Support E-Mail</label>
            <input
              type="email"
              value={settings.support_email || ''}
              onChange={(e) => handleChange('support_email', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Bank Details (for invoices) */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Bankverbindung (für Rechnungen)</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Bankname</label>
            <input
              type="text"
              value={settings.bank_name || ''}
              onChange={(e) => handleChange('bank_name', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="z.B. Deutsche Bank"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">IBAN</label>
              <input
                type="text"
                value={settings.iban || ''}
                onChange={(e) => handleChange('iban', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="DE89 3704 0044 0532 0130 00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">BIC</label>
              <input
                type="text"
                value={settings.bic || ''}
                onChange={(e) => handleChange('bic', e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="COBADEFFXXX"
              />
            </div>
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
          {saving ? 'Speichern...' : 'Einstellungen speichern'}
        </button>
      </div>
    </div>
  );
}