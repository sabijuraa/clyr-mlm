import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary-700 mb-5">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-secondary-700">Datenschutzerklaerung</h1>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 text-secondary-700 leading-relaxed">
            <p>In folgender Datenschutzerklaerung informieren wir Sie ueber die wichtigsten Aspekte der Datenverarbeitung im Rahmen unserer Webseite. Wir erheben und verarbeiten personenbezogene Daten nur auf Grundlage der gesetzlichen Bestimmungen (Datenschutzgrundverordnung, Telekommunikationsgesetz 2003).</p>
            <p>Sobald Sie als Benutzer auf unsere Webseite zugreifen oder diese besuchen wird Ihre IP-Adresse, Beginn sowie Beginn und Ende der Sitzung erfasst. Dies ist technisch bedingt und stellt somit ein berechtigtes Interesse iSv Art 6 Abs 1 lit f DSGVO.</p>

            <div>
              <h2 className="text-lg font-semibold mb-2">Kontakt mit uns</h2>
              <p>Wenn Sie uns, entweder ueber unser Kontaktformular auf unserer Webseite, oder per Email kontaktieren, dann werden die von Ihnen an uns uebermittelten Daten zwecks Bearbeitung Ihrer Anfrage oder fuer den Fall von weiteren Anschlussfragen fuer sechs Monate bei uns gespeichert. Es erfolgt, ohne Ihre Einwilligung, keine Weitergabe Ihrer uebermittelten Daten.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Cookies</h2>
              <p>Unsere Website verwendet so genannte Cookies. Dabei handelt es sich um kleine Textdateien, die mit Hilfe des Browsers auf Ihrem Endgeraet abgelegt werden. Sie richten keinen Schaden an. Wir nutzen Cookies dazu, unser Angebot nutzerfreundlich zu gestalten. Einige Cookies bleiben auf Ihrem Endgeraet gespeichert, bis Sie diese loeschen. Sie ermoeglichen es uns, Ihren Browser beim naechsten Besuch wiederzuerkennen.</p>
              <p className="mt-2">Wenn Sie dies nicht wuenschen, so koennen Sie Ihren Browser so einrichten, dass er Sie ueber das Setzen von Cookies informiert und Sie dies nur im Einzelfall erlauben. Bei der Deaktivierung von Cookies kann die Funktionalitaet unserer Website eingeschraenkt sein.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Google Maps</h2>
              <p>Unsere Website verwendet Funktionen des Webkartendienstes "Google Maps". Der Dienstanbieter dieser Funktion ist: Google Ireland Limited Gordon House, Barrow Street Dublin 4, Ireland.</p>
              <p className="mt-2">Im Zuge der Nutzung von Google Maps ist es notwendig Ihre IP-Adresse zu speichern und zu verarbeiten. Google uebertraegt in der Regel an einen Server in den USA und speichert die Daten dort.</p>
              <p className="mt-2">Weitere Informationen: <a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">https://policies.google.com/privacy</a></p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Google Fonts</h2>
              <p>Unsere Website verwendet Schriftarten von "Google Fonts". Der Dienstanbieter dieser Funktion ist: Google Ireland Limited Gordon House, Barrow Street Dublin 4, Ireland.</p>
              <p className="mt-2">Die Nutzung von "Google-Fonts" dient der Optimierung unserer Dienstleistung und der einheitlichen Darstellung von Inhalten. Dies stellt ein berechtigtes Interesse im Sinne von Art. 6 Abs. 1 lit. f DSGVO dar.</p>
              <p className="mt-2">Weitere Informationen: <a href="https://developers.google.com/fonts/faq" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">https://developers.google.com/fonts/faq</a></p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Server-Log Files</h2>
              <p>Diese Webseite und der damit verbundene Provider erhebt im Zuge der Webseitennutzung automatisch Informationen im Rahmen sogenannter "Server-Log Files". Dies betrifft insbesondere: IP-Adresse oder Hostname, den verwendeten Browser, Aufenthaltsdauer auf der Webseite sowie Datum und Uhrzeit, aufgerufene Seiten der Webseite, Spracheinstellungen und Betriebssystem, "Leaving-Page", ISP (Internet Service Provider).</p>
              <p className="mt-2">Diese erhobenen Informationen werden nicht personenbezogen verarbeitet oder mit personenbezogenen Daten in Verbindung gebracht.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Newsletter</h2>
              <p>Sie haben die Moeglichkeit, ueber unsere Website unseren Newsletter zu abonnieren. Hierfuer benoetigen wir Ihre E-Mail-Adresse und ihre Erklaerung, dass Sie mit dem Bezug des Newsletters einverstanden sind.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Ihre Rechte als Betroffener</h2>
              <p>Sie als Betroffener haben bezueglich Ihrer Daten, welche bei uns gespeichert sind grundsaetzlich ein Recht auf: Auskunft, Loeschung der Daten, Berichtigung der Daten, Uebertragbarkeit der Daten, Wiederruf und Widerspruch zur Datenverarbeitung, Einschraenkung.</p>
              <p className="mt-2">Wenn sie vermuten, dass im Zuge der Verarbeitung Ihrer Daten Verstoesse gegen das Datenschutzrecht passiert sind, so haben Sie die Moeglichkeit sich bei uns (office@freshliving.at) oder der Datenschutzbehoerde zu beschweren.</p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p><strong>Webseitenbetreiber:</strong> Theresa Struger</p>
              <p><strong>Telefonnummer:</strong> +43 664 2520432</p>
              <p><strong>Email:</strong> admin@clyr.shop</p>
              <p className="mt-2 text-sm text-secondary-500">Quelle: DSGVO Generator Oesterreich</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPage;
