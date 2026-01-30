/**
 * Customer Login Page
 * For existing customers to access their order history and subscriptions
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Package, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const CustomerLoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const endpoint = isLogin ? '/api/customer/login' : '/api/customer/register';
      
      if (!isLogin && formData.password !== formData.confirmPassword) {
        toast.error('Passwörter stimmen nicht überein');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ein Fehler ist aufgetreten');
      }
      
      if (isLogin) {
        localStorage.setItem('customerToken', data.token);
        localStorage.setItem('customerData', JSON.stringify(data.customer));
        toast.success('Erfolgreich angemeldet!');
        navigate('/customer/dashboard');
      } else {
        toast.success('Konto erstellt! Bitte bestätigen Sie Ihre E-Mail-Adresse.');
        setIsLogin(true);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
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
        
        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                  placeholder="ihre@email.de"
                />
              </div>
            </div>
            
            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            {/* Confirm Password (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Passwort bestätigen
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
            
            {/* Forgot Password Link */}
            {isLogin && (
              <div className="text-right">
                <Link to="/customer/forgot-password" className="text-sm text-primary-500 hover:underline">
                  Passwort vergessen?
                </Link>
              </div>
            )}
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary-700 hover:bg-secondary-800 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Anmelden' : 'Konto erstellen'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
          
          {/* Toggle Login/Register */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-secondary-600 hover:text-secondary-700"
            >
              {isLogin ? (
                <>Noch kein Konto? <span className="text-primary-500 font-medium">Jetzt registrieren</span></>
              ) : (
                <>Bereits ein Konto? <span className="text-primary-500 font-medium">Anmelden</span></>
              )}
            </button>
          </div>
        </div>
        
        {/* Features */}
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
        
        {/* Back to Shop */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-secondary-500 hover:text-secondary-700 text-sm">
            ← Zurück zum Shop
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerLoginPage;
