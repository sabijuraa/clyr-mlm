// client/src/pages/customer/CustomerResetPasswordPage.jsx
// Customer password reset via token from email link
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerPortalAPI } from '../../services/api';

const CustomerResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Ungültiger Link');
      navigate('/customer/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 8) {
      toast.error('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }

    setIsLoading(true);
    try {
      const response = await customerPortalAPI.resetPassword(token, password);
      
      if (response.data.token) {
        // Auto-login
        localStorage.setItem('customerToken', response.data.token);
        localStorage.setItem('customerData', JSON.stringify(response.data.customer));
      }
      
      setSuccess(true);
      toast.success('Passwort erfolgreich gesetzt!');
      
      setTimeout(() => {
        navigate('/customer/dashboard');
      }, 2000);
    } catch (error) {
      const msg = error.response?.data?.error || 'Passwort konnte nicht gesetzt werden';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img src="/images/clyr-logo.png" alt="CLYR" className="h-12 mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-secondary-700">
            {success ? 'Passwort gesetzt!' : 'Neues Passwort festlegen'}
          </h1>
          <p className="text-secondary-500 mt-2">
            {success 
              ? 'Sie werden automatisch weitergeleitet...'
              : 'Bitte geben Sie Ihr neues Passwort ein'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-secondary-700 font-medium">
                Ihr Passwort wurde erfolgreich gesetzt.
              </p>
              <Link to="/customer/dashboard" className="mt-6 inline-block text-primary-600 hover:text-primary-700 font-medium">
                Zum Kundenbereich →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Neues Passwort</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                    placeholder="Mindestens 8 Zeichen" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Passwort bestätigen</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input type="password" required value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                    placeholder="Passwort wiederholen" />
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-secondary-700 hover:bg-secondary-800 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Passwort festlegen <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/customer/login" className="text-secondary-500 hover:text-secondary-700 text-sm">
            ← Zurück zur Anmeldung
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerResetPasswordPage;
