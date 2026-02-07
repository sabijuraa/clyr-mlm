// client/src/components/common/NewsletterSignup.jsx
// GROUP 9 #44: Newsletter subscribe widget
import { useState } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';

const NewsletterSignup = ({ variant = 'inline' }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Erfolgreich angemeldet!');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Fehler bei der Anmeldung');
      }
    } catch {
      setStatus('error');
      setMessage('Verbindungsfehler');
    }
    setTimeout(() => { if (status !== 'idle') setStatus('idle'); }, 5000);
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-green-400 py-2">
        <Check className="w-5 h-5" />
        <span className="text-sm">{message}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail-Adresse"
          className="w-full pl-10 pr-3 py-2.5 bg-secondary-700 border border-secondary-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent" />
      </div>
      <button type="submit" disabled={status === 'loading'}
        className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap">
        {status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Anmelden'}
      </button>
      {status === 'error' && <p className="absolute text-xs text-red-400 mt-1">{message}</p>}
    </form>
  );
};

export default NewsletterSignup;
