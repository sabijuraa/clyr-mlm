import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Droplets, Shield, Award, Users, Heart, GraduationCap, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useBrand } from '../../context/BrandContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { t, lang } = useLanguage();
  const { login } = useAuth();
  const { companyName } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [feeMessage, setFeeMessage] = useState(null);

  const from = location.state?.from?.pathname || null;
  const feeStatus = searchParams.get('fee');

  useEffect(() => {
    if (feeStatus === 'success') {
      setFeeMessage({ type: 'success', text: lang === 'de' ? 'Zahlung erfolgreich! Ihr Konto ist jetzt aktiv. Bitte melden Sie sich an.' : 'Payment successful! Your account is now active. Please sign in.' });
    } else if (feeStatus === 'cancelled') {
      setFeeMessage({ type: 'warning', text: lang === 'de' ? 'Zahlung abgebrochen. Bitte melden Sie sich an und bezahlen Sie die Jahresgebühr, um Ihr Konto zu aktivieren.' : 'Payment cancelled. Please sign in and pay the annual fee to activate your account.' });
    } else if (feeStatus === 'error') {
      setFeeMessage({ type: 'error', text: lang === 'de' ? 'Zahlungsfehler. Bitte kontaktieren Sie den Support.' : 'Payment error. Please contact support.' });
    }
  }, [feeStatus, lang]);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    const result = await login(data.email, data.password);
    
    if (result.success) {
      toast.success(lang === 'de' ? 'Willkommen zurück!' : 'Welcome back!');
      
      if (result.user?.role === 'admin') {
        navigate(from || '/admin', { replace: true });
      } else {
        navigate(from || '/dashboard', { replace: true });
      }
    } else {
      toast.error(result.error || (lang === 'de' ? 'Login fehlgeschlagen' : 'Login failed'));
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form (White) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo - Always use clyr-logo.png */}
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src="/images/clyr-logo.png" alt={companyName} className="h-10 w-auto" />
          </Link>

          {/* Header - Charcoal text */}
          {feeMessage && (
            <div className={`mb-6 p-4 rounded-xl text-sm ${
              feeMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
              feeMessage.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
              'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {feeMessage.type === 'success' && <CheckCircle className="w-5 h-5 inline mr-2" />}
              {feeMessage.text}
            </div>
          )}
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-secondary-700 mb-2">
              {lang === 'de' ? 'Willkommen zurück' : 'Welcome back'}
            </h1>
            <p className="text-secondary-500">
              {lang === 'de' ? 'Melden Sie sich in Ihrem Konto an' : 'Sign in to your account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                {lang === 'de' ? 'E-Mail' : 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...register('email', { 
                    required: lang === 'de' ? 'E-Mail ist erforderlich' : 'Email is required',
                    pattern: { value: /^\S+@\S+$/i, message: lang === 'de' ? 'Ungültige E-Mail' : 'Invalid email' }
                  })}
                  className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 rounded-xl transition-all
                    focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100
                    ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="name@beispiel.de"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                {lang === 'de' ? 'Passwort' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: lang === 'de' ? 'Passwort ist erforderlich' : 'Password is required' })}
                  className={`w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 rounded-xl transition-all
                    focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100
                    ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-secondary-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="w-4 h-4 rounded border-gray-300 text-secondary-700 focus:ring-primary-400"
                />
                <span className="text-sm text-secondary-500">
                  {lang === 'de' ? 'Angemeldet bleiben' : 'Remember me'}
                </span>
              </label>
              <Link to="/forgot-password" className="text-sm text-secondary-700 hover:text-primary-500 font-medium">
                {lang === 'de' ? 'Passwort vergessen?' : 'Forgot password?'}
              </Link>
            </div>

            {/* Submit - Charcoal button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-secondary-700 text-white font-semibold rounded-xl hover:bg-secondary-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {lang === 'de' ? 'Anmelden' : 'Sign in'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-secondary-500">
            {lang === 'de' ? 'Noch kein Konto?' : "Don't have an account?"}{' '}
            <Link to="/partner/register" className="text-secondary-700 hover:text-primary-500 font-semibold">
              {lang === 'de' ? 'Partner werden' : 'Become a partner'}
            </Link>
          </p>

          {/* Admin Setup Link */}
          <p className="mt-4 text-center">
            <Link to="/admin-setup" className="text-xs text-gray-400 hover:text-secondary-500">
              {lang === 'de' ? 'Erstes Admin-Konto einrichten' : 'Set up first admin account'}
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Branding (Charcoal) - NO COMMISSION RATES */}
      <div className="hidden lg:flex flex-1 bg-secondary-700 items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle Glow Effects */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-400/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-400/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        
        <div className="relative z-10 text-center text-white max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl sm:text-4xl font-heading text-white font-bold mb-6">
              {lang === 'de' ? 'Willkommen im Partner-Portal' : 'Welcome to the Partner Portal'}
            </h2>
            <p className="text-xl text-gray-300 mb-10">
              {lang === 'de' 
                ? 'Verwalten Sie Ihr Team, verfolgen Sie Ihre Erfolge und bauen Sie Ihr Geschäft auf.'
                : 'Manage your team, track your success, and build your business.'}
            </p>
            
            {/* Trust Icons */}
            <div className="flex justify-center gap-6 mb-10">
              {[
                { icon: Droplets, label: lang === 'de' ? 'Premium Qualität' : 'Premium Quality' },
                { icon: Shield, label: lang === 'de' ? 'Zertifiziert' : 'Certified' },
                { icon: Award, label: lang === 'de' ? '2 Jahre Garantie' : '2 Year Warranty' },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-secondary-600 flex items-center justify-center mb-2">
                    <item.icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <span className="text-sm text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
            
            {/* Benefits - NO COMMISSION RATES */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: lang === 'de' ? 'Starke Community' : 'Strong Community' },
                { icon: GraduationCap, label: lang === 'de' ? 'CLYR Academy' : 'CLYR Academy' },
                { icon: Heart, label: lang === 'de' ? 'Premium Support' : 'Premium Support' },
                { icon: Award, label: lang === 'de' ? '6 Karrierestufen' : '6 Career Levels' },
              ].map((item, idx) => (
                <div key={idx} className="bg-secondary-600 rounded-xl p-4 text-center">
                  <item.icon className="w-6 h-6 text-primary-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-300">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;