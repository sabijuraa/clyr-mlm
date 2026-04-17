import LegalPageView from './LegalPageView';

const PRIVACY_HTML = `
<h2>Datenschutzerklärung</h2>
<p>In folgender Datenschutzerklärung informieren wir Sie über die wichtigsten Aspekte der Datenverarbeitung im Rahmen unserer Webseite. Wir erheben und verarbeiten personenbezogene Daten nur auf Grundlage der gesetzlichen Bestimmungen (Datenschutzgrundverordnung, Telekommunikationsgesetz 2003).</p>
<p>Sobald Sie als Benutzer auf unsere Webseite zugreifen oder diese besuchen wird Ihre IP-Adresse, Beginn sowie Beginn und Ende der Sitzung erfasst. Dies ist technisch bedingt und stellt somit ein berechtigtes Interesse iSv Art 6 Abs 1 lit f DSGVO.</p>

<hr/>

<h2>Kontakt mit uns</h2>
<p>Wenn Sie uns, entweder über unser Kontaktformular auf unserer Webseite, oder per Email kontaktieren, dann werden die von Ihnen an uns übermittelten Daten zwecks Bearbeitung Ihrer Anfrage oder für den Fall von weiteren Anschlussfragen für sechs Monate bei uns gespeichert. Es erfolgt, ohne Ihre Einwilligung, keine Weitergabe Ihrer übermittelten Daten.</p>

<hr/>

<h2>Cookies</h2>
<p>Unsere Website verwendet so genannte Cookies. Dabei handelt es sich um kleine Textdateien, die mit Hilfe des Browsers auf Ihrem Endgerät abgelegt werden. Sie richten keinen Schaden an. Wir nutzen Cookies dazu, unser Angebot nutzerfreundlich zu gestalten. Einige Cookies bleiben auf Ihrem Endgerät gespeichert, bis Sie diese löschen. Sie ermöglichen es uns, Ihren Browser beim nächsten Besuch wiederzuerkennen.</p>
<p>Wenn Sie dies nicht wünschen, so können Sie Ihren Browser so einrichten, dass er Sie über das Setzen von Cookies informiert und Sie dies nur im Einzelfall erlauben. Bei der Deaktivierung von Cookies kann die Funktionalität unserer Website eingeschränkt sein.</p>

<hr/>

<h2>Google Maps</h2>
<p>Unsere Website verwendet Funktionen des Webkartendienstes „Google Maps". Der Dienstanbieter dieser Funktion ist:</p>
<ul>
  <li>Google Ireland Limited Gordon House, Barrow Street Dublin 4. Ireland. Tel: +353 1 543 1000</li>
</ul>
<p>Im Zuge der Nutzung von Google Maps ist es notwendig Ihre IP-Adresse zu speichern und zu verarbeiten. Google überträgt in der Regel an einen Server in den USA und speichert die Daten dort. Die Verarbeitung geschieht durch den Diensteanbieter (oben genannt), der Betreiber dieser Homepage hat keinen Einfluss auf die Übertragung der Daten.</p>
<p>Die Datenverarbeitung erfolgt auf Basis der gesetzlichen Bestimmungen des § 96 Abs 3 TKG sowie des Art 6 Abs 1 lit f (berechtigtes Interesse) der DSGVO. Die Nutzung von Google Maps erhöht die Auffindbarkeit der Orte, welche auf unserer Webseite bereitgestellt werden.</p>
<p>Weitere Informationen über den Umgang mit Nutzerdaten des Diensteanbieters „Google" können Sie der Datenschutzerklärung entnehmen: <a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy?hl=de</a></p>
<p>Google verarbeitet die Daten auch in den USA, hat sich jedoch dem EU-US Privacy-Shield unterworfen: <a href="https://www.privacyshield.gov/EU-US-Framework" target="_blank" rel="noopener noreferrer">https://www.privacyshield.gov/EU-US-Framework</a></p>

<hr/>

<h2>Google Fonts</h2>
<p>Unsere Website verwendet Schriftarten von „Google Fonts". Der Dienstanbieter dieser Funktion ist:</p>
<ul>
  <li>Google Ireland Limited Gordon House, Barrow Street Dublin 4. Ireland. Tel: +353 1 543 1000</li>
</ul>
<p>Beim Aufrufen dieser Webseite lädt Ihr Browser Schriftarten und speichert diese in den Cache. Da Sie, als Besucher der Webseite, Daten des Dienstanbieters empfangen kann Google unter Umständen Cookies auf Ihrem Rechner setzen oder analysieren.</p>
<p>Die Nutzung von „Google-Fonts" dient der Optimierung unserer Dienstleistung und der einheitlichen Darstellung von Inhalten. Dies stellt ein berechtigtes Interesse im Sinne von Art. 6 Abs. 1 lit. f DSGVO dar.</p>
<p>Weitere Informationen zu Google Fonts erhalten Sie unter: <a href="https://developers.google.com/fonts/faq" target="_blank" rel="noopener noreferrer">https://developers.google.com/fonts/faq</a></p>
<p>Weitere Informationen über den Umgang mit Nutzerdaten von Google können Sie der Datenschutzerklärung entnehmen: <a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy?hl=de</a></p>
<p>Google verarbeitet die Daten auch in den USA, hat sich jedoch dem EU-US Privacy-Shield unterworfen: <a href="https://www.privacyshield.gov/EU-US-Framework" target="_blank" rel="noopener noreferrer">https://www.privacyshield.gov/EU-US-Framework</a></p>

<hr/>

<h2>Server-Log Files</h2>
<p>Diese Webseite und der damit verbundene Provider erhebt im Zuge der Webseitennutzung automatisch Informationen im Rahmen sogenannter „Server-Log Files". Dies betrifft insbesondere:</p>
<ul>
  <li>IP-Adresse oder Hostname</li>
  <li>den verwendeten Browser</li>
  <li>Aufenthaltsdauer auf der Webseite sowie Datum und Uhrzeit</li>
  <li>aufgerufene Seiten der Webseite</li>
  <li>Spracheinstellungen und Betriebssystem</li>
  <li>„Leaving-Page" (auf welcher URL hat der Benutzer die Webseite verlassen)</li>
  <li>ISP (Internet Service Provider)</li>
</ul>
<p>Diese erhobenen Informationen werden nicht personenbezogen verarbeitet oder mit personenbezogenen Daten in Verbindung gebracht.</p>
<p>Der Webseitenbetreiber behält es sich vor, im Falle von Bekanntwerden rechtswidriger Tätigkeiten, diese Daten auszuwerten oder zu überprüfen.</p>

<hr/>

<h2>Newsletter</h2>
<p>Sie haben die Möglichkeit, über unsere Website unseren Newsletter zu abonnieren. Hierfür benötigen wir Ihre E-Mail-Adresse und ihre Erklärung, dass Sie mit dem Bezug des Newsletters einverstanden sind.</p>

<hr/>

<h2>Ihre Rechte als Betroffener</h2>
<p>Sie als Betroffener haben bezüglich Ihrer Daten, welche bei uns gespeichert sind grundsätzlich ein Recht auf:</p>
<ul>
  <li>Auskunft</li>
  <li>Löschung der Daten</li>
  <li>Berichtigung der Daten</li>
  <li>Übertragbarkeit der Daten</li>
  <li>Wiederruf und Widerspruch zur Datenverarbeitung</li>
  <li>Einschränkung</li>
</ul>
<p>Wenn sie vermuten, dass im Zuge der Verarbeitung Ihrer Daten Verstöße gegen das Datenschutzrecht passiert sind, so haben Sie die Möglichkeit sich bei uns (<a href="mailto:service@clyr.shop">service@clyr.shop</a>) oder der Datenschutzbehörde zu beschweren.</p>

<hr/>

<h3>Kontaktdaten</h3>
<div class="contact-block">
  <p><strong>Webseitenbetreiber:</strong> Theresa Struger</p>
  <p><strong>Telefonnummer:</strong> +43 664 2520432</p>
  <p><strong>Email:</strong> <a href="mailto:admin@clyr.shop">admin@clyr.shop</a></p>
</div>
<p><em>Quelle: DSGVO Generator Österreich</em></p>
`;

const PrivacyPage = () => <LegalPageView pageKey="privacy" fallbackTitle="Datenschutzerklärung" fallbackContent={PRIVACY_HTML} />;
export default PrivacyPage;
