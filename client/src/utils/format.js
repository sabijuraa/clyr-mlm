export const formatPrice = (price, country = 'AT') => {
  if (!price && price !== 0) return 'Preis auf Anfrage';
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(price);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
};

export const getCountryPrice = (product, country = 'AT') => {
  if (country === 'DE') return product.price_de || product.price_at;
  if (country === 'CH') return product.price_ch || product.price_at;
  return product.price_at;
};

export const statusLabels = {
  pending: 'Ausstehend', confirmed: 'Bestätigt', processing: 'In Bearbeitung',
  shipped: 'Versendet', delivered: 'Zugestellt', cancelled: 'Storniert', refunded: 'Erstattet',
  paid: 'Bezahlt', failed: 'Fehlgeschlagen'
};

export const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800', shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800', paid: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800'
};
