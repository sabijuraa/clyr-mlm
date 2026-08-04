// client/src/pages/customer/CustomerLoginPage.jsx
// GROUP 7 #9: Fix customer login
import { useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Package, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerPortalAPI } from '../../services/api';

const CustomerLoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: ''
  });

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Bitte E-Mail eingeben');
      return;
    }
    setIsLoading(true);
    try {
      await customerPortalAPI.forgotPassword(forgotEmail);
      setForgotSent(true);
      toast.success('E-Mail mit Reset-Link wurde gesendet');
    } catch (error) {
      // Always show success to prevent email enumeration
      setForgotSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!isLogin && formData.password !== formData.confirmPassword) {
        toast.error('Passwoerter stimmen nicht ueberein');
        setIsLoading(false);
        return;
      }

      let data;
      if (isLogin) {
        const response = await customerPortalAPI.login(formData.email, formData.password);
        data = response.data;
      } else {
        const response = await customerPortalAPI.register({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName
        });
        data = response.data;
      }

      if (!data.token) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten');
      }

      localStorage.setItem('customerToken', data.token);
      localStorage.setItem('customerData', JSON.stringify(data.customer));
      toast.success(isLogin ? 'Erfolgreich angemeldet!' : 'Konto erstellt!');
      // Defer navigation slightly so Framer Motion / toast DOM updates
      // finish before this component unmounts (avoids a React removeChild
      // race when navigation happens mid-render/animation).
      setTimeout(() => navigate('/customer/dashboard'), 50);
    } catch (error) {
      const respData = error.response?.data;
      const msg = respData?.error || error.message || 'Ein Fehler ist aufgetreten';
      // Auto-switch to registration if account has no password
      if (respData?.needsRegistration) {
        toast.error('Bitte setzen Sie zuerst ein Passwort für Ihr Konto.');
        // Defer the fields swap (login-fields -> register-fields Fragment key
        // change) by a tick so the toast's DOM update finishes first and
        // doesn't collide with React's reconciliation of this component.
        setTimeout(() => {
          setIsLogin(false);
          if (respData.email) setFormData(prev => ({ ...prev, email: respData.email }));
        }, 50);
      } else {
        toast.error(msg);
      }
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
            {isLogin ? 'Kundenbereich' : 'Konto erstellen'}
          </h1>
          <p className="text-secondary-500 mt-2">
            {isLogin
              ? 'Melden Sie sich an, um Ihre Bestellungen zu verwalten'
              : 'Erstellen Sie ein Konto mit Ihrer Bestell-E-Mail'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {showForgot && (
              <div key="forgot-panel" className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                {forgotSent ? (
                  <div className="text-center">
                    <p className="text-sm text-blue-900 font-medium mb-2">E-Mail gesendet!</p>
                    <p className="text-xs text-blue-700">
                      Wenn ein Konto mit dieser E-Mail existiert, erhalten Sie einen Link zum Setzen / Zurücksetzen Ihres Passworts.
                    </p>
                    <button type="button" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); }}
                      className="mt-3 text-xs text-blue-600 underline">
                      Zurück zur Anmeldung
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-2">Passwort vergessen oder noch nie gesetzt?</p>
                    <p className="text-xs text-blue-700 mb-3">
                      Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Festlegen eines neuen Passworts.
                    </p>
                    <div className="flex gap-2">
                      <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                        autoComplete="email"
                        className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm"
                        placeholder="ihre@email.de" />
                      <button type="button" onClick={handleForgotPassword} disabled={isLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                        Senden
                      </button>
                    </div>
                    <button type="button" onClick={() => setShowForgot(false)}
                      className="mt-2 text-xs text-blue-600 underline">
                      Zurück
                    </button>
                  </div>
                )}
              </div>
            )}

            {!showForgot && !isLogin && (
              <div key="register-name-fields" className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Vorname</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                    <input type="text" value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                      placeholder="Max" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Nachname</label>
                  <input type="text" value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                    placeholder="Muster" />
                </div>
              </div>
            )}

            {!showForgot && (
              <Fragment key={isLogin ? 'login-fields' : 'register-fields'}>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">E-Mail-Adresse</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input type="email" required value={formData.email}
                  autoComplete="email"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                  placeholder="ihre@email.de" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input type="password" required value={formData.password}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                  placeholder="Mindestens 6 Zeichen" />
              </div>
              {isLogin && (
                <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(formData.email); }}
                  className="mt-2 text-xs text-primary-600 hover:text-primary-700 underline">
                  Passwort vergessen?
                </button>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Passwort bestaetigen</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input type="password" required value={formData.confirmPassword}
                    autoComplete="new-password"
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                    placeholder="Passwort wiederholen" />
                </div>
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full bg-secondary-700 hover:bg-secondary-800 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>{isLogin ? 'Anmelden' : 'Konto erstellen'}<ArrowRight className="w-5 h-5" /></>
              )}
            </button>
              </Fragment>
            )}
          </form>

          {!showForgot && (
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-secondary-600 hover:text-secondary-700">
              {isLogin ? (
                <>Noch kein Konto? <span className="text-primary-500 font-medium">Jetzt registrieren</span></>
              ) : (
                <>Bereits ein Konto? <span className="text-primary-500 font-medium">Anmelden</span></>
              )}
            </button>
          </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100">
            <Package className="w-8 h-8 text-primary-500" />
            <div>
              <p className="font-medium text-secondary-700 text-sm">Bestellungen</p>
              <p className="text-xs text-secondary-500">Verlauf & Status</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100">
            <ShieldCheck className="w-8 h-8 text-primary-500" />
            <div>
              <p className="font-medium text-secondary-700 text-sm">Rechnungen</p>
              <p className="text-xs text-secondary-500">Download</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-secondary-500 hover:text-secondary-700 text-sm">
            &larr; Zurueck zum Shop
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerLoginPage;
