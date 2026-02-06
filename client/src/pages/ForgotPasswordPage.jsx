import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from '../utils/toast';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) { toast.error('Fehler'); }
    finally { setLoading(false); }
  };

  if (sent) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <Mail className="w-16 h-16 text-clyr-teal mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">E-Mail gesendet</h1>
      <p className="text-gray-600 mb-6">Falls ein Konto mit dieser E-Mail existiert, haben wir Ihnen einen Link zum Zurücksetzen gesendet.</p>
      <Link to="/login" className="text-clyr-teal hover:underline">Zurück zum Login</Link>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold text-center mb-6">Passwort vergessen</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <p className="text-sm text-gray-600">Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.</p>
        <input type="email" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Senden...' : 'Link senden'}</button>
        <p className="text-center text-sm"><Link to="/login" className="text-clyr-teal hover:underline">Zurück zum Login</Link></p>
      </form>
    </div>
  );
}
