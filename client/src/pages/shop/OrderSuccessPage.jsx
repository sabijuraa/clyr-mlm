import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Building2 } from 'lucide-react';

export default function OrderSuccessPage() {
  const [params] = useSearchParams();
  const method = params.get('method');
  const orderNumber = params.get('order');

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      {method === 'bank_transfer' ? (
        <>
          <Building2 className="w-16 h-16 text-clyr-teal mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Bestellung aufgegeben!</h1>
          {orderNumber && <p className="text-gray-500 mb-4">Bestellnummer: <strong>{orderNumber}</strong></p>}
          <div className="card text-left mb-6">
            <h2 className="font-semibold mb-2">Banküberweisung</h2>
            <p className="text-sm text-gray-600 mb-3">Bitte überweisen Sie den Betrag auf folgendes Konto:</p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <p><span className="text-gray-500">Empfänger:</span> <strong>CLYR Solutions GmbH</strong></p>
              <p><span className="text-gray-500">Verwendungszweck:</span> <strong>{orderNumber}</strong></p>
            </div>
            <p className="text-xs text-gray-400 mt-3">Ihre Bestellung wird nach Zahlungseingang bearbeitet.</p>
          </div>
        </>
      ) : (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Vielen Dank!</h1>
          <p className="text-gray-600 mb-6">Ihre Bestellung wurde erfolgreich aufgegeben. Sie erhalten in Kürze eine Bestätigung per E-Mail.</p>
        </>
      )}
      <div className="flex justify-center gap-4">
        <Link to="/orders" className="btn-outline">Meine Bestellungen</Link>
        <Link to="/shop" className="btn-primary">Weiter einkaufen</Link>
      </div>
    </div>
  );
}
