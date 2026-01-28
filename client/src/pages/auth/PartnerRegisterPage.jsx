import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  User, Building, Upload, Check, ArrowRight, ArrowLeft,
  Mail, Phone, MapPin, CreditCard, FileText, Shield,
  Wallet, Clock, BookOpen, Users, TrendingUp, Award, Heart, Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useBrand } from '../../context/BrandContext';
import appConfig, { calculatePartnerFee, formatCurrency } from '../../config/app.config';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const PartnerRegisterPage = () => {
  const { lang } = useLanguage();
  const { companyName, logoUrl } = useBrand();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({
    passport: null,
    bankCard: null,
    tradeLicense: null
  });

  const referralCode = searchParams.get('ref') || '';
  const currentMonth = new Date().getMonth() + 1;
  const partnerFee = calculatePartnerFee(currentMonth);

  const { register, handleSubmit, watch, formState: { errors }, trigger } = useForm({
    defaultValues: {
      referralCode: referralCode,
      country: 'DE'
    }
  });

  const steps = [
    { id: 1, label: lang === 'de' ? 'Persönliche Daten' : 'Personal Info', icon: User },
    { id: 2, label: lang === 'de' ? 'Geschäftsdaten' : 'Business Info', icon: Building },
    { id: 3, label: lang === 'de' ? 'Dokumente' : 'Documents', icon: Upload },
    { id: 4, label: lang === 'de' ? 'Bestätigung' : 'Confirmation', icon: Check },
  ];

  const benefits = [
    { icon: TrendingUp, text: lang === 'de' ? 'Attraktives Einkommen' : 'Attractive Income' },
    { icon: Clock, text: lang === 'de' ? 'Flexible Arbeitszeiten' : 'Flexible hours' },
    { icon: BookOpen, text: lang === 'de' ? 'Umfassende Schulungen' : 'Comprehensive training' },
    { icon: Users, text: lang === 'de' ? 'Persönlicher Support' : 'Personal support' },
  ];

  const handleFileUpload = (field, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({ ...prev, [field]: file }));
    }
  };

  const nextStep = async () => {
    let fieldsToValidate = [];
    
    if (step === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'password'];
    } else if (step === 2) {
      fieldsToValidate = ['street', 'zip', 'city', 'country', 'iban'];
    }
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(s => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      
      // Map form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Map acceptTerms to termsAccepted (backend expects this name)
          if (key === 'acceptTerms') {
            formData.append('termsAccepted', value ? 'true' : 'false');
          } else {
            formData.append(key, value);
          }
        }
      });
      
      // Add files
      if (uploadedFiles.passport) formData.append('passport', uploadedFiles.passport);
      if (uploadedFiles.bankCard) formData.append('bankCard', uploadedFiles.bankCard);
      if (uploadedFiles.tradeLicense) formData.append('tradeLicense', uploadedFiles.tradeLicense);

      const { authAPI } = await import('../../services/api');
      const response = await authAPI.register(formData);
      console.log('Registration response:', response.data);

      toast.success(lang === 'de' 
        ? 'Registrierung erfolgreich! Sie können sich jetzt anmelden.' 
        : 'Registration successful! You can now log in.');
      navigate('/login');
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Show detailed error message from server
      if (error.response?.data?.details) {
        const errorMessages = error.response.data.details
          .map(e => e.message)
          .join('\n');
        toast.error(errorMessages || 'Registrierung fehlgeschlagen');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error(lang === 'de' 
          ? 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.' 
          : 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoUrl} alt={companyName} className="h-10 w-auto" />
            <span className="font-bold text-xl text-teal-700 hidden sm:block">{companyName}</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-8"
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {lang === 'de' ? 'Partner werden' : 'Become a Partner'}
              </h1>
              <p className="text-gray-600 mb-8">
                {lang === 'de' 
                  ? 'Starten Sie Ihre Karriere mit uns und bauen Sie Ihr eigenes Geschäft auf.'
                  : 'Start your career with us and build your own business.'}
              </p>

              <div className="space-y-4 mb-8">
                {benefits.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100"
                  >
                    <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="font-medium text-gray-900">{benefit.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Career Benefits Card - No Commission Rates */}
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-6 text-white">
                <h3 className="font-semibold text-lg mb-4">
                  {lang === 'de' ? 'Ihre Vorteile' : 'Your Benefits'}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{lang === 'de' ? 'Eigenes Business' : 'Your Own Business'}</p>
                      <p className="text-sm text-teal-200">{lang === 'de' ? 'Seien Sie Ihr eigener Chef' : 'Be your own boss'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{lang === 'de' ? '6 Karrierestufen' : '6 Career Levels'}</p>
                      <p className="text-sm text-teal-200">{lang === 'de' ? 'Wachsen Sie mit uns' : 'Grow with us'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{lang === 'de' ? 'Premium Produkte' : 'Premium Products'}</p>
                      <p className="text-sm text-teal-200">{lang === 'de' ? 'Produkte die begeistern' : 'Products that inspire'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{lang === 'de' ? 'Starke Community' : 'Strong Community'}</p>
                      <p className="text-sm text-teal-200">{lang === 'de' ? 'Teil eines wachsenden Teams' : 'Part of a growing team'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                {steps.map((s, i) => (
                  <div key={s.id} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold
                      ${step >= s.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`hidden sm:block w-16 h-1 mx-2 rounded
                        ${step > s.id ? 'bg-teal-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        {lang === 'de' ? 'Persönliche Daten' : 'Personal Information'}
                      </h2>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {lang === 'de' ? 'Empfehlungscode' : 'Referral Code'}
                        </label>
                        <input
                          {...register('referralCode')}
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl
                            focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                          placeholder="ABC123"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {lang === 'de' ? 'Vorname' : 'First Name'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('firstName', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                              ${errors.firstName ? 'border-red-400' : 'border-gray-200'}`}
                          />
                          {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {lang === 'de' ? 'Nachname' : 'Last Name'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('lastName', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                              ${errors.lastName ? 'border-red-400' : 'border-gray-200'}`}
                          />
                          {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {lang === 'de' ? 'E-Mail' : 'Email'} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            {...register('email', { 
                              required: lang === 'de' ? 'Pflichtfeld' : 'Required',
                              pattern: { value: /^\S+@\S+$/i, message: lang === 'de' ? 'Ungültige E-Mail' : 'Invalid email' }
                            })}
                            className={`w-full pl-12 pr-4 py-3 bg-gray-50 border-2 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                              ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                          />
                        </div>
                        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {lang === 'de' ? 'Telefon' : 'Phone'} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            {...register('phone', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={`w-full pl-12 pr-4 py-3 bg-gray-50 border-2 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                              ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                            placeholder="+49 123 456 7890"
                          />
                        </div>
                        {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {lang === 'de' ? 'Passwort' : 'Password'} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          {...register('password', { 
                            required: lang === 'de' ? 'Pflichtfeld' : 'Required',
                            minLength: { value: 8, message: lang === 'de' ? 'Mindestens 8 Zeichen' : 'At least 8 characters' },
                            pattern: {
                              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
                              message: lang === 'de' 
                                ? 'Passwort muss Groß-, Kleinbuchstaben und eine Zahl enthalten' 
                                : 'Password must contain uppercase, lowercase and a number'
                            }
                          })}
                          className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl
                            focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                            ${errors.password ? 'border-red-400' : 'border-gray-200'}`}
                        />
                        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
                        <p className="mt-1 text-xs text-gray-500">
                          {lang === 'de' 
                            ? 'Mind. 8 Zeichen, Groß- und Kleinbuchstaben, eine Zahl' 
                            : 'Min. 8 chars, uppercase, lowercase, one number'}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        {lang === 'de' ? 'Geschäftsdaten' : 'Business Information'}
                      </h2>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {lang === 'de' ? 'Firma (optional)' : 'Company (optional)'}
                          </label>
                          <input
                            {...register('company')}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {lang === 'de' ? 'USt-IdNr. (optional)' : 'VAT ID (optional)'}
                          </label>
                          <input
                            {...register('vatId')}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                            placeholder="DE123456789"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {lang === 'de' ? 'Straße und Hausnummer' : 'Street Address'} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            {...register('street', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={`w-full pl-12 pr-4 py-3 bg-gray-50 border-2 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                              ${errors.street ? 'border-red-400' : 'border-gray-200'}`}
                          />
                        </div>
                        {errors.street && <p className="mt-1 text-sm text-red-500">{errors.street.message}</p>}
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {lang === 'de' ? 'PLZ' : 'Postal Code'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('zip', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                              ${errors.zip ? 'border-red-400' : 'border-gray-200'}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {lang === 'de' ? 'Stadt' : 'City'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('city', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                              ${errors.city ? 'border-red-400' : 'border-gray-200'}`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {lang === 'de' ? 'Land' : 'Country'} <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register('country', { required: true })}
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl
                            focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                        >
                          {Object.entries(appConfig.countries).map(([code, data]) => (
                            <option key={code} value={code}>{data.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          IBAN <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            {...register('iban', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={`w-full pl-12 pr-4 py-3 bg-gray-50 border-2 rounded-xl
                              focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100
                              ${errors.iban ? 'border-red-400' : 'border-gray-200'}`}
                            placeholder="DE89 3704 0044 0532 0130 00"
                          />
                        </div>
                        {errors.iban && <p className="mt-1 text-sm text-red-500">{errors.iban.message}</p>}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        {lang === 'de' ? 'Dokumente' : 'Documents'}
                      </h2>

                      <div className="bg-teal-50 rounded-xl p-4 mb-6 border border-teal-100">
                        <p className="text-sm text-teal-700">
                          {lang === 'de' 
                            ? 'Bitte laden Sie die erforderlichen Dokumente hoch. Unterstützte Formate: JPG, PNG, PDF.'
                            : 'Please upload the required documents. Supported formats: JPG, PNG, PDF.'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {lang === 'de' ? 'Ausweis/Reisepass' : 'ID/Passport'} <span className="text-red-500">*</span>
                        </label>
                        <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                          transition-all hover:border-teal-400 hover:bg-teal-50
                          ${uploadedFiles.passport ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                        >
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload('passport', e)}
                            className="hidden"
                            id="passport-upload"
                          />
                          <label htmlFor="passport-upload" className="cursor-pointer">
                            {uploadedFiles.passport ? (
                              <div className="flex items-center justify-center gap-2 text-green-600">
                                <Check className="w-6 h-6" />
                                <span>{uploadedFiles.passport.name}</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-600">
                                  {lang === 'de' ? 'Klicken oder Datei hierher ziehen' : 'Click or drag file here'}
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {lang === 'de' ? 'Bankkarte' : 'Bank Card'}
                        </label>
                        <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                          transition-all hover:border-teal-400 hover:bg-teal-50
                          ${uploadedFiles.bankCard ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                        >
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload('bankCard', e)}
                            className="hidden"
                            id="bankcard-upload"
                          />
                          <label htmlFor="bankcard-upload" className="cursor-pointer">
                            {uploadedFiles.bankCard ? (
                              <div className="flex items-center justify-center gap-2 text-green-600">
                                <Check className="w-6 h-6" />
                                <span>{uploadedFiles.bankCard.name}</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-600">
                                  {lang === 'de' ? 'Klicken oder Datei hierher ziehen' : 'Click or drag file here'}
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {lang === 'de' ? 'Gewerbeschein (optional)' : 'Trade License (optional)'}
                        </label>
                        <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                          transition-all hover:border-teal-400 hover:bg-teal-50
                          ${uploadedFiles.tradeLicense ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                        >
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileUpload('tradeLicense', e)}
                            className="hidden"
                            id="license-upload"
                          />
                          <label htmlFor="license-upload" className="cursor-pointer">
                            {uploadedFiles.tradeLicense ? (
                              <div className="flex items-center justify-center gap-2 text-green-600">
                                <Check className="w-6 h-6" />
                                <span>{uploadedFiles.tradeLicense.name}</span>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                                <p className="text-gray-600">
                                  {lang === 'de' ? 'Klicken oder Datei hierher ziehen' : 'Click or drag file here'}
                                </p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        {lang === 'de' ? 'Bestätigung' : 'Confirmation'}
                      </h2>

                      <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name</span>
                          <span className="font-medium">{watch('firstName')} {watch('lastName')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{lang === 'de' ? 'E-Mail' : 'Email'}</span>
                          <span className="font-medium">{watch('email')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{lang === 'de' ? 'Land' : 'Country'}</span>
                          <span className="font-medium">{appConfig.countries[watch('country')]?.name}</span>
                        </div>
                        <hr />
                        <div className="flex justify-between text-lg">
                          <span className="font-semibold">{lang === 'de' ? 'Jahresgebühr' : 'Annual Fee'}</span>
                          <span className="font-bold text-teal-600">{formatCurrency(partnerFee)}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('acceptTerms', { required: true })}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-600">
                            {lang === 'de' ? 'Ich akzeptiere die' : 'I accept the'}{' '}
                            <Link to="/agb" target="_blank" className="text-teal-600 hover:underline">
                              {lang === 'de' ? 'Partnerbedingungen' : 'Partner Terms'}
                            </Link>{' '}
                            {lang === 'de' ? 'und' : 'and'}{' '}
                            <Link to="/datenschutz" target="_blank" className="text-teal-600 hover:underline">
                              {lang === 'de' ? 'Datenschutzerklärung' : 'Privacy Policy'}
                            </Link>
                          </span>
                        </label>
                        {errors.acceptTerms && (
                          <p className="text-sm text-red-500">
                            {lang === 'de' ? 'Bitte akzeptieren Sie die Bedingungen' : 'Please accept the terms'}
                          </p>
                        )}

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('acceptWithdrawal')}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-600">
                            {lang === 'de' 
                              ? 'Ich verzichte ausdrücklich auf mein 14-tägiges Widerrufsrecht und möchte sofort starten'
                              : 'I expressly waive my 14-day right of withdrawal and want to start immediately'}
                          </span>
                        </label>
                      </div>

                      <div className="bg-teal-50 rounded-2xl p-6 border border-teal-100">
                        <div className="flex items-center gap-3 mb-4">
                          <Shield className="w-8 h-8 text-teal-600" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {lang === 'de' ? 'Sichere Zahlung' : 'Secure Payment'}
                            </p>
                            <p className="text-sm text-gray-600">Powered by Stripe</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          {lang === 'de' 
                            ? 'Nach Absenden werden Sie zur sicheren Zahlungsseite weitergeleitet.'
                            : 'After submission, you will be redirected to the secure payment page.'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
                  {step > 1 ? (
                    <Button type="button" variant="ghost" onClick={prevStep} icon={ArrowLeft}>
                      {lang === 'de' ? 'Zurück' : 'Back'}
                    </Button>
                  ) : (
                    <Link to="/">
                      <Button type="button" variant="ghost" icon={ArrowLeft}>
                        {lang === 'de' ? 'Zurück' : 'Back'}
                      </Button>
                    </Link>
                  )}

                  {step < 4 ? (
                    <Button type="button" onClick={nextStep} icon={ArrowRight} iconPosition="right">
                      {lang === 'de' ? 'Weiter' : 'Next'}
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      isLoading={isLoading}
                      icon={Check}
                    >
                      {lang === 'de' ? 'Jetzt registrieren' : 'Register Now'} ({formatCurrency(partnerFee)})
                    </Button>
                  )}
                </div>
              </form>

              <p className="mt-8 text-center text-gray-600">
                {lang === 'de' ? 'Bereits Partner?' : 'Already a partner?'}{' '}
                <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
                  {lang === 'de' ? 'Jetzt anmelden' : 'Sign in now'}
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerRegisterPage;