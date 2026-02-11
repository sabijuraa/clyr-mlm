import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary-700 mb-5">
              <Scale className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-secondary-700">Allgemeine Geschaeftsbedingungen (AGB)</h1>
            <p className="text-secondary-500 mt-2">der CLYR Solutions GmbH</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-8 text-secondary-700 leading-relaxed">

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 1 Geltungsbereich</h2>
              <p>(1) Diese Allgemeinen Geschaeftsbedingungen (AGB) gelten fuer saemtliche Vertraege ueber den Verkauf von Waren sowie Dienstleistungen zwischen der CLYR Solutions GmbH, Pappelweg 4b, 9524 St. Magdalen, Oesterreich, Geschaeftsfuehrerin: Theresa Struger – nachfolgend "CLYR Solutions GmbH" – und ihren Kunden.</p>
              <p className="mt-2">(2) Kunden im Sinne dieser AGB sind sowohl Verbraucher als auch Unternehmer.</p>
              <p className="mt-2">(3) Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei denn, CLYR Solutions GmbH stimmt deren Geltung ausdruecklich schriftlich zu.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 2 Vertragsgegenstand</h2>
              <p>(1) Vertragsgegenstand ist der Verkauf von Wasseraufbereitungssystemen, insbesondere Umkehrosmoseanlagen sowie Zubehoer und Ersatzteile.</p>
              <p className="mt-2">(2) Zusaetzlich bietet CLYR Solutions GmbH optional Montage-, Einschulungs- und Serviceleistungen an.</p>
              <p className="mt-2">(3) Produktbeschreibungen, technische Angaben und Darstellungen auf Webseiten, Social Media oder Werbematerial dienen der Information und stellen keine Garantie dar.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 3 Vertragsabschluss</h2>
              <p>(1) Die Praesentation der Produkte stellt kein rechtlich bindendes Angebot dar, sondern eine Aufforderung zur Bestellung.</p>
              <p className="mt-2">(2) Mit der Bestellung gibt der Kunde ein verbindliches Kaufangebot ab.</p>
              <p className="mt-2">(3) Der Vertrag kommt zustande durch: schriftliche Auftragsbestaetigung oder Lieferung der Ware oder Rechnungslegung.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 4 Preise und Zahlungsbedingungen</h2>
              <p>(1) Alle Preise verstehen sich, sofern nicht anders angegeben, inklusive gesetzlicher Mehrwertsteuer zuzueglich Versandkosten.</p>
              <p className="mt-2">(2) Zahlungen erfolgen nach Vereinbarung, insbesondere per Vorkasse, Bankueberweisung oder andere vereinbarte Zahlungsarten.</p>
              <p className="mt-2">(3) CLYR Solutions GmbH ist berechtigt, Lieferungen nur gegen Vorauszahlung durchzufuehren.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 5 Lieferung und Versand</h2>
              <p>(1) Die Lieferung erfolgt an die vom Kunden angegebene Adresse.</p>
              <p className="mt-2">(2) Lieferzeiten sind unverbindlich, sofern nicht ausdruecklich schriftlich bestaetigt.</p>
              <p className="mt-2">(3) Teillieferungen sind zulaessig, sofern diese fuer den Kunden zumutbar sind.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 6 Montageleistungen</h2>
              <p>(1) CLYR Solutions GmbH bietet optional professionelle Montage der Anlagen durch geschulte und zertifizierte Fachkraefte an.</p>
              <p className="mt-2">(2) Die Montage ist nicht automatisch Bestandteil des Kaufvertrages, sondern erfolgt ausschliesslich bei gesonderter Vereinbarung.</p>
              <p className="mt-2">(3) Montageleistungen werden gesondert verrechnet, sofern nichts anderes vereinbart wurde.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 7 Selbstmontage und Haftungsausschluss</h2>
              <p>(1) Erfolgt die Installation der Anlage durch den Kunden selbst oder durch nicht von CLYR Solutions GmbH autorisierte Personen, geschieht dies ausschliesslich auf eigene Verantwortung.</p>
              <p className="mt-2">(2) Fuer Schaeden, Folgeschaeden oder Funktionsstoerungen, die durch unsachgemaesse Installation, falsche Nutzung oder eigenstaendige Veraenderungen an der Anlage entstehen, uebernimmt CLYR Solutions GmbH keinerlei Haftung.</p>
              <p className="mt-2">(3) Gewaehrleistungs- und Garantieansprueche koennen bei nachweislich fehlerhafter Selbstmontage ausgeschlossen werden.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 8 Gewaehrleistung und Garantiebedingungen</h2>
              <p>(1) Es gelten die gesetzlichen Gewaehrleistungsrechte nach oesterreichischem Recht.</p>
              <p className="mt-2">(2) Offensichtliche Maengel sind unverzueglich nach Erhalt der Ware schriftlich mitzuteilen.</p>
              <p className="mt-2">(3) Verschleissteile, insbesondere Filterkartuschen, Vorfilter und Membranen, unterliegen abhaengig von Nutzung, Wasserqualitaet und Betriebsbedingungen natuerlichen Abnutzungsprozessen und sind von der Gewaehrleistung ausgeschlossen, sofern kein Produktionsfehler vorliegt.</p>
              <p className="mt-2">(4) Eine Herstellergarantie oder freiwillige Garantie durch CLYR Solutions GmbH gilt ausschliesslich unter der Voraussetzung, dass saemtliche vorgeschriebenen Wartungs- und Filterwechselintervalle eingehalten werden.</p>
              <p className="mt-2">(5) Werden Filter, Membranen oder sonstige Wartungsteile nicht regelmaessig entsprechend den Herstellerempfehlungen ausgetauscht, erlischt jeglicher Garantieanspruch.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 9 Betrieb und Wartung</h2>
              <p>(1) Der Kunde verpflichtet sich, die Anlage entsprechend der Bedienungsanleitung zu betreiben.</p>
              <p className="mt-2">(2) Wartungs- und Filterwechselintervalle sind zwingend einzuhalten.</p>
              <p className="mt-2">(3) Schaeden oder Funktionsstoerungen infolge unterlassener Wartung oder unsachgemaesser Nutzung begruenden keinen Gewaehrleistungs- oder Garantieanspruch.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 10 Eigentumsvorbehalt</h2>
              <p>Die Ware bleibt bis zur vollstaendigen Bezahlung Eigentum der CLYR Solutions GmbH.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 11 Haftung</h2>
              <p>(1) CLYR Solutions GmbH haftet unbeschraenkt fuer Schaeden aus: Verletzung von Leben, Koerper oder Gesundheit; Vorsatz oder grober Fahrlaessigkeit.</p>
              <p className="mt-2">(2) Bei leichter Fahrlaessigkeit haftet CLYR Solutions GmbH nur bei Verletzung wesentlicher Vertragspflichten und beschraenkt auf den vorhersehbaren Schaden.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 12 Gerichtsstand und anwendbares Recht</h2>
              <p>(1) Es gilt oesterreichisches Recht unter Ausschluss des UN-Kaufrechts.</p>
              <p className="mt-2">(2) Gerichtsstand ist, soweit gesetzlich zulaessig, der Sitz der CLYR Solutions GmbH.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">§ 13 Salvatorische Klausel</h2>
              <p>Sollte eine Bestimmung dieser AGB unwirksam sein, bleiben die uebrigen Bestimmungen unberuehrt.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsPage;
