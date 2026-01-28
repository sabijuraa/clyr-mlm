import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useBrand } from '../../context/BrandContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
  const { companyName, logoUrl } = useBrand();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setIsSubmitted(true);
      toast.success('E-Mail wurde gesendet!');
    } catch (error) {
      // Always show success to prevent email enumeration
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-white flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoUrl} alt={companyName} className="h-10 w-auto" />
            <span className="font-heading font-bold text-xl text-gray-900">
              {companyName}
            </span>
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
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-100 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-teal-600" />
                  </div>
                  <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">
                    Passwort vergessen?
                  </h1>
                  <p className="text-gray-600">
                    Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    label="E-Mail-Adresse"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ihre@email.de"
                    required
                    icon={Mail}
                  />

                  <Button type="submit" className="w-full" isLoading={isLoading}>
                    Link senden
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link to="/login" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium">
                    <ArrowLeft className="w-4 h-4" />
                    Zurück zur Anmeldung
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-heading font-bold text-gray-900 mb-2">
                  E-Mail gesendet!
                </h2>
                <p className="text-gray-600 mb-6">
                  Wenn ein Konto mit dieser E-Mail existiert, erhalten Sie in Kürze einen Link zum Zurücksetzen.
                </p>
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Zurück zur Anmeldung
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
