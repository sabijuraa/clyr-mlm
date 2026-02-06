const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const COMPANY = {
  name: 'CLYR Solutions GmbH',
  address: 'Pappelweg 4b',
  city: '9524 St. Magdalen',
  country: 'Österreich',
  email: 'service@clyr.shop',
  web: 'www.clyr.shop',
  tagline: 'Mehr als Wasser',
};

function createHeader(doc) {
  doc.fontSize(24).fillColor('#2D3436').text('CLYR', 50, 40, { continued: true })
     .fontSize(8).fillColor('#5DADE2').text('  SOLUTIONS', { baseline: 'bottom' });
  doc.fontSize(8).fillColor('#888').text(COMPANY.tagline, 50, 65);
  doc.fontSize(7).fillColor('#888')
     .text(`${COMPANY.name} · ${COMPANY.address} · ${COMPANY.city}`, 300, 40, { align: 'right' })
     .text(`${COMPANY.email} · ${COMPANY.web}`, 300, 52, { align: 'right' });
  doc.moveTo(50, 80).lineTo(545, 80).strokeColor('#5DADE2').lineWidth(1).stroke();
  return 95;
}

function createFooter(doc) {
  const y = 740;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(0.5).stroke();
  doc.fontSize(7).fillColor('#888')
     .text(`${COMPANY.name} · ${COMPANY.address} · ${COMPANY.city} · ${COMPANY.country}`, 50, y + 8, { align: 'center', width: 495 })
     .text(`${COMPANY.email} · ${COMPANY.web}`, 50, y + 18, { align: 'center', width: 495 });
}

function generateInvoicePDF(order, items, invoiceNumber) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = createHeader(doc);

    // Invoice title
    doc.fontSize(16).fillColor('#2D3436').text('Rechnung', 50, y);
    y += 30;

    // Invoice details
    doc.fontSize(9).fillColor('#333');
    const addr = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;
    doc.text(`${addr?.first_name || ''} ${addr?.last_name || ''}`, 50, y);
    doc.text(addr?.street || '', 50, y + 12);
    doc.text(`${addr?.postalCode || addr?.zip || ''} ${addr?.city || ''}`, 50, y + 24);
    doc.text(addr?.country || '', 50, y + 36);

    doc.text(`Rechnungsnummer: ${invoiceNumber || order.order_number}`, 350, y);
    doc.text(`Bestellnummer: ${order.order_number}`, 350, y + 12);
    doc.text(`Datum: ${new Date(order.created_at).toLocaleDateString('de-AT')}`, 350, y + 24);
    doc.text(`Zahlungsstatus: ${order.payment_status === 'paid' ? 'Bezahlt' : 'Offen'}`, 350, y + 36);
    y += 65;

    // Table header
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#2D3436').lineWidth(0.5).stroke();
    y += 5;
    doc.fontSize(8).fillColor('#666').font('Helvetica-Bold');
    doc.text('Artikel', 50, y); doc.text('SKU', 250, y); doc.text('Menge', 330, y, { align: 'center', width: 40 });
    doc.text('Einzelpreis', 390, y, { align: 'right', width: 70 }); doc.text('Gesamt', 475, y, { align: 'right', width: 70 });
    y += 15;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(0.5).stroke();
    y += 8;

    // Items
    doc.font('Helvetica').fillColor('#333');
    for (const item of items) {
      doc.fontSize(9).text(item.product_name, 50, y, { width: 190 });
      doc.text(item.product_sku || '', 250, y);
      doc.text(String(item.quantity), 330, y, { align: 'center', width: 40 });
      doc.text(`€${parseFloat(item.unit_price).toFixed(2)}`, 390, y, { align: 'right', width: 70 });
      doc.text(`€${parseFloat(item.total_price).toFixed(2)}`, 475, y, { align: 'right', width: 70 });
      y += 18;
    }

    // Totals
    y += 10;
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#ddd').lineWidth(0.5).stroke();
    y += 8;
    doc.fontSize(9);
    doc.text('Zwischensumme:', 350, y); doc.text(`€${parseFloat(order.subtotal).toFixed(2)}`, 475, y, { align: 'right', width: 70 });
    y += 15;
    doc.text('Versand:', 350, y); doc.text(parseFloat(order.shipping_cost) === 0 ? 'Kostenlos' : `€${parseFloat(order.shipping_cost).toFixed(2)}`, 475, y, { align: 'right', width: 70 });
    y += 15;
    const taxRate = parseFloat(order.tax_rate) || 20;
    doc.text(`MwSt (${taxRate}%):`, 350, y); doc.text(`€${parseFloat(order.tax_amount).toFixed(2)}`, 475, y, { align: 'right', width: 70 });
    y += 18;
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#2D3436').lineWidth(1).stroke();
    y += 8;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#2D3436');
    doc.text('Gesamt:', 350, y); doc.text(`€${parseFloat(order.total).toFixed(2)}`, 475, y, { align: 'right', width: 70 });

    // Legal note
    y += 40;
    doc.font('Helvetica').fontSize(7).fillColor('#888');
    doc.text('Preise inkl. MwSt. Widerrufsrecht: 14 Tage. Es gelten unsere AGB.', 50, y);

    createFooter(doc);
    doc.end();
  });
}

function generateCommissionStatementPDF(partner, commissions, period) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = createHeader(doc);

    doc.fontSize(16).fillColor('#2D3436').text('Provisionsgutschrift', 50, y);
    y += 30;

    // Partner info
    doc.fontSize(9).fillColor('#333');
    doc.text(`Partner: ${partner.first_name} ${partner.last_name}`, 50, y);
    doc.text(`Empfehlungscode: ${partner.referral_code}`, 50, y + 12);
    if (partner.company_name) doc.text(`Firma: ${partner.company_name}`, 50, y + 24);
    if (partner.tax_id) doc.text(`Steuer-Nr: ${partner.tax_id}`, 50, y + 36);

    doc.text(`Zeitraum: ${period}`, 350, y);
    doc.text(`Erstellt: ${new Date().toLocaleDateString('de-AT')}`, 350, y + 12);
    doc.text(`Rang: ${partner.rank_name || 'Starter'}`, 350, y + 24);
    y += 65;

    // Table
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#2D3436').lineWidth(0.5).stroke();
    y += 5;
    doc.fontSize(8).fillColor('#666').font('Helvetica-Bold');
    doc.text('Datum', 50, y); doc.text('Typ', 130, y); doc.text('Beschreibung', 220, y);
    doc.text('%', 410, y, { align: 'right', width: 30 }); doc.text('Betrag', 455, y, { align: 'right', width: 90 });
    y += 15;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#ddd').lineWidth(0.5).stroke();
    y += 8;

    doc.font('Helvetica').fillColor('#333');
    const typeLabels = { direct_sale: 'Direktverkauf', difference: 'Differenz', leadership_bonus: 'Leadership', team_volume_bonus: 'Team Vol.', rank_bonus: 'Rang-Bonus' };
    let totalAmount = 0;

    for (const c of commissions) {
      if (y > 700) { doc.addPage(); y = 50; }
      doc.fontSize(8);
      doc.text(new Date(c.created_at).toLocaleDateString('de-AT'), 50, y);
      doc.text(typeLabels[c.type] || c.type, 130, y);
      doc.text(c.description || '', 220, y, { width: 180 });
      doc.text(`${c.percentage}%`, 410, y, { align: 'right', width: 30 });
      doc.text(`€${parseFloat(c.amount).toFixed(2)}`, 455, y, { align: 'right', width: 90 });
      totalAmount += parseFloat(c.amount);
      y += 16;
    }

    y += 10;
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#2D3436').lineWidth(1).stroke();
    y += 8;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#2D3436');
    doc.text('Gesamtprovision:', 350, y); doc.text(`€${totalAmount.toFixed(2)}`, 455, y, { align: 'right', width: 90 });

    // Bank details
    y += 35;
    doc.font('Helvetica').fontSize(8).fillColor('#333');
    if (partner.iban) {
      doc.text('Auszahlung an:', 50, y);
      doc.text(`IBAN: ${partner.iban}`, 50, y + 12);
      if (partner.bic) doc.text(`BIC: ${partner.bic}`, 50, y + 24);
    }

    createFooter(doc);
    doc.end();
  });
}

module.exports = { generateInvoicePDF, generateCommissionStatementPDF };
