// client/src/pages/dashboard/ProfilePage.jsx
// GROUP 6 #8: Fix partner profile page - add actual form fields for all tabs
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, MapPin, CreditCard, Lock, Save, Camera, Building, Globe, Copy, Check, Edit3, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [newCode, setNewCode] = useState(user?.referralCode || user?.referral_code || '');

  const getDefaults = (u) => ({
    firstName: u?.firstName || u?.first_name || '',
    lastName: u?.lastName || u?.last_name || '',
    email: u?.email || '',
    phone: u?.phone || '',
    company: u?.company || '',
    vatId: u?.vatId || u?.vat_id || '',
    street: u?.street || '',
    zip: u?.zip || '',
    city: u?.city || '',
    country: u?.country || 'AT',
    iban: u?.iban || '',
    bic: u?.bic || '',
    bankName: u?.bankName || u?.bank_name || '',
    accountHolder: u?.accountHolder || u?.account_holder || '',
  });

  const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm({
    defaultValues: getDefaults(user)
  });

  // Reset form when user data changes (e.g. after login loads user)
  useEffect(() => {
    if (user) {
      reset(getDefaults(user));
    }
  }, [user, reset]);

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await api.put('/auth/update-profile', data);
      const updatedUser = response.data.user || { ...user, ...data };
      if (updateUser) updateUser(updatedUser);
      reset(getDefaults(updatedUser));
      toast.success('Profil erfolgreich aktualisiert!');
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('Passwoerter stimmen nicht ueberein');
    }
    if (passwordData.newPassword.length < 8) {
      return toast.error('Passwort muss mindestens 8 Zeichen lang sein');
    }
    setIsLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      toast.success('Passwort geändert!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Falsches aktuelles Passwort');
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralLink = () => {
    const code = user?.referralCode || user?.referral_code || '';
    const link = `${window.location.origin}/shop?ref=${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success('Link kopiert!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const saveReferralCode = async () => {
    if (!newCode || newCode.length < 3) {
      toast.error('Code muss mindestens 3 Zeichen haben');
      return;
    }
    try {
      await api.put('/auth/update-profile', { referralCode: newCode });
      updateUser({ ...user, referral_code: newCode, referralCode: newCode });
      setEditingCode(false);
      toast.success('Empfehlungscode geaendert!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Code bereits vergeben oder ungueltig');
    }
  };

  const tabs = [
    { key: 'personal', label: 'Persoenliche Daten', icon: User },
    { key: 'address', label: 'Adresse', icon: MapPin },
    { key: 'bank', label: 'Bankdaten', icon: CreditCard },
    { key: 'security', label: 'Sicherheit', icon: Lock },
    { key: 'subdomain', label: 'Subdomain', icon: Globe },
  ];

  const inputClass = (hasError) => `w-full px-4 py-3 rounded-xl border ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent transition`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-secondary-700">
          {t('profile.title') || 'Profil'}
        </h1>
      </div>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-secondary-700 flex items-center justify-center text-white text-3xl font-bold">
              {(user?.firstName || user?.first_name || '?')[0]}{(user?.lastName || user?.last_name || '?')[0]}
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-heading font-bold text-secondary-700">
              {user?.firstName || user?.first_name} {user?.lastName || user?.last_name}
            </h2>
            <p className="text-secondary-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <span className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium">
                {user?.rank_name || user?.rank?.name || 'Starter'}
              </span>
              <span className="text-sm text-secondary-500">
                Partner seit {new Date(user?.createdAt || user?.created_at || Date.now()).getFullYear()}
              </span>
            </div>
          </div>
          <div className="sm:ml-auto text-center">
            <p className="text-sm text-secondary-500 mb-1">Ihr Empfehlungscode</p>
            {editingCode ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-_]/g, '').slice(0, 20))}
                  className="w-36 px-3 py-1.5 text-center font-mono font-bold text-lg border-2 border-primary-400 rounded-lg focus:outline-none"
                  placeholder="DEIN-CODE"
                  autoFocus
                />
                <button onClick={saveReferralCode}
                  className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingCode(false); setNewCode(user?.referralCode || user?.referral_code || ''); }}
                  className="p-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2 justify-center">
                <p className="text-2xl font-mono font-bold text-primary-400">
                  {user?.referralCode || user?.referral_code || '---'}
                </p>
                <button onClick={() => { setEditingCode(true); setNewCode(user?.referralCode || user?.referral_code || ''); }}
                  className="p-1 text-secondary-400 hover:text-primary-500 transition" title="Code aendern">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            <button onClick={copyReferralLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary-100 text-secondary-700 rounded-lg text-xs font-medium hover:bg-secondary-200 transition">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Kopiert!' : 'Link kopieren'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Tabs + Form */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-primary-400 border-b-2 border-secondary-500 bg-slate-50/50'
                  : 'text-secondary-500 hover:text-secondary-700 hover:bg-gray-50'
              }`}>
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">

          {/* Personal Tab */}
          {activeTab === 'personal' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Vorname *</label>
                <input {...register('firstName', { required: 'Pflichtfeld' })} className={inputClass(errors.firstName)} />
                {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Nachname *</label>
                <input {...register('lastName', { required: 'Pflichtfeld' })} className={inputClass(errors.lastName)} />
                {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">E-Mail</label>
                <input {...register('email')} className={inputClass(false)} disabled />
                <p className="text-xs text-gray-400 mt-1">E-Mail kann nicht geaendert werden</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Telefon</label>
                <input {...register('phone')} className={inputClass(false)} placeholder="+43 660 ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Firma</label>
                <input {...register('company')} className={inputClass(false)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">USt-IdNr.</label>
                <input {...register('vatId')} className={inputClass(false)} placeholder="ATU12345678" />
              </div>
            </div>
          )}

          {/* Address Tab */}
          {activeTab === 'address' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Strasse *</label>
                <input {...register('street', { required: 'Pflichtfeld' })} className={inputClass(errors.street)} />
                {errors.street && <p className="text-sm text-red-500 mt-1">{errors.street.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">PLZ *</label>
                <input {...register('zip', { required: 'Pflichtfeld' })} className={inputClass(errors.zip)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Ort *</label>
                <input {...register('city', { required: 'Pflichtfeld' })} className={inputClass(errors.city)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Land</label>
                <select {...register('country')} className={inputClass(false)}>
                  <option value="AT">Oesterreich</option>
                  <option value="DE">Deutschland</option>
                  <option value="CH">Schweiz</option>
                </select>
              </div>
            </div>
          )}

          {/* Bank Tab */}
          {activeTab === 'bank' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                <strong>Hinweis:</strong> Auszahlungen erfolgen per SEPA-Ueberweisung auf das hier hinterlegte Konto.
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-600 mb-1.5">Kontoinhaber</label>
                  <input {...register('accountHolder')} className={inputClass(false)} placeholder="Wie auf dem Konto" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-secondary-600 mb-1.5">IBAN *</label>
                  <input {...register('iban', { required: 'IBAN erforderlich' })} className={inputClass(errors.iban)} placeholder="AT12 3456 7890 1234 5678" />
                  {errors.iban && <p className="text-sm text-red-500 mt-1">{errors.iban.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-1.5">BIC</label>
                  <input {...register('bic')} className={inputClass(false)} placeholder="BKAUATWW" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-600 mb-1.5">Bankname</label>
                  <input {...register('bankName')} className={inputClass(false)} />
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="max-w-md space-y-6">
              <h3 className="font-semibold text-secondary-700">Passwort aendern</h3>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Aktuelles Passwort</label>
                <input type="password" value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className={inputClass(false)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Neues Passwort</label>
                <input type="password" value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className={inputClass(false)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-600 mb-1.5">Neues Passwort bestaetigen</label>
                <input type="password" value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className={inputClass(false)} />
              </div>
              <Button type="button" onClick={handleChangePassword} isLoading={isLoading} icon={Lock}>
                Passwort aendern
              </Button>
            </div>
          )}

          {/* Subdomain Tab (#56) */}
          {activeTab === 'subdomain' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Persoenliche Subdomain</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Optional koennen Sie eine personalisierte Subdomain erhalten, z.B. <strong>ihr-name.clyr.shop</strong>.
                      Damit koennen Ihre Kunden Sie direkt ueber Ihre eigene URL finden.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                <h4 className="font-semibold text-amber-800 mb-2">Kosten</h4>
                <p className="text-sm text-amber-700">
                  EUR 144,00 + 20% MwSt = <strong>EUR 172,80 / Jahr</strong>
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Die Gebuehr wird jaehrlich berechnet und ist im Voraus faellig.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gewuenschte Subdomain</label>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="ihr-name"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary-500" />
                  <span className="text-secondary-500 font-medium">.clyr.shop</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Kontaktieren Sie uns unter service@clyr.shop um Ihre Subdomain zu aktivieren.
                </p>
              </div>
            </div>
          )}

          {/* Save button (not for security/subdomain tab) */}
          {activeTab !== 'security' && activeTab !== 'subdomain' && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
              <Button type="submit" isLoading={isLoading} icon={Save} disabled={!isDirty && !isLoading}>
                {t('common.save') || 'Speichern'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
