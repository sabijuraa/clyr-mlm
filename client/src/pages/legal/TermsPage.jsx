import LegalPageView from './LegalPageView';

const TERMS_HTML = `
<h2>Allgemeine Geschäftsbedingungen (AGB) der CLYR Solutions GmbH</h2>

<hr/>

<h2>§ 1 Geltungsbereich</h2>
<p>(1) Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für sämtliche Verträge über den Verkauf von Waren sowie Dienstleistungen zwischen der</p>
<div class="contact-block">
  <p><strong>CLYR Solutions GmbH</strong></p>
  <p>Pappelweg 4b</p>
  <p>9524 Villach</p>
  <p>Österreich</p>
  <p>Geschäftsführerin: Theresa Struger</p>
  <p>– nachfolgend „CLYR Solutions GmbH" –</p>
</div>
<p>und ihren Kunden.</p>
<p>(2) Kunden im Sinne dieser AGB sind sowohl Verbraucher als auch Unternehmer.</p>
<p>(3) Abweichende Bedingungen des Kunden werden nicht anerkannt, es sei denn, CLYR Solutions GmbH stimmt deren Geltung ausdrücklich schriftlich zu.</p>

<hr/>

<h2>§ 2 Vertragsgegenstand</h2>
<p>(1) Vertragsgegenstand ist der Verkauf von Wasseraufbereitungssystemen, insbesondere Umkehrosmoseanlagen sowie Zubehör und Ersatzteile.</p>
<p>(2) Zusätzlich bietet CLYR Solutions GmbH optional Montage-, Einschulungs- und Serviceleistungen an.</p>
<p>(3) Produktbeschreibungen, technische Angaben und Darstellungen auf Webseiten, Social Media oder Werbematerial dienen der Information und stellen keine Garantie dar.</p>

<hr/>

<h2>§ 3 Vertragsabschluss</h2>
<p>(1) Die Präsentation der Produkte stellt kein rechtlich bindendes Angebot dar, sondern eine Aufforderung zur Bestellung.</p>
<p>(2) Mit der Bestellung gibt der Kunde ein verbindliches Kaufangebot ab.</p>
<p>(3) Der Vertrag kommt zustande durch:</p>
<ul>
  <li>schriftliche Auftragsbestätigung oder</li>
  <li>Lieferung der Ware oder</li>
  <li>Rechnungslegung</li>
</ul>

<hr/>

<h2>§ 4 Preise und Zahlungsbedingungen</h2>
<p>(1) Alle Preise verstehen sich, sofern nicht anders angegeben, inklusive gesetzlicher Mehrwertsteuer zuzüglich Versandkosten.</p>
<p>(2) Zahlungen erfolgen nach Vereinbarung, insbesondere per:</p>
<ul>
  <li>Vorkasse</li>
  <li>Banküberweisung</li>
  <li>andere vereinbarte Zahlungsarten</li>
</ul>
<p>(3) CLYR Solutions GmbH ist berechtigt, Lieferungen nur gegen Vorauszahlung durchzuführen.</p>

<hr/>

<h2>§ 5 Lieferung und Versand</h2>
<p>(1) Die Lieferung erfolgt an die vom Kunden angegebene Adresse.</p>
<p>(2) Lieferzeiten sind unverbindlich, sofern nicht ausdrücklich schriftlich bestätigt.</p>
<p>(3) Teillieferungen sind zulässig, sofern diese für den Kunden zumutbar sind.</p>

<hr/>

<h2>§ 6 Montageleistungen</h2>
<p>(1) CLYR Solutions GmbH bietet optional professionelle Montage der Anlagen durch geschulte und zertifizierte Fachkräfte an.</p>
<p>(2) Die Montage ist nicht automatisch Bestandteil des Kaufvertrages, sondern erfolgt ausschließlich bei gesonderter Vereinbarung.</p>
<p>(3) Montageleistungen werden gesondert verrechnet, sofern nichts anderes vereinbart wurde.</p>

<hr/>

<h2>§ 7 Selbstmontage und Haftungsausschluss</h2>
<p>(1) Erfolgt die Installation der Anlage durch den Kunden selbst oder durch nicht von CLYR Solutions GmbH autorisierte Personen, geschieht dies ausschließlich auf eigene Verantwortung.</p>
<p>(2) Für Schäden, Folgeschäden oder Funktionsstörungen, die durch unsachgemäße Installation, falsche Nutzung oder eigenständige Veränderungen an der Anlage entstehen, übernimmt CLYR Solutions GmbH keinerlei Haftung.</p>
<p>(3) Gewährleistungs- und Garantieansprüche können bei nachweislich fehlerhafter Selbstmontage ausgeschlossen werden.</p>

<hr/>

<h2>§ 8 Gewährleistung und Garantiebedingungen</h2>
<p>(1) Es gelten die gesetzlichen Gewährleistungsrechte nach österreichischem Recht.</p>
<p>(2) Offensichtliche Mängel sind unverzüglich nach Erhalt der Ware schriftlich mitzuteilen.</p>
<p>(3) Verschleißteile, insbesondere Filterkartuschen, Vorfilter und Membranen, unterliegen abhängig von Nutzung, Wasserqualität und Betriebsbedingungen natürlichen Abnutzungsprozessen und sind von der Gewährleistung ausgeschlossen, sofern kein Produktionsfehler vorliegt.</p>
<p>(4) Eine Herstellergarantie oder freiwillige Garantie durch CLYR Solutions GmbH gilt ausschließlich unter der Voraussetzung, dass sämtliche vorgeschriebenen Wartungs- und Filterwechselintervalle eingehalten werden.</p>
<p>(5) Werden Filter, Membranen oder sonstige Wartungsteile nicht regelmäßig entsprechend den Herstellerempfehlungen ausgetauscht, erlischt jeglicher Garantieanspruch.</p>

<hr/>

<h2>§ 9 Betrieb und Wartung</h2>
<p>(1) Der Kunde verpflichtet sich, die Anlage entsprechend der Bedienungsanleitung zu betreiben.</p>
<p>(2) Wartungs- und Filterwechselintervalle sind zwingend einzuhalten.</p>
<p>(3) Schäden oder Funktionsstörungen infolge unterlassener Wartung oder unsachgemäßer Nutzung begründen keinen Gewährleistungs- oder Garantieanspruch.</p>

<hr/>

<h2>§ 10 Eigentumsvorbehalt</h2>
<p>Die Ware bleibt bis zur vollständigen Bezahlung Eigentum der CLYR Solutions GmbH.</p>

<hr/>

<h2>§ 11 Haftung</h2>
<p>(1) CLYR Solutions GmbH haftet unbeschränkt für Schäden aus:</p>
<ul>
  <li>Verletzung von Leben, Körper oder Gesundheit</li>
  <li>Vorsatz oder grober Fahrlässigkeit</li>
</ul>
<p>(2) Bei leichter Fahrlässigkeit haftet CLYR Solutions GmbH nur bei Verletzung wesentlicher Vertragspflichten und beschränkt auf den vorhersehbaren Schaden.</p>

<hr/>

<h2>§ 12 Gerichtsstand und anwendbares Recht</h2>
<p>(1) Es gilt österreichisches Recht unter Ausschluss des UN-Kaufrechts.</p>
<p>(2) Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz der CLYR Solutions GmbH.</p>

<hr/>

<h2>§ 13 Salvatorische Klausel</h2>
<p>Sollte eine Bestimmung dieser AGB unwirksam sein, bleiben die übrigen Bestimmungen unberührt.</p>
`;

const TermsPage = () => <LegalPageView pageKey="terms" fallbackTitle="Allgemeine Geschäftsbedingungen (AGB)" fallbackContent={TERMS_HTML} />;
export default TermsPage;
