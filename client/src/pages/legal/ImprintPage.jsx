import LegalPageView from './LegalPageView';

const IMPRINT_HTML = `
<h2>Impressum</h2>

<div class="contact-block">
  <p><strong>CLYR Solutions GmbH</strong></p>
  <p>Pappelweg 4b, 9524 Villach</p>
  <p>Geschäftsführerin: Theresa Struger</p>
  <p>ÖSTERREICH</p>
  <br/>
  <p>Tel: +43 (0) 664 2520432</p>
  <p>E-Mail: <a href="mailto:admin@clyr.shop">admin@clyr.shop</a></p>
  <p>Web: <a href="https://www.clyr.shop" target="_blank">www.clyr.shop</a></p>
  <br/>
  <p>Registernummer: (in Bearbeitung)</p>
  <p>Registergericht: Handelsregister Villach</p>
  <p>UID-Nr.: ATU83027635</p>
  <p>Steuernummer: 61 333/1727</p>
</div>

<hr/>

<h2>EU-Streitschlichtung</h2>
<p>Gemäß Verordnung über Online-Streitbeilegung in Verbraucherangelegenheiten (ODR-Verordnung) möchten wir Sie über die Online-Streitbeilegungsplattform (OS-Plattform) informieren.</p>
<p>Verbraucher haben die Möglichkeit, Beschwerden an die Online Streitbeilegungsplattform der Europäischen Kommission unter <a href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&lng=DE" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a> zu richten. Die dafür notwendigen Kontaktdaten finden Sie oberhalb in unserem Impressum.</p>
<p>Wir möchten Sie jedoch darauf hinweisen, dass wir nicht bereit oder verpflichtet sind, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

<hr/>

<h2>Haftung für Inhalte dieser Website</h2>
<p>Wir entwickeln die Inhalte dieser Website ständig weiter und bemühen uns korrekte und aktuelle Informationen bereitzustellen. Leider können wir keine Haftung für die Korrektheit aller Inhalte auf dieser Website übernehmen, speziell für jene, die seitens Dritter bereitgestellt wurden. Als Diensteanbieter sind wir nicht verpflichtet, die von Ihnen übermittelten oder gespeicherten Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
<p>Unsere Verpflichtungen zur Entfernung von Informationen oder zur Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen aufgrund von gerichtlichen oder behördlichen Anordnungen bleiben auch im Falle unserer Nichtverantwortlichkeit davon unberührt.</p>
<p>Sollten Ihnen problematische oder rechtswidrige Inhalte auffallen, bitte wir Sie uns umgehend zu kontaktieren, damit wir die rechtswidrigen Inhalte entfernen können. Sie finden die Kontaktdaten im Impressum.</p>

<hr/>

<h2>Haftung für Links auf dieser Website</h2>
<p>Unsere Website enthält Links zu anderen Websites für deren Inhalt wir nicht verantwortlich sind. Haftung für verlinkte Websites besteht für uns nicht, da wir keine Kenntnis rechtswidriger Tätigkeiten hatten und haben, uns solche Rechtswidrigkeiten auch bisher nicht aufgefallen sind und wir Links sofort entfernen würden, wenn uns Rechtswidrigkeiten bekannt werden.</p>
<p>Wenn Ihnen rechtswidrige Links auf unserer Website auffallen, bitte wir Sie uns zu kontaktieren. Sie finden die Kontaktdaten im Impressum.</p>

<hr/>

<h2>Urheberrechtshinweis</h2>
<p>Alle Inhalte dieser Webseite (Bilder, Fotos, Texte, Videos) unterliegen dem Urheberrecht. Bitte fragen Sie uns bevor Sie die Inhalte dieser Website verbreiten, vervielfältigen oder verwerten wie zum Beispiel auf anderen Websites erneut veröffentlichen. Falls notwendig, werden wir die unerlaubte Nutzung von Teilen der Inhalte unserer Seite rechtlich verfolgen.</p>
<p>Sollten Sie auf dieser Webseite Inhalte finden, die das Urheberrecht verletzen, bitten wir Sie uns zu kontaktieren.</p>

<hr/>

<h2>Bildernachweis</h2>
<p>Die Bilder, Fotos und Grafiken auf dieser Webseite sind urheberrechtlich geschützt.</p>
<p>Die Bilderrechte liegen bei:</p>
<ul>
  <li>Shutterstock</li>
  <li>Wix</li>
  <li>Canva</li>
  <li>Unsplash</li>
  <li>Theresa Struger</li>
</ul>
<p><strong>Alle Texte sind urheberrechtlich geschützt.</strong></p>
`;

const ImprintPage = () => <LegalPageView pageKey="imprint" fallbackTitle="Impressum" fallbackContent={IMPRINT_HTML} />;
export default ImprintPage;
