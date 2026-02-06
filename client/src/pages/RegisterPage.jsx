import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Droplets } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Passwort muss mindestens 8 Zeichen lang sein');
    setLoading(true);
    try {
      await register(form);
      toast.success('Registrierung erfolgreich');
      navigate('/');
    } catch (err) { toast.error(err.response?.data?.error || 'Registrierung fehlgeschlagen'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><Droplets className="w-12 h-12 text-clyr-teal mx-auto mb-3" /><h1 className="text-2xl font-bold">Konto erstellen</h1></div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Vorname</label><input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="input-field" required /></div>
            <div><label className="text-sm font-medium block mb-1">Nachname</label><input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="input-field" required /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">E-Mail</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" required /></div>
          <div><label className="text-sm font-medium block mb-1">Telefon</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" /></div>
          <div><label className="text-sm font-medium block mb-1">Passwort (min. 8 Zeichen)</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" required minLength={8} /></div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">{loading ? 'Registrieren...' : 'Registrieren'}</button>
          <p className="text-sm text-center text-gray-500">Bereits ein Konto? <Link to="/login" className="text-clyr-teal font-medium">Anmelden</Link></p>
        </form>
      </div>
    </div>
  );
}
