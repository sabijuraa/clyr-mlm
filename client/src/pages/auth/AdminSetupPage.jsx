import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  Shield, Mail, Lock, User, Key, CheckCircle2, AlertTriangle,
  Eye, EyeOff, Building2, Users, Settings
} from 'lucide-react';
import { useBrand } from '../../context/BrandContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AdminSetupPage = () => {
  const { companyName } = useBrand();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSetupKey, setShowSetupKey] = useState(false);
  const [setupAvailable, setSetupAvailable] = useState(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      setupKey: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const password = watch('password');

  useEffect(() => {
    const checkSetupAvailable = async () => {
      try {
        const response = await authAPI.checkSetup();
        setSetupAvailable(response.data.setupAvailable);
      } catch (error) {
        console.error('Error checking setup status:', error);
        setSetupAvailable(false);
      } finally {
        setCheckingSetup(false);
      }
    };
    checkSetupAvailable();
  }, []);

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.setupAdmin({
        setupKey: data.setupKey,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password
      });

      toast.success('Admin-Konto erfolgreich erstellt!');
      navigate('/login');
      
    } catch (error) {
      toast.error(error.message || 'Setup fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-secondary-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Überprüfe Setup-Status...</p>
        </div>
      </div>
    );
  }

  // Setup not available
  if (!setupAvailable) {
    return (
      <div className="min-h-screen bg-secondary-700 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-700 mb-3">
            Setup nicht verfügbar
          </h1>
          <p className="text-secondary-500 mb-6">
            Ein Admin-Konto existiert bereits. Bitte melden Sie sich an oder kontaktieren Sie den Administrator.
          </p>
          <Link to="/login">
            <button className="w-full px-6 py-3 bg-secondary-700 text-white font-semibold rounded-xl hover:bg-secondary-800 transition-all">
              Zur Anmeldung
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const inputClass = (hasError) => `
    w-full px-4 py-3.5 bg-white border-2 rounded-xl transition-all duration-200
    focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100
    ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}
  `;

  const inputWithIconClass = (hasError) => `
    w-full pl-12 pr-4 py-3.5 bg-white border-2 rounded-xl transition-all duration-200
    focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100
    ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}
  `;

  return (
    <div className="min-h-screen bg-secondary-700 flex items-center justify-center p-4">
      <div className="grid lg:grid-cols-2 gap-8 max-w-5xl w-full">
        
        {/* Left Side - Info */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:flex flex-col justify-center"
        >
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-secondary-600 flex items-center justify-center mb-6">
              <Shield className="w-8 h-8 text-primary-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Admin Setup
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              Willkommen bei {companyName}! Richten Sie Ihr erstes Administrator-Konto ein, um das System zu verwalten.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Building2, text: 'Vollständige Systemverwaltung' },
              { icon: Users, text: 'Partner und Kunden verwalten' },
              { icon: Settings, text: 'Sicherheitseinstellungen konfigurieren' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-secondary-600 rounded-xl p-4">
                <div className="w-10 h-10 rounded-lg bg-secondary-500 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary-400" />
                </div>
                <span className="text-white font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 p-4 bg-secondary-600 border border-secondary-500 rounded-xl">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 font-medium text-sm">Sicherheitshinweis</p>
                <p className="text-gray-400 text-sm mt-1">
                  Der Setup-Schlüssel befindet sich in der Server-Konfiguration (.env Datei). 
                  Dieses Setup ist nur einmalig möglich.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8"
        >
          {/* Mobile Header */}
          <div className="lg:hidden mb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary-700 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-secondary-700 mb-2">
              Admin Setup
            </h1>
            <p className="text-secondary-500 text-sm">
              Erstellen Sie das erste Admin-Konto
            </p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-secondary-700 mb-2">
              Administrator erstellen
            </h2>
            <p className="text-secondary-500">
              Geben Sie Ihre Daten ein, um das Admin-Konto zu erstellen
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Setup Key */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Setup-Schlüssel <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showSetupKey ? 'text' : 'password'}
                  {...register('setupKey', { required: 'Setup-Schlüssel ist erforderlich' })}
                  className={`${inputWithIconClass(errors.setupKey)} pr-12`}
                  placeholder="Ihr Setup-Schlüssel"
                />
                <button
                  type="button"
                  onClick={() => setShowSetupKey(!showSetupKey)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-secondary-700"
                >
                  {showSetupKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.setupKey && <p className="mt-1.5 text-sm text-red-500">{errors.setupKey.message}</p>}
            </div>

            {/* Name Fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Vorname <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('firstName', { required: 'Vorname ist erforderlich' })}
                  className={inputClass(errors.firstName)}
                  placeholder="Max"
                />
                {errors.firstName && <p className="mt-1.5 text-sm text-red-500">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Nachname <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('lastName', { required: 'Nachname ist erforderlich' })}
                  className={inputClass(errors.lastName)}
                  placeholder="Mustermann"
                />
                {errors.lastName && <p className="mt-1.5 text-sm text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                E-Mail Adresse <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...register('email', { 
                    required: 'E-Mail ist erforderlich',
                    pattern: { value: /^\S+@\S+$/i, message: 'Ungültige E-Mail-Adresse' }
                  })}
                  className={inputWithIconClass(errors.email)}
                  placeholder="admin@example.com"
                />
              </div>
              {errors.email && <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Passwort <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { 
                    required: 'Passwort ist erforderlich',
                    minLength: { value: 8, message: 'Mindestens 8 Zeichen' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Mind. 1 Großbuchstabe, 1 Kleinbuchstabe und 1 Zahl'
                    }
                  })}
                  className={`${inputWithIconClass(errors.password)} pr-12`}
                  placeholder="Sicheres Passwort"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-secondary-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-sm text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Passwort bestätigen <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('confirmPassword', { 
                    required: 'Passwort-Bestätigung ist erforderlich',
                    validate: value => value === password || 'Passwörter stimmen nicht überein'
                  })}
                  className={inputWithIconClass(errors.confirmPassword)}
                  placeholder="Passwort wiederholen"
                />
              </div>
              {errors.confirmPassword && <p className="mt-1.5 text-sm text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {/* Submit - Charcoal button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 px-6 py-4 bg-secondary-700 text-white font-semibold rounded-xl hover:bg-secondary-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Admin-Konto erstellen
                </>
              )}
            </button>
          </form>

          {/* Back to login */}
          <p className="mt-6 text-center text-secondary-500 text-sm">
            Bereits ein Admin-Konto?{' '}
            <Link to="/login" className="text-secondary-700 hover:text-primary-500 font-semibold">
              Zur Anmeldung
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminSetupPage;