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
              bg-gradient-to-br from-secondary-600 to-secondary-700 mb-6">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-secondary-700 mb-4">Impressum</h1>
            <p className="text-secondary-500">Angaben gemäß § 5 TMG</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-secondary-100 flex items-center justify-center">
                  <Building className="w-6 h-6 text-primary-400" />
                </div>
                <h2 className="text-xl font-semibold text-secondary-700">
                  Unternehmensangaben
                </h2>
              </div>
              
              <div className="space-y-3 text-secondary-700">
                <p className="font-semibold text-lg">{legal?.companyName || 'CLYR Solutions GmbH'}</p>
                <p>{legal?.street || 'Pappelweg 4b'}</p>
                <p>{legal?.zip || '9524'} {legal?.city || 'St. Magdalen'}</p>
                <p>{legal?.country || 'Oesterreich'}</p>
              </div>
            </div>

            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-secondary-700">
                  Kontakt
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${company?.email || 'service@clyr.shop'}`} className="text-primary-400 hover:underline">
                    {company?.email || 'service@clyr.shop'}
                  </a>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${company?.phone || '+436601234567'}`} className="text-primary-400 hover:underline">
                    {company?.phone || '+43 660 123 4567'}
                  </a>
                </div>
              </div>
            </div>

            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-secondary-700">
                  Rechtliche Angaben
                </h2>
              </div>
              
              <div className="space-y-4 text-secondary-700">
                <div>
                  <p className="font-medium text-secondary-700">Geschaeftsfuehrer</p>
                  <p>{legal?.managingDirector || ''}</p>
                </div>
                <div>
                  <p className="font-medium text-secondary-700">Firmenbuch</p>
                  <p>{legal?.court || 'Landesgericht Villach'}{legal?.registrationNumber ? `, ${legal.registrationNumber}` : ''}</p>
                </div>
                <div>
                  <p className="font-medium text-secondary-700">USt-IdNr.</p>
                  <p>{legal?.vatId || 'ATU12345678'}</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-secondary-700">
                  Streitschlichtung
                </h2>
              </div>
              
              <div className="space-y-4 text-secondary-700">
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                </p>
                <a 
                  href="https://ec.europa.eu/consumers/odr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline block"
                >
                  https://ec.europa.eu/consumers/odr
                </a>
                <p className="text-sm text-secondary-500">
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
