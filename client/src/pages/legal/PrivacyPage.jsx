import { motion } from 'framer-motion';
import { Shield, Eye, Database, Lock, UserCheck, Server, Mail } from 'lucide-react';
import { useBrand } from '../../context/BrandContext';

const PrivacyPage = () => {
  const { company, legal } = useBrand();
  
  const sections = [
    {
      icon: Eye,
      title: '1. Datenerfassung auf unserer Website',
      content: `Bei der Nutzung unserer Website werden automatisch bestimmte Daten erhoben. 
        Dazu gehören: IP-Adresse, Datum und Uhrzeit des Zugriffs, aufgerufene Seiten, 
        verwendeter Browser und Betriebssystem. Diese Daten werden zur technischen 
        Bereitstellung und Optimierung unserer Website verwendet.`
    },
    {
      icon: UserCheck,
      title: '2. Registrierung und Kundenkonto',
      content: `Bei der Registrierung als Partner oder Kunde erheben wir: Name, E-Mail-Adresse, 
        Anschrift, Telefonnummer und Bankverbindung. Diese Daten sind für die Vertragserfüllung 
        und Auszahlung von Provisionen erforderlich. Die Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.`
    },
    {
      icon: Database,
      title: '3. Datenverarbeitung bei Bestellungen',
      content: `Bei Bestellungen speichern wir Ihre Kontakt- und Lieferdaten sowie die 
        Bestellhistorie. Diese Daten werden für die Vertragserfüllung, Versand und 
        gesetzliche Aufbewahrungspflichten verwendet. Zahlungsdaten werden ausschließlich 
        über unseren Zahlungsdienstleister Stripe verarbeitet.`
    },
    {
      icon: Lock,
      title: '4. Datensicherheit',
      content: `Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um 
        Ihre Daten gegen zufällige oder vorsätzliche Manipulation, Verlust oder Zugriff 
        durch Unbefugte zu schützen. Unsere Website verwendet SSL-Verschlüsselung.`
    },
    {
      icon: Server,
      title: '5. Hosting und Datenübermittlung',
      content: `Unsere Website wird auf Servern in der Europäischen Union gehostet. 
        Eine Übermittlung in Drittländer erfolgt nur, wenn dies zur Vertragserfüllung 
        erforderlich ist oder angemessene Garantien bestehen (z.B. EU-Standardvertragsklauseln).`
    },
    {
      icon: Mail,
      title: '6. E-Mail-Kommunikation',
      content: `Wir versenden E-Mails zur Bestellbestätigung, Versandbenachrichtigung und 
        bei Partnerregistrierungen. Newsletter werden nur mit Ihrer ausdrücklichen 
        Einwilligung versendet. Sie können den Newsletter jederzeit abbestellen.`
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
              bg-gradient-to-br from-secondary-600 to-secondary-700 mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-secondary-700 mb-4">Datenschutzerklärung</h1>
            <p className="text-secondary-500">Informationen zum Umgang mit Ihren personenbezogenen Daten</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <h2 className="text-xl font-semibold text-secondary-700 mb-4">
              Verantwortlicher
            </h2>
            <p className="text-secondary-700 mb-4">
              Verantwortlich für die Datenverarbeitung auf dieser Website ist:
            </p>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="font-semibold">{legal?.companyName || 'Still und Laut GmbH'}</p>
              <p>{legal?.street || 'Musterstraße 123'}</p>
              <p>{legal?.zip || '1010'} {legal?.city || 'Wien'}</p>
              <p className="mt-2">E-Mail: {company?.email || 'info@stillundlaut.com'}</p>
            </div>
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
                  <div className="w-10 h-10 rounded-xl bg-secondary-100 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-secondary-700">
                    {section.title}
                  </h2>
                </div>
                <p className="text-secondary-700 leading-relaxed">{section.content}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-slate-50 rounded-2xl border border-secondary-100 p-8 mt-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-secondary-700" />
              </div>
              <h2 className="text-lg font-semibold text-secondary-700">
                Ihre Rechte
              </h2>
            </div>
            <ul className="space-y-2 text-secondary-700">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Recht auf Auskunft (Art. 15 DSGVO)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Recht auf Berichtigung (Art. 16 DSGVO)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Recht auf Löschung (Art. 17 DSGVO)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Recht auf Datenübertragbarkeit (Art. 20 DSGVO)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Widerspruchsrecht (Art. 21 DSGVO)
              </li>
            </ul>
          </motion.div>

          <p className="text-center text-secondary-500 text-sm mt-8">
            Stand: Januar 2026
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPage;
