import { motion } from 'framer-motion';
import { Building, Mail, Phone, Globe, FileText, Scale } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';

const ImprintPage = () => {
  const { company, legal } = useBrand();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl 
              bg-gradient-to-br from-teal-600 to-teal-700 mb-6">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Impressum</h1>
            <p className="text-gray-600">Angaben gemäß § 5 TMG</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Building className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Unternehmensangaben
                </h2>
              </div>
              
              <div className="space-y-3 text-gray-700">
                <p className="font-semibold text-lg">{legal?.companyName || 'Still und Laut GmbH'}</p>
                <p>{legal?.street || 'Musterstraße 123'}</p>
                <p>{legal?.zip || '1010'} {legal?.city || 'Wien'}</p>
                <p>{legal?.country || 'Österreich'}</p>
              </div>
            </div>

            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Kontakt
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${company?.email || 'info@stillundlaut.com'}`} className="text-teal-600 hover:underline">
                    {company?.email || 'info@stillundlaut.com'}
                  </a>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${company?.phone || '+43720883818'}`} className="text-teal-600 hover:underline">
                    {company?.phone || '+43 720 883818'}
                  </a>
                </div>
              </div>
            </div>

            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Rechtliche Angaben
                </h2>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <p className="font-medium text-gray-900">Geschäftsführer</p>
                  <p>{legal?.managingDirector || 'Theresa Struger'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Handelsregister</p>
                  <p>{legal?.court || 'Handelsgericht Wien'}, {legal?.registrationNumber || 'FN 123456a'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">USt-IdNr.</p>
                  <p>{legal?.vatId || 'ATU12345678'}</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Streitschlichtung
                </h2>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                </p>
                <a 
                  href="https://ec.europa.eu/consumers/odr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline block"
                >
                  https://ec.europa.eu/consumers/odr
                </a>
                <p className="text-sm text-gray-500">
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                  Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ImprintPage;
