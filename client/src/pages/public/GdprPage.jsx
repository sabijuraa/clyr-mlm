/**
 * GDPR Request Page
 * Data export and deletion requests
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Download, Trash2, Mail, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const GdprPage = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'export';
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Bitte E-Mail-Adresse eingeben');
      return;
    }
    
    setLoading(true);
    
    try {
      const endpoint = type === 'delete' 
        ? '/gdpr/delete-request' 
        : '/gdpr/export-request';
      
      await api.post(endpoint, { email, reason });
      
      setSuccess(true);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };
  
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-secondary-700 mb-2">Anfrage gesendet</h2>
          <p className="text-secondary-500 mb-6">
            Wenn die E-Mail-Adresse in unserem System existiert, erhalten Sie eine 
            Bestätigungs-E-Mail mit weiteren Anweisungen.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-secondary-700 text-white rounded-xl hover:bg-secondary-800 transition-colors"
          >
            Zur Startseite
          </Link>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img src="/images/clyr-logo.png" alt="CLYR" className="h-12 mx-auto" />
          </Link>
          
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
            type === 'delete' ? 'bg-red-100' : 'bg-primary-100'
          }`}>
            {type === 'delete' ? (
              <Trash2 className="w-8 h-8 text-red-500" />
            ) : (
              <Download className="w-8 h-8 text-primary-500" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-secondary-700">
            {type === 'delete' ? 'Datenlöschung anfordern' : 'Daten exportieren'}
          </h1>
          <p className="text-secondary-500 mt-2">
            {type === 'delete' 
              ? 'Fordern Sie die Löschung Ihrer persönlichen Daten an'
              : 'Fordern Sie eine Kopie Ihrer gespeicherten Daten an'}
          </p>
        </div>
        
        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {type === 'delete' && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 text-sm">Wichtiger Hinweis</p>
                  <p className="text-red-600 text-sm mt-1">
                    Die Löschung Ihrer Daten kann nicht rückgängig gemacht werden. 
                    Einige Daten müssen aus rechtlichen Gründen anonymisiert aufbewahrt werden.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                  placeholder="ihre@email.de"
                />
              </div>
              <p className="text-xs text-secondary-500 mt-1">
                Geben Sie die E-Mail-Adresse ein, die mit Ihrem Konto verknüpft ist
              </p>
            </div>
            
            {type === 'delete' && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Grund (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-secondary-700 focus:ring-4 focus:ring-secondary-100 transition-all"
                  rows={3}
                  placeholder="Warum möchten Sie Ihre Daten löschen?"
                />
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                type === 'delete'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-secondary-700 hover:bg-secondary-800 text-white'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {type === 'delete' ? <Trash2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                  {type === 'delete' ? 'Löschung anfordern' : 'Export anfordern'}
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* Info */}
        <div className="mt-6 bg-secondary-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-secondary-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-secondary-600">
              <p className="font-medium">Ihre Rechte nach DSGVO</p>
              <p className="mt-1">
                Gemäß der Datenschutz-Grundverordnung haben Sie das Recht auf Auskunft, 
                Berichtigung, Löschung und Datenübertragbarkeit Ihrer personenbezogenen Daten.
              </p>
            </div>
          </div>
        </div>
        
        {/* Toggle */}
        <div className="mt-6 text-center">
          {type === 'delete' ? (
            <Link to="/gdpr?type=export" className="text-primary-500 hover:underline text-sm">
              Stattdessen Daten exportieren
            </Link>
          ) : (
            <Link to="/gdpr?type=delete" className="text-red-500 hover:underline text-sm">
              Stattdessen Daten löschen
            </Link>
          )}
        </div>
        
        <div className="mt-4 text-center">
          <Link to="/" className="text-secondary-500 hover:text-secondary-700 text-sm">
            ← Zurück zur Startseite
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default GdprPage;
