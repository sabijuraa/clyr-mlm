import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

const ImprintPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary-700 mb-5">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-secondary-700">Impressum</h1>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6 text-secondary-700 leading-relaxed">
            <div>
              <p className="font-semibold text-lg">CLYR Solutions GmbH</p>
              <p>Pappelweg 4b, 9524 St. Magdalen</p>
              <p><strong>Geschaeftsfuehrerin:</strong> Theresa Struger</p>
              <p>Oesterreich</p>
              <p>+43 (0) 664 2520432</p>
              <p>admin@clyr.shop</p>
              <p>www.clyr.shop</p>
            </div>
            <div>
              <p><strong>Registernummer:</strong> (wird ergaenzt)</p>
              <p><strong>Registergericht:</strong> Handelsregister Villach</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">EU-Streitschlichtung</h2>
              <p>Gemaess Verordnung ueber Online-Streitbeilegung in Verbraucherangelegenheiten (ODR-Verordnung) moechten wir Sie ueber die Online-Streitbeilegungsplattform (OS-Plattform) informieren.</p>
              <p className="mt-2">Verbraucher haben die Moeglichkeit, Beschwerden an die Online Streitbeilegungsplattform der Europaeischen Kommission unter <a href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&lng=DE" target="_blank" rel="noopener noreferrer" className="text-primary-500 underline">https://ec.europa.eu/consumers/odr</a> zu richten.</p>
              <p className="mt-2">Wir moechten Sie jedoch darauf hinweisen, dass wir nicht bereit oder verpflichtet sind, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Haftung fuer Inhalte dieser Website</h2>
              <p>Wir entwickeln die Inhalte dieser Website staendig weiter und bemühen uns korrekte und aktuelle Informationen bereitzustellen. Leider koennen wir keine Haftung fuer die Korrektheit aller Inhalte auf dieser Website uebernehmen, speziell fuer jene, die seitens Dritter bereitgestellt wurden.</p>
              <p className="mt-2">Unsere Verpflichtungen zur Entfernung von Informationen oder zur Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen aufgrund von gerichtlichen oder behoerdlichen Anordnungen bleiben auch im Falle unserer Nichtverantwortlichkeit davon unberuehrt.</p>
              <p className="mt-2">Sollten Ihnen problematische oder rechtswidrige Inhalte auffallen, bitte wir Sie uns umgehend zu kontaktieren, damit wir die rechtswidrigen Inhalte entfernen koennen.</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Haftung fuer Links auf dieser Website</h2>
              <p>Unsere Website enthaelt Links zu anderen Websites fuer deren Inhalt wir nicht verantwortlich sind. Haftung fuer verlinkte Websites besteht fuer uns nicht, da wir keine Kenntnis rechtswidriger Taetigkeiten hatten und haben, uns solche Rechtswidrigkeiten auch bisher nicht aufgefallen sind und wir Links sofort entfernen wuerden, wenn uns Rechtswidrigkeiten bekannt werden.</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Urheberrechtshinweis</h2>
              <p>Alle Inhalte dieser Webseite (Bilder, Fotos, Texte, Videos) unterliegen dem Urheberrecht. Bitte fragen Sie uns bevor Sie die Inhalte dieser Website verbreiten, vervielfaeltigen oder verwerten.</p>
              <p className="mt-2"><strong>Bildernachweis:</strong> Die Bilderrechte liegen bei Shutterstock, Wix, Canva, Unsplash, Theresa Struger. Alle Texte sind urheberrechtlich geschuetzt.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ImprintPage;
