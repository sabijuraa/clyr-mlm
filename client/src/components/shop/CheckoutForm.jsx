import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building, MapPin, CreditCard, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import appConfig from '../../config/app.config';
import Input from '../common/Input';
import Button from '../common/Button';

const CheckoutForm = ({ onSubmit, isProcessing }) => {
  const { t } = useLanguage();
  const { country, setCountry, hasVatId, setHasVatId } = useCart();
  const [sameAddress, setSameAddress] = useState(true);
  const [step, setStep] = useState(1);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      country: country
    }
  });

  const watchVatId = watch('vatId');

  // Update hasVatId when VAT ID changes
  if (!!watchVatId !== hasVatId) {
    setHasVatId(!!watchVatId);
  }

  const steps = [
    { id: 1, label: t('checkout.billing'), icon: User },
    { id: 2, label: t('checkout.payment'), icon: CreditCard },
    { id: 3, label: 'Confirmation', icon: Check },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Progress Steps - Charcoal styling */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
              ${step >= s.id 
                ? 'bg-secondary-700 text-white' 
                : 'bg-secondary-100 text-secondary-400'}
            `}>
              {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
            </div>
            <span className={`ml-3 font-medium hidden sm:block ${step >= s.id ? 'text-secondary-700' : 'text-secondary-400'}`}>
              {s.label}
            </span>
            {idx < steps.length - 1 && (
              <div className={`w-12 sm:w-24 h-1 mx-4 rounded-full ${step > s.id ? 'bg-primary-500' : 'bg-secondary-200'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Billing Address */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-secondary-100 p-6">
              <h3 className="font-heading font-semibold text-lg text-secondary-700 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-500" />
                {t('checkout.billing')}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('form.firstName')}
                  required
                  {...register('firstName', { required: t('validation.required') })}
                  error={errors.firstName?.message}
                />
                <Input
                  label={t('form.lastName')}
                  required
                  {...register('lastName', { required: t('validation.required') })}
                  error={errors.lastName?.message}
                />
              </div>

              <div className="mt-4">
                <Input
                  label={t('form.email')}
                  type="email"
                  required
                  {...register('email', { 
                    required: t('validation.required'),
                    pattern: { value: /^\S+@\S+$/i, message: t('validation.email') }
                  })}
                  error={errors.email?.message}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label={t('form.company')}
                  {...register('company')}
                  icon={Building}
                />
                <Input
                  label={t('form.vatId')}
                  {...register('vatId')}
                  hint="For business customers / Reverse Charge"
                />
              </div>

              <div className="mt-4">
                <Input
                  label={t('form.street')}
                  required
                  {...register('street', { required: t('validation.required') })}
                  error={errors.street?.message}
                  icon={MapPin}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <Input
                  label={t('form.zip')}
                  required
                  {...register('zip', { required: t('validation.required') })}
                  error={errors.zip?.message}
                />
                <Input
                  label={t('form.city')}
                  required
                  className="col-span-1 md:col-span-2"
                  {...register('city', { required: t('validation.required') })}
                  error={errors.city?.message}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  {t('form.country')} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('country', { required: true })}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-secondary-200 rounded-xl text-secondary-700
                    focus:outline-none focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100"
                >
                  {Object.entries(appConfig.countries).map(([code, data]) => (
                    <option key={code} value={code}>{data.name}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <Input
                  label={t('form.phone')}
                  type="tel"
                  {...register('phone')}
                />
              </div>
            </div>

            {/* Shipping Address Toggle */}
            <div className="bg-white rounded-2xl border border-secondary-100 p-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAddress}
                  onChange={(e) => setSameAddress(e.target.checked)}
                  className="w-5 h-5 rounded border-secondary-300 text-secondary-700 focus:ring-secondary-500"
                />
                <span className="font-medium text-secondary-700">{t('checkout.sameAddress')}</span>
              </label>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setStep(2)}
            >
              {t('common.next')}
            </Button>
          </motion.div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-secondary-100 p-6">
              <h3 className="font-heading font-semibold text-lg text-secondary-700 mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-500" />
                {t('checkout.payment')}
              </h3>

              {/* Payment Methods */}
              <div className="space-y-3">
                <label className="flex items-center gap-4 p-4 border-2 border-secondary-700 rounded-xl bg-secondary-50 cursor-pointer">
                  <input
                    type="radio"
                    value="card"
                    defaultChecked
                    {...register('paymentMethod')}
                    className="w-5 h-5 text-secondary-700"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-secondary-700">Credit Card</span>
                    <p className="text-sm text-secondary-500">Visa, Mastercard, American Express</p>
                  </div>
                  <div className="flex gap-2">
                    <img src="/visa.svg" alt="Visa" className="h-8" />
                    <img src="/mastercard.svg" alt="Mastercard" className="h-8" />
                  </div>
                </label>

                <label className="flex items-center gap-4 p-4 border-2 border-secondary-200 rounded-xl hover:border-secondary-300 cursor-pointer">
                  <input
                    type="radio"
                    value="sepa"
                    {...register('paymentMethod')}
                    className="w-5 h-5 text-secondary-700"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-secondary-700">SEPA Direct Debit</span>
                    <p className="text-sm text-secondary-500">Directly from your bank account</p>
                  </div>
                  <img src="/sepa.svg" alt="SEPA" className="h-8" />
                </label>
              </div>

              {/* Card Details Placeholder */}
              <div className="mt-6 p-4 bg-secondary-50 rounded-xl border-2 border-dashed border-secondary-200">
                <p className="text-sm text-secondary-500 text-center">
                  Stripe payment form loads here
                </p>
              </div>
            </div>

            {/* Terms */}
            <div className="bg-white rounded-2xl border border-secondary-100 p-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  {...register('acceptTerms', { required: true })}
                  className="w-5 h-5 mt-0.5 rounded border-secondary-300 text-secondary-700 focus:ring-secondary-500"
                />
                <span className="text-sm text-secondary-600">
                  I accept the{' '}
                  <a href="/terms" target="_blank" className="text-primary-500 hover:underline">Terms & Conditions</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" className="text-primary-500 hover:underline">Privacy Policy</a>
                </span>
              </label>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => setStep(1)}
              >
                {t('common.back')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                isLoading={isProcessing}
              >
                {isProcessing ? t('checkout.processing') : t('checkout.placeOrder')}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
};

export default CheckoutForm;
