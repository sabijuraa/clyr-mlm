import { motion } from 'framer-motion';
import { RotateCcw, Clock, Mail, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';

const WithdrawalPage = () => {
  const { company, legal, companyName } = useBrand();
  
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
              <RotateCcw className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-secondary-700 mb-4">Widerrufsbelehrung</h1>
            <p className="text-secondary-500">Ihr Recht auf Widerruf als Verbraucher</p>
          </div>

          {/* Main Info Box */}
          <div className="bg-slate-50 rounded-2xl border border-secondary-100 p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-primary-400" />
              <h2 className="text-xl font-semibold text-secondary-700">Widerrufsrecht</h2>
            </div>
            <p className="text-secondary-700 leading-relaxed">
              Sie haben das Recht, binnen <strong>14 Tagen</strong> ohne Angabe von Gründen 
              diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag, 
              an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, 
              die Waren in Besitz genommen haben bzw. hat.
            </p>
          </div>

          {/* How to withdraw */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-secondary-700">
                Ausübung des Widerrufsrechts
              </h2>
            </div>
            <p className="text-secondary-700 mb-4">
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen 
              Erklärung (z.B. Brief, Fax oder E-Mail) über Ihren Entschluss, diesen 
              Vertrag zu widerrufen, informieren.
            </p>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-semibold text-secondary-700">{legal?.companyName || companyName || 'Still und Laut GmbH'}</p>
              <p className="text-secondary-700">{legal?.street || 'Musterstraße 123'}</p>
              <p className="text-secondary-700">{legal?.zip || '1010'} {legal?.city || 'Wien'}</p>
              <p className="text-secondary-700 mt-2">E-Mail: {company?.email || 'info@stillundlaut.com'}</p>
            </div>
          </div>

          {/* Consequences */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-secondary-700">
                Folgen des Widerrufs
              </h2>
            </div>
            <div className="space-y-4 text-secondary-700">
              <p>
                Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir 
                von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der 
                zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der 
                Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt 
                haben), unverzüglich und spätestens binnen <strong>14 Tagen</strong> ab dem 
                Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags 
                bei uns eingegangen ist.
              </p>
              <p>
                Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der 
                ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde 
                ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen 
                dieser Rückzahlung Entgelte berechnet.
              </p>
            </div>
          </div>

          {/* Return of goods */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-secondary-700">
                Rücksendung der Waren
              </h2>
            </div>
            <div className="space-y-4 text-secondary-700">
              <p>
                Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen 14 Tagen 
                ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, 
                an uns zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn Sie die 
                Waren vor Ablauf der Frist von 14 Tagen absenden.
              </p>
              <p>
                <strong>Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.</strong>
              </p>
              <p>
                Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn 
                dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften 
                und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.
              </p>
            </div>
          </div>

          {/* Exclusions */}
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-700" />
              </div>
              <h2 className="text-lg font-semibold text-amber-900">
                Ausschluss des Widerrufsrechts
              </h2>
            </div>
            <p className="text-amber-800 mb-4">
              Das Widerrufsrecht besteht nicht bei folgenden Verträgen:
            </p>
            <ul className="space-y-2 text-amber-800">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <span>Verträge zur Lieferung versiegelter Waren, die aus Gründen des 
                  Gesundheitsschutzes oder der Hygiene nicht zur Rückgabe geeignet sind, 
                  wenn ihre Versiegelung nach der Lieferung entfernt wurde</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 flex-shrink-0" />
                <span>Verträge zur Lieferung von Waren, die nach Kundenspezifikation 
                  angefertigt werden oder eindeutig auf die persönlichen Bedürfnisse 
                  zugeschnitten sind</span>
              </li>
            </ul>
          </div>

          <p className="text-center text-secondary-500 text-sm mt-8">
            Stand: Januar 2026
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default WithdrawalPage;
