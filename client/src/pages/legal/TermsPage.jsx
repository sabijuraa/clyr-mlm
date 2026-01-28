import { motion } from 'framer-motion';
import { FileText, ShoppingBag, Truck, CreditCard, RotateCcw, Scale, AlertTriangle } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';

const TermsPage = () => {
  const { company, legal, companyName } = useBrand();
  
  const sections = [
    {
      icon: ShoppingBag,
      title: '§1 Geltungsbereich',
      content: `Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen 
        ${legal?.companyName || companyName || 'Still und Laut GmbH'} und Verbrauchern sowie Unternehmern, 
        die über unseren Online-Shop abgeschlossen werden. Abweichende Bedingungen des Kunden 
        werden nicht anerkannt, es sei denn, wir stimmen ihrer Geltung ausdrücklich zu.`
    },
    {
      icon: FileText,
      title: '§2 Vertragsschluss',
      content: `Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes 
        Angebot, sondern eine Aufforderung zur Bestellung dar. Mit dem Absenden der Bestellung 
        gibt der Kunde ein verbindliches Angebot ab. Der Vertrag kommt zustande, wenn wir die 
        Bestellung durch eine Auftragsbestätigung per E-Mail annehmen.`
    },
    {
      icon: CreditCard,
      title: '§3 Preise und Zahlung',
      content: `Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer. 
        Versandkosten werden gesondert ausgewiesen und sind vom Kunden zu tragen. 
        Die Zahlung erfolgt über Stripe (Kreditkarte, PayPal, SEPA-Lastschrift). 
        Die Abbuchung erfolgt mit Versand der Ware.`
    },
    {
      icon: Truck,
      title: '§4 Lieferung',
      content: `Die Lieferzeit beträgt in der Regel 3-7 Werktage innerhalb Deutschlands 
        und Österreichs, 5-10 Werktage in die Schweiz. Größere Artikel werden per Spedition 
        geliefert. Der Versand erfolgt auf Risiko des Käufers. Bei Transportschäden bitten 
        wir um sofortige Reklamation beim Zusteller.`
    },
    {
      icon: RotateCcw,
      title: '§5 Widerrufsrecht',
      content: `Verbraucher haben das Recht, binnen 14 Tagen ohne Angabe von Gründen 
        den Vertrag zu widerrufen. Die Widerrufsfrist beginnt mit Erhalt der Ware. 
        Zur Wahrung der Frist genügt die rechtzeitige Absendung des Widerrufs. 
        Details finden Sie in unserer Widerrufsbelehrung.`
    },
    {
      icon: Scale,
      title: '§6 Gewährleistung',
      content: `Es gelten die gesetzlichen Gewährleistungsrechte. Bei Mängeln haben Sie 
        zunächst das Recht auf Nacherfüllung (Reparatur oder Ersatzlieferung). Schlägt 
        diese fehl, können Sie vom Vertrag zurücktreten oder den Kaufpreis mindern. 
        Die Gewährleistungsfrist beträgt 2 Jahre ab Lieferung.`
    },
    {
      icon: AlertTriangle,
      title: '§7 Haftung',
      content: `Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für 
        Schäden aus der Verletzung von Leben, Körper und Gesundheit. Für leichte 
        Fahrlässigkeit haften wir nur bei Verletzung wesentlicher Vertragspflichten, 
        beschränkt auf den vertragstypischen, vorhersehbaren Schaden.`
    }
  ];

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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Allgemeine Geschäftsbedingungen
            </h1>
            <p className="text-gray-600">
              für den Online-Shop von {legal?.companyName || companyName || 'Still und Laut GmbH'}
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 p-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-teal-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {section.title}
                  </h2>
                </div>
                <p className="text-gray-700 leading-relaxed">{section.content}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl border border-gray-100 p-8 mt-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              §8 Schlussbestimmungen
            </h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Es gilt das Recht der Republik Österreich unter Ausschluss des 
                UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur insoweit, 
                als dadurch keine zwingenden gesetzlichen Bestimmungen des Staates 
                eingeschränkt werden, in dem der Verbraucher seinen gewöhnlichen 
                Aufenthalt hat.
              </p>
              <p>
                Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, 
                bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
              </p>
            </div>
          </motion.div>

          <p className="text-center text-gray-500 text-sm mt-8">
            Stand: Januar 2026
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsPage;
