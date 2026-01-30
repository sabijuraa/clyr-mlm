import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, MapPin, CreditCard, Lock, Save, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import appConfig from '../../config/app.config';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('personal');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: user?.company || '',
      vatId: user?.vatId || '',
      street: user?.street || '',
      zip: user?.zip || '',
      city: user?.city || '',
      country: user?.country || 'DE',
      iban: user?.iban || '',
      bic: user?.bic || ''
    }
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateUser(data);
      toast.success('Profil erfolgreich aktualisiert!');
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { key: 'personal', label: 'Persönliche Daten', icon: User },
    { key: 'address', label: 'Adresse', icon: MapPin },
    { key: 'bank', label: 'Bankdaten', icon: CreditCard },
    { key: 'security', label: 'Sicherheit', icon: Lock },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-secondary-700">
          {t('profile.title') || 'Profil'}
        </h1>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 p-6"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-secondary-700 
              flex items-center justify-center text-white text-3xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg 
              flex items-center justify-center border border-gray-200 hover:bg-gray-50">
              <Camera className="w-4 h-4 text-secondary-500" />
            </button>
          </div>

          {/* Info */}
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-heading font-bold text-secondary-700">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-secondary-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <span className="px-3 py-1 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium">
                {user?.rank?.name || 'Starter'}
              </span>
              <span className="text-sm text-secondary-500">
                Partner seit {new Date(user?.createdAt || Date.now()).getFullYear()}
              </span>
            </div>
          </div>

          {/* Referral */}
          <div className="sm:ml-auto text-center">
            <p className="text-sm text-secondary-500 mb-1">Ihr Empfehlungscode</p>
            <p className="text-2xl font-mono font-bold text-primary-400">
              {user?.referralCode || 'ABC123'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-primary-400 border-b-2 border-secondary-500 bg-slate-50/50'
                  : 'text-secondary-500 hover:text-secondary-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/** ... your whole tab logic remains unchanged ... */}

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <Button type="submit" isLoading={isLoading} icon={Save}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
