import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import {
  User, Building, Upload, Check, ArrowRight, ArrowLeft,
  Mail, Phone, MapPin, CreditCard, Shield,
  Clock, BookOpen, Users, Award, Heart, Briefcase, GraduationCap, Package
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useBrand } from '../../context/BrandContext';
import appConfig, { calculatePartnerFee, formatCurrency } from '../../config/app.config';
import toast from 'react-hot-toast';

const PartnerRegisterPage = () => {
  const { lang } = useLanguage();
  const { companyName } = useBrand();
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

  const { register, handleSubmit, watch, formState: { errors }, trigger, setError } = useForm({
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
    { icon: Briefcase, text: lang === 'de' ? 'Eigenes Business' : 'Own Business' },
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
      // DE affiliates must have VAT UID (#28)
      const country = watch('country');
      if (country === 'DE') {
        fieldsToValidate.push('vatId');
      }
    }
    
    const isValid = await trigger(fieldsToValidate);
    
    // Additional check: DE affiliates need VAT ID
    if (step === 2 && watch('country') === 'DE' && !watch('vatId')) {
      setError('vatId', { 
        type: 'required', 
        message: lang === 'de' 
          ? 'Deutsche Partner benoetigen eine USt-IdNr.' 
          : 'German affiliates require a VAT ID' 
      });
      return;
    }
    
    if (isValid) setStep(s => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'acceptTerms') {
            formData.append('termsAccepted', value ? 'true' : 'false');
          } else if (key === 'acceptPrivacy' || key === 'acceptFee' || key === 'acceptWithdrawal') {
            // Don't send these to server - not needed
          } else if (key === 'iban') {
            formData.append(key, String(value).replace(/\s/g, '').toUpperCase());
          } else {
            formData.append(key, value);
          }
        }
      });
      
      if (uploadedFiles.passport) formData.append('passport', uploadedFiles.passport);
      if (uploadedFiles.bankCard) formData.append('bankCard', uploadedFiles.bankCard);
      if (uploadedFiles.tradeLicense) formData.append('tradeLicense', uploadedFiles.tradeLicense);

      const { authAPI } = await import('../../services/api');
      const registerResponse = await authAPI.register(formData);
      const registeredUser = registerResponse.data?.user;

      // Create Stripe checkout for partner fee
      toast.success(lang === 'de' 
        ? 'Registrierung erfolgreich! Weiterleitung zur Zahlung...' 
        : 'Registration successful! Redirecting to payment...');

      try {
        const api = (await import('../../services/api')).default;
        const checkoutRes = await api.post('/partner/fee-checkout', {
          partnerId: registeredUser?.id,
          partnerEmail: data.email,
        });
        
        if (checkoutRes.data?.url) {
          // Redirect to Stripe Checkout
          window.location.href = checkoutRes.data.url;
          return;
        }
      } catch (stripeErr) {
        console.error('Stripe checkout error:', stripeErr);
        // If Stripe fails, still let them go to login
        toast.error(lang === 'de'
          ? 'Zahlung konnte nicht gestartet werden. Bitte kontaktieren Sie den Support.'
          : 'Payment could not be initiated. Please contact support.');
      }

      navigate('/login');
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.data?.details) {
        const errorMessages = error.response.data.details
          .map(e => e.message)
          .join('\n');
        toast.error(errorMessages || 'Registrierung fehlgeschlagen');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(lang === 'de' 
          ? 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.' 
          : 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError) => `
    w-full px-4 py-3.5 bg-slate-50 border-2 rounded-xl transition-all
    focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100
    ${hasError ? 'border-red-400' : 'border-gray-200'}
  `;

  const inputWithIconClass = (hasError) => `
    w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 rounded-xl transition-all
    focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-4 focus:ring-primary-100
    ${hasError ? 'border-red-400' : 'border-gray-200'}
  `;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          
          {/* Left Sidebar - NO COMMISSION RATES */}
          <div className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-8"
            >
              <h1 className="text-3xl font-bold text-secondary-700 mb-4">
                {lang === 'de' ? 'Partner werden' : 'Become a Partner'}
              </h1>
              <p className="text-secondary-500 mb-8">
                {lang === 'de' 
                  ? 'Starten Sie Ihre Karriere mit uns und bauen Sie Ihr eigenes Geschäft auf.'
                  : 'Start your career with us and build your own business.'}
              </p>

              {/* Benefits - Charcoal cards */}
              <div className="space-y-4 mb-8">
                {benefits.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-4 bg-secondary-700 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-lg bg-secondary-600 flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-primary-400" />
                    </div>
                    <span className="font-medium text-white">{benefit.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Career Benefits Card - NO COMMISSION RATES */}
              <div className="bg-secondary-700 rounded-2xl p-6">
                <h3 className="font-semibold text-lg mb-4 text-white">
                  {lang === 'de' ? 'Ihre Vorteile' : 'Your Benefits'}
                </h3>
                <div className="space-y-4">
                  {[
                    { icon: Award, title: lang === 'de' ? '6 Karrierestufen' : '6 Career Levels', desc: lang === 'de' ? 'Wachsen Sie mit uns' : 'Grow with us' },
                    { icon: Heart, title: lang === 'de' ? 'Premium Produkte' : 'Premium Products', desc: lang === 'de' ? 'Produkte die begeistern' : 'Products that inspire' },
                    { icon: GraduationCap, title: lang === 'de' ? 'CLYR Academy' : 'CLYR Academy', desc: lang === 'de' ? 'Umfassende Schulungen' : 'Comprehensive training' },
                    { icon: Users, title: lang === 'de' ? 'Starke Community' : 'Strong Community', desc: lang === 'de' ? 'Teil eines wachsenden Teams' : 'Part of a growing team' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary-600 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-sm text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
            >
              {/* Step Indicator - Charcoal active */}
              <div className="flex items-center justify-between mb-8">
                {steps.map((s, i) => (
                  <div key={s.id} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                      ${step >= s.id ? 'bg-secondary-700 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {step > s.id ? <Check className="w-5 h-5" /> : s.id}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`hidden sm:block w-16 h-1 mx-2 rounded transition-all
                        ${step > s.id ? 'bg-secondary-700' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">
                  
                  {/* Step 1: Personal Info */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold text-secondary-700 mb-6">
                        {lang === 'de' ? 'Persönliche Daten' : 'Personal Information'}
                      </h2>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          {lang === 'de' ? 'Empfehlungscode' : 'Referral Code'}
                        </label>
                        <input
                          {...register('referralCode')}
                          className={inputClass(false)}
                          placeholder="ABC123"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {lang === 'de' ? 'Vorname' : 'First Name'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('firstName', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={inputClass(errors.firstName)}
                          />
                          {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {lang === 'de' ? 'Nachname' : 'Last Name'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('lastName', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={inputClass(errors.lastName)}
                          />
                          {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
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
                            className={inputWithIconClass(errors.email)}
                          />
                        </div>
                        {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          {lang === 'de' ? 'Telefon' : 'Phone'} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="tel"
                            {...register('phone', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={inputWithIconClass(errors.phone)}
                            placeholder="+49 123 456 7890"
                          />
                        </div>
                        {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
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
                          className={inputClass(errors.password)}
                        />
                        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
                        <p className="mt-1 text-xs text-secondary-500">
                          {lang === 'de' 
                            ? 'Mind. 8 Zeichen, Groß- und Kleinbuchstaben, eine Zahl' 
                            : 'Min. 8 chars, uppercase, lowercase, one number'}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Business Info */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold text-secondary-700 mb-6">
                        {lang === 'de' ? 'Geschäftsdaten' : 'Business Information'}
                      </h2>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {lang === 'de' ? 'Firma (optional)' : 'Company (optional)'}
                          </label>
                          <input {...register('company')} className={inputClass(false)} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {lang === 'de' ? 'USt-IdNr.' : 'VAT ID'}
                            {watch('country') === 'DE' && <span className="text-red-500"> *</span>}
                            {watch('country') !== 'DE' && <span className="text-secondary-400 text-xs ml-1">({lang === 'de' ? 'optional' : 'optional'})</span>}
                          </label>
                          <input {...register('vatId')} className={inputClass(errors.vatId)} placeholder="DE123456789" />
                          {errors.vatId && <p className="mt-1 text-sm text-red-500">{errors.vatId.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          {lang === 'de' ? 'Straße und Hausnummer' : 'Street Address'} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            {...register('street', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={inputWithIconClass(errors.street)}
                          />
                        </div>
                        {errors.street && <p className="mt-1 text-sm text-red-500">{errors.street.message}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {lang === 'de' ? 'PLZ' : 'Postal Code'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('zip', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={inputClass(errors.zip)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {lang === 'de' ? 'Stadt' : 'City'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            {...register('city', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={inputClass(errors.city)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          {lang === 'de' ? 'Land' : 'Country'} <span className="text-red-500">*</span>
                        </label>
                        <select
                          {...register('country', { required: true })}
                          className={inputClass(false)}
                        >
                          {Object.entries(appConfig.countries).map(([code, data]) => (
                            <option key={code} value={code}>{data.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          IBAN <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            {...register('iban', { required: lang === 'de' ? 'Pflichtfeld' : 'Required' })}
                            className={inputWithIconClass(errors.iban)}
                            placeholder="DE89 3704 0044 0532 0130 00"
                          />
                        </div>
                        {errors.iban && <p className="mt-1 text-sm text-red-500">{errors.iban.message}</p>}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Documents */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold text-secondary-700 mb-6">
                        {lang === 'de' ? 'Dokumente' : 'Documents'}
                      </h2>

                      <div className="bg-secondary-700 rounded-xl p-4 mb-6">
                        <p className="text-sm text-gray-300">
                          {lang === 'de' 
                            ? 'Bitte laden Sie die erforderlichen Dokumente hoch. Unterstützte Formate: JPG, PNG, PDF.'
                            : 'Please upload the required documents. Supported formats: JPG, PNG, PDF.'}
                        </p>
                      </div>

                      {[
                        { field: 'passport', label: lang === 'de' ? 'Ausweis/Reisepass' : 'ID/Passport', required: true },
                        { field: 'bankCard', label: lang === 'de' ? 'Bankkarte' : 'Bank Card', required: false },
                        { field: 'tradeLicense', label: lang === 'de' ? 'Gewerbeschein (optional)' : 'Trade License (optional)', required: false },
                      ].map((doc) => (
                        <div key={doc.field}>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            {doc.label} {doc.required && <span className="text-red-500">*</span>}
                          </label>
                          <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                            hover:border-primary-400 hover:bg-primary-50
                            ${uploadedFiles[doc.field] ? 'border-green-400 bg-green-50' : 'border-gray-300'}`}
                          >
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload(doc.field, e)}
                              className="hidden"
                              id={`${doc.field}-upload`}
                            />
                            <label htmlFor={`${doc.field}-upload`} className="cursor-pointer">
                              {uploadedFiles[doc.field] ? (
                                <div className="flex items-center justify-center gap-2 text-green-600">
                                  <Check className="w-6 h-6" />
                                  <span>{uploadedFiles[doc.field].name}</span>
                                </div>
                              ) : (
                                <>
                                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                                  <p className="text-secondary-500">
                                    {lang === 'de' ? 'Klicken oder Datei hierher ziehen' : 'Click or drag file here'}
                                  </p>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Step 4: Confirmation - NO COMMISSION RATES */}
                  {step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h2 className="text-2xl font-bold text-secondary-700 mb-6">
                        {lang === 'de' ? 'Bestätigung' : 'Confirmation'}
                      </h2>

                      {/* Summary Card */}
                      <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between">
                          <span className="text-secondary-500">Name</span>
                          <span className="font-medium text-secondary-700">{watch('firstName')} {watch('lastName')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary-500">{lang === 'de' ? 'E-Mail' : 'Email'}</span>
                          <span className="font-medium text-secondary-700">{watch('email')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary-500">{lang === 'de' ? 'Land' : 'Country'}</span>
                          <span className="font-medium text-secondary-700">{appConfig.countries[watch('country')]?.name}</span>
                        </div>
                        <hr />
                        <div className="flex justify-between text-lg">
                          <span className="font-semibold text-secondary-700">{lang === 'de' ? 'Jahresgebühr' : 'Annual Fee'}</span>
                          <span className="font-bold text-secondary-700">{formatCurrency(partnerFee)}</span>
                        </div>
                      </div>

                      {/* Terms (#40: VP_Vertrag agreement) */}
                      <div className="space-y-4">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('acceptTerms', { required: true })}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-secondary-700 focus:ring-primary-400"
                          />
                          <span className="text-sm text-secondary-500">
                            {lang === 'de' ? 'Ich akzeptiere den' : 'I accept the'}{' '}
                            <Link to="/partner-terms" target="_blank" className="text-secondary-700 hover:text-primary-500 font-medium">
                              {lang === 'de' ? 'Vertriebspartner-Vertrag (VP-Vertrag)' : 'Distribution Partner Agreement'}
                            </Link>{' '}
                            {lang === 'de' ? 'und die' : 'and the'}{' '}
                            <Link to="/terms" target="_blank" className="text-secondary-700 hover:text-primary-500 font-medium">
                              {lang === 'de' ? 'Allgemeinen Geschäftsbedingungen' : 'General Terms'}
                            </Link>
                          </span>
                        </label>
                        {errors.acceptTerms && (
                          <p className="text-sm text-red-500">
                            {lang === 'de' ? 'Bitte akzeptieren Sie den VP-Vertrag' : 'Please accept the partner agreement'}
                          </p>
                        )}

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('acceptPrivacy', { required: true })}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-secondary-700 focus:ring-primary-400"
                          />
                          <span className="text-sm text-secondary-500">
                            {lang === 'de' ? 'Ich akzeptiere die' : 'I accept the'}{' '}
                            <Link to="/privacy" target="_blank" className="text-secondary-700 hover:text-primary-500 font-medium">
                              {lang === 'de' ? 'Datenschutzerklaerung' : 'Privacy Policy'}
                            </Link>
                          </span>
                        </label>
                        {errors.acceptPrivacy && (
                          <p className="text-sm text-red-500">
                            {lang === 'de' ? 'Bitte akzeptieren Sie die Datenschutzerklaerung' : 'Please accept the privacy policy'}
                          </p>
                        )}

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('acceptFee')}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-secondary-700 focus:ring-primary-400"
                          />
                          <span className="text-sm text-secondary-500">
                            {lang === 'de' 
                              ? 'Ich bin mit der jaehrlichen Intranet-Gebuehr von 100,00 EUR einverstanden (anteilig ab Registrierungsmonat).'
                              : 'I agree to the annual intranet fee of EUR 100.00 (prorated from registration month).'}
                          </span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('acceptWithdrawal')}
                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-secondary-700 focus:ring-primary-400"
                          />
                          <span className="text-sm text-secondary-500">
                            {lang === 'de' 
                              ? 'Ich verzichte ausdrücklich auf mein 14-tägiges Widerrufsrecht und möchte sofort starten'
                              : 'I expressly waive my 14-day right of withdrawal and want to start immediately'}
                          </span>
                        </label>
                      </div>

                      {/* Payment Info - Charcoal Card */}
                      <div className="bg-secondary-700 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-secondary-600 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-primary-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">
                              {lang === 'de' ? 'Sichere Zahlung' : 'Secure Payment'}
                            </p>
                            <p className="text-sm text-gray-400">Powered by Stripe</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300">
                          {lang === 'de' 
                            ? 'Nach Absenden werden Sie zur sicheren Zahlungsseite weitergeleitet.'
                            : 'After submission, you will be redirected to the secure payment page.'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons - Charcoal */}
                <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex items-center gap-2 px-6 py-3 text-secondary-700 font-medium hover:text-primary-500 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      {lang === 'de' ? 'Zurück' : 'Back'}
                    </button>
                  ) : (
                    <Link to="/" className="flex items-center gap-2 px-6 py-3 text-secondary-700 font-medium hover:text-primary-500 transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                      {lang === 'de' ? 'Zurück' : 'Back'}
                    </Link>
                  )}

                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center gap-2 px-8 py-3 bg-secondary-700 text-white font-semibold rounded-xl hover:bg-secondary-800 transition-all"
                    >
                      {lang === 'de' ? 'Weiter' : 'Next'}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center gap-2 px-8 py-3 bg-secondary-700 text-white font-semibold rounded-xl hover:bg-secondary-800 transition-all disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          {lang === 'de' ? 'Jetzt registrieren' : 'Register Now'} ({formatCurrency(partnerFee)})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              {/* Login Link */}
              <p className="mt-8 text-center text-secondary-500">
                {lang === 'de' ? 'Bereits Partner?' : 'Already a partner?'}{' '}
                <Link to="/login" className="text-secondary-700 hover:text-primary-500 font-semibold">
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