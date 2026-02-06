import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from '../utils/toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success('Willkommen zurück!');
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'partner') navigate('/partner/dashboard');
      else navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Anmeldung fehlgeschlagen');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold text-center mb-2">Anmelden</h1>
      <p className="text-center text-gray-500 mb-6">Melden Sie sich in Ihrem Konto an</p>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
          <input type="email" className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
          <input type="password" className="input-field" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-clyr-teal hover:underline">Passwort vergessen?</Link>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Anmelden...' : 'Anmelden'}
        </button>
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>Noch kein Konto? <Link to="/register" className="text-clyr-teal hover:underline">Registrieren</Link></p>
          <p>Partner werden? <Link to="/partner/register" className="text-clyr-teal hover:underline">Partner-Registrierung</Link></p>
        </div>
      </form>
    </div>
  );
}
