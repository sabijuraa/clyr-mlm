import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import toast from 'react-hot-toast';

const ResetPasswordPage = () => {
  const { lang } = useLanguage();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      setToken(t);
    } else {
      setError(lang === 'de' ? 'Kein Token gefunden. Bitte fordern Sie einen neuen Link an.' : 'No token found. Please request a new link.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(lang === 'de' ? 'Passwort muss mindestens 8 Zeichen haben' : 'Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError(lang === 'de' ? 'Passwoerter stimmen nicht ueberein' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      toast.success(lang === 'de' ? 'Passwort erfolgreich geaendert!' : 'Password changed successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || (lang === 'de' ? 'Token ungueltig oder abgelaufen. Bitte fordern Sie einen neuen Link an.' : 'Token invalid or expired. Please request a new link.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            {lang === 'de' ? 'Passwort geaendert!' : 'Password Changed!'}
          </h2>
          <p className="text-gray-500 mb-6">
            {lang === 'de' ? 'Ihr Passwort wurde erfolgreich zurueckgesetzt.' : 'Your password has been successfully reset.'}
          </p>
          <Link to="/login" className="inline-block px-6 py-3 bg-secondary-700 text-white rounded-xl font-semibold hover:bg-secondary-800 transition">
            {lang === 'de' ? 'Zum Login' : 'Go to Login'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {lang === 'de' ? 'Neues Passwort festlegen' : 'Set New Password'}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {lang === 'de' ? 'Geben Sie Ihr neues Passwort ein' : 'Enter your new password'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'de' ? 'Neues Passwort' : 'New Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
              placeholder="Min. 8 Zeichen"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lang === 'de' ? 'Passwort bestaetigen' : 'Confirm Password'}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
              placeholder={lang === 'de' ? 'Passwort wiederholen' : 'Repeat password'}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 bg-secondary-700 text-white rounded-xl font-semibold hover:bg-secondary-800 disabled:bg-gray-300 transition"
          >
            {loading ? (lang === 'de' ? 'Wird gespeichert...' : 'Saving...') : (lang === 'de' ? 'Passwort speichern' : 'Save Password')}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/login" className="text-sm text-primary-500 hover:text-primary-600">
            {lang === 'de' ? 'Zurueck zum Login' : 'Back to Login'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
