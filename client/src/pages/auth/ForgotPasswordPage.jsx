import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useBrand } from '../../context/BrandContext';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
  const { companyName } = useBrand();
  const { lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setIsSubmitted(true);
      toast.success(lang === 'de' ? 'E-Mail wurde gesendet!' : 'Email sent!');
    } catch (error) {
      // Always show success to prevent email enumeration
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/clyr-logo.png" alt={companyName} className="h-10 w-auto" />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl shadow-xl p-8">
            {!isSubmitted ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary-700 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-primary-400" />
                  </div>
                  <h1 className="text-2xl font-heading font-bold text-secondary-700 mb-2">
                    {lang === 'de' ? 'Passwort vergessen?' : 'Forgot Password?'}
                  </h1>
                  <p className="text-secondary-500">
                    {lang === 'de' 
                      ? 'Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.'
                      : 'Enter your email address and we will send you a reset link.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    label={lang === 'de' ? 'E-Mail-Adresse' : 'Email Address'}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={lang === 'de' ? 'ihre@email.de' : 'your@email.com'}
                    required
                    icon={Mail}
                  />

                  <Button type="submit" className="w-full" isLoading={isLoading}>
                    {lang === 'de' ? 'Link senden' : 'Send Link'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="inline-flex items-center gap-2 text-secondary-700 hover:text-primary-500 font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    {lang === 'de' ? 'Zurück zur Anmeldung' : 'Back to Login'}
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-heading font-bold text-secondary-700 mb-2">
                  {lang === 'de' ? 'E-Mail gesendet!' : 'Email Sent!'}
                </h2>
                <p className="text-secondary-500 mb-6">
                  {lang === 'de' 
                    ? 'Wenn ein Konto mit dieser E-Mail existiert, erhalten Sie in Kürze einen Link zum Zurücksetzen.'
                    : 'If an account with this email exists, you will receive a reset link shortly.'}
                </p>
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    {lang === 'de' ? 'Zurück zur Anmeldung' : 'Back to Login'}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
