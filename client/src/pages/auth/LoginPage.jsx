import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Droplets, Shield, Award } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useBrand } from '../../context/BrandContext';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { t, lang } = useLanguage();
  const { login } = useAuth();
  const { companyName, logoUrl } = useBrand();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || null;

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    const result = await login(data.email, data.password);
    
    if (result.success) {
      toast.success(lang === 'de' ? 'Willkommen zurück!' : 'Welcome back!');
      
      // Redirect based on user role
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
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={logoUrl} alt={companyName} className="h-10 w-auto" />
            <span className="font-bold text-xl text-teal-700">{companyName}</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
              {lang === 'de' ? 'Willkommen zurück' : 'Welcome back'}
            </h1>
            <p className="text-gray-600">
              {lang === 'de' ? 'Melden Sie sich in Ihrem Konto an' : 'Sign in to your account'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className={`w-full pl-12 pr-4 py-3 bg-gray-50 border-2 rounded-xl transition-all
                    focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'de' ? 'Passwort' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: lang === 'de' ? 'Passwort ist erforderlich' : 'Password is required' })}
                  className={`w-full pl-12 pr-12 py-3 bg-gray-50 border-2 rounded-xl transition-all
                    focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                    ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-600">
                  {lang === 'de' ? 'Angemeldet bleiben' : 'Remember me'}
                </span>
              </label>
              <Link to="/passwort-vergessen" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                {lang === 'de' ? 'Passwort vergessen?' : 'Forgot password?'}
              </Link>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              icon={ArrowRight}
              iconPosition="right"
            >
              {lang === 'de' ? 'Anmelden' : 'Sign in'}
            </Button>
          </form>

          {/* Register Link */}
          <p className="mt-8 text-center text-gray-600">
            {lang === 'de' ? 'Noch kein Konto?' : "Don't have an account?"}{' '}
            <Link to="/partner-werden" className="text-teal-600 hover:text-teal-700 font-semibold">
              {lang === 'de' ? 'Partner werden' : 'Become a partner'}
            </Link>
          </p>

          {/* Admin Setup Link */}
          <p className="mt-4 text-center">
            <Link to="/admin-setup" className="text-xs text-gray-400 hover:text-gray-600">
              {lang === 'de' ? 'Erstes Admin-Konto einrichten' : 'Set up first admin account'}
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Image/Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-teal-600 to-teal-800 
        items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
        
        <div className="relative z-10 text-center text-white max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-4xl font-heading text-white font-bold mb-6">
              {lang === 'de' ? 'Willkommen im Partner-Portal' : 'Welcome to the Partner Portal'}
            </h2>
            <p className="text-xl text-white/80 mb-8">
              {lang === 'de' 
                ? 'Verwalten Sie Ihr Team, verfolgen Sie Ihre Provisionen und bauen Sie Ihr Geschäft mit unseren Premium-Wasserfilterlösungen auf.'
                : 'Manage your team, track your commissions, and build your business with our premium water filtration solutions.'}
            </p>
            
            {/* Trust Icons */}
            <div className="flex justify-center gap-8 mt-8 mb-8">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                  <Droplets className="w-6 h-6" />
                </div>
                <span className="text-sm text-white/70">Premium Qualität</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-sm text-white/70">TÜV Zertifiziert</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-sm text-white/70">2 Jahre Garantie</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-6 mt-12">
              <div className="text-center">
                <p className="text-4xl font-bold">36%</p>
                <p className="text-white/70 text-sm">Max. Provision</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">2.5k+</p>
                <p className="text-white/70 text-sm">Partner</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">€2M+</p>
                <p className="text-white/70 text-sm">Ausgezahlt</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;