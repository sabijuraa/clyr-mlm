import LegalPageView from './LegalPageView';

const WITHDRAWAL_HTML = `
<h2>Widerrufsbelehrung</h2>

<h3>Widerrufsrecht</h3>
<p>Sie haben das Recht, binnen <strong>vierzehn Tagen</strong> ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>
<p>Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.</p>
<p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns</p>

<div class="contact-block">
  <p><strong>CLYR Solutions GmbH</strong></p>
  <p>Pappelweg 4b, 9524 Villach</p>
  <p>Geschäftsführerin: Theresa Struger</p>
  <p>Tel: +43 (0) 664 2520432</p>
  <p>E-Mail: <a href="mailto:admin@clyr.shop">admin@clyr.shop</a></p>
</div>

<p>mittels einer eindeutigen Erklärung (z.B. ein mit der Post versandter Brief oder E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>
<p>Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>

<hr/>

<h2>Folgen des Widerrufs</h2>
<p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen <strong>vierzehn Tagen</strong> ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist.</p>
<p>Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.</p>
<p>Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere Zeitpunkt ist.</p>

<hr/>

<h2>Rücksendung</h2>
<p>Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden oder zu übergeben.</p>
<p>Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden.</p>
<p><strong>Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.</strong></p>
<p>Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.</p>

<hr/>

<h2>Muster-Widerrufsformular</h2>
<p><em>(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</em></p>
<div class="contact-block">
  <p>An: CLYR Solutions GmbH, Pappelweg 4b, 9524 Villach, admin@clyr.shop</p>
  <br/>
  <p>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*):</p>
  <br/>
  <p>Bestellt am (*) / erhalten am (*):</p>
  <p>Name des/der Verbraucher(s):</p>
  <p>Anschrift des/der Verbraucher(s):</p>
  <br/>
  <p>Datum:</p>
  <p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)</p>
  <br/>
  <p><em>(*) Unzutreffendes streichen</em></p>
</div>

<hr/>

<h3>Ausschluss des Widerrufsrechts</h3>
<p>Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind.</p>
<p>Bitte beachten Sie: Bei bereits montierten Wasseraufbereitungssystemen kann das Widerrufsrecht eingeschränkt sein, sofern die Montage auf ausdrücklichen Wunsch des Kunden vor Ablauf der Widerrufsfrist durchgeführt wurde.</p>
`;

const WithdrawalPage = () => <LegalPageView pageKey="withdrawal" fallbackTitle="Widerrufsbelehrung" fallbackContent={WITHDRAWAL_HTML} />;
export default WithdrawalPage;
