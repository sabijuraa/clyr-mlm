import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Lock, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/auth/profile', profile);
      setUser(prev => ({ ...prev, firstName: data.first_name, lastName: data.last_name, phone: data.phone }));
      toast.success('Profil aktualisiert');
    } catch (err) { toast.error(err.response?.data?.error || 'Fehler'); }
    finally { setLoading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('Passwörter stimmen nicht überein');
    if (passwords.newPassword.length < 6) return toast.error('Mindestens 6 Zeichen');
    setLoading(true);
    try {
      await api.put('/auth/password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Passwort geändert');
    } catch (err) { toast.error(err.response?.data?.error || 'Fehler'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-clyr-dark mb-6">Mein Profil</h1>
      <div className="flex gap-1 mb-6 border-b">
        {[{ key: 'profile', label: 'Persönliche Daten', icon: User }, { key: 'password', label: 'Passwort', icon: Lock }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-clyr-teal text-clyr-teal' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input className="input-field bg-gray-50" value={user?.email || ''} disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
              <input className="input-field" value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
              <input className="input-field" value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input className="input-field" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Speichern</button>
        </form>
      )}

      {tab === 'password' && (
        <form onSubmit={changePassword} className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aktuelles Passwort</label>
            <input type="password" className="input-field" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Neues Passwort</label>
            <input type="password" className="input-field" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Passwort bestätigen</label>
            <input type="password" className="input-field" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2"><Lock className="w-4 h-4" /> Passwort ändern</button>
        </form>
      )}
    </div>
  );
}
