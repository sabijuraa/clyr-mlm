import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwörter stimmen nicht überein');
    if (password.length < 6) return toast.error('Mindestens 6 Zeichen');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success('Passwort zurückgesetzt!');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.error || 'Token ungültig oder abgelaufen'); }
    finally { setLoading(false); }
  };

  if (!token) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">Ungültiger Link</h1>
      <Link to="/forgot-password" className="text-clyr-teal hover:underline">Neuen Link anfordern</Link>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold text-center mb-6">Neues Passwort setzen</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <input type="password" placeholder="Neues Passwort" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required minLength={6} />
        <input type="password" placeholder="Passwort bestätigen" value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field" required />
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Speichern...' : 'Passwort setzen'}</button>
      </form>
    </div>
  );
}
