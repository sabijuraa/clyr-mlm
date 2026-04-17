// server/src/services/invoice.service.js
// GROUP 4: Invoice & Commission Statement PDFs
// #1: Customer invoices, #29: CLYR branding, #30: Provisionsgutschrift, #31: Download as PDF
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// CLYR BRANDING DEFAULTS (#29)
// ==========================================
const CLYR_DEFAULTS = {
  name: 'CLYR Solutions GmbH',
  address: 'Pappelweg 4b',
  zip: '9524',
  city: 'Villach',
  country: 'Oesterreich',
  email: 'service@clyr.shop',
  website: 'www.clyr.shop',
  phone: '',
  uid: 'ATU83027635',
  iban: '',
  bic: '',
  bank: '',
};

const COLORS = {
  primary: '#1a3a4a',
  accent: '#2dd4bf',
  text: '#1f2937',
  textLight: '#6b7280',
  border: '#e5e7eb',
  bgLight: '#f9fafb',
};

class InvoiceService {

  async getCompanyInfo() {
    try {
      const result = await pool.query('SELECT * FROM company_settings WHERE id = 1');
      if (result.rows.length > 0) {
        const c = result.rows[0];
        return {
          name: c.company_legal_name || c.company_name || CLYR_DEFAULTS.name,
          address: c.address_line1 || CLYR_DEFAULTS.address,
          zip: c.postal_code || CLYR_DEFAULTS.zip,
          city: c.city || CLYR_DEFAULTS.city,
          country: c.country || CLYR_DEFAULTS.country,
          email: c.email || CLYR_DEFAULTS.email,
          website: c.website || CLYR_DEFAULTS.website,
          phone: c.phone || CLYR_DEFAULTS.phone,
          uid: c.tax_id || CLYR_DEFAULTS.uid,
          iban: c.iban || CLYR_DEFAULTS.iban,
          bic: c.bic || CLYR_DEFAULTS.bic,
          bank: c.bank_name || CLYR_DEFAULTS.bank,
        };
      }
    } catch (e) { /* fallback */ }
    return CLYR_DEFAULTS;
  }

  getLogoPath() {
    const candidates = [
      path.join(__dirname, '../../uploads/branding/logo.png'),
      path.join(__dirname, '../../uploads/branding/logo.jpeg'),
      path.join(__dirname, '../../uploads/branding/logo.jpg'),
      path.join(__dirname, '../../public/images/clyr-logo.png'),
      path.join(__dirname, '../../public/images/clyr-logo.jpeg'),
      path.join(__dirname, '../../public/images/clyr-logo.jpg'),
      path.join(__dirname, '../../../client/public/images/clyr-logo.png'),
      path.join(__dirname, '../../../client/public/images/clyr-logo.jpeg'),
      path.join(__dirname, '../../../client/public/images/clyr-logo.jpg'),
      path.join(__dirname, '../../../client/dist/images/clyr-logo.png'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        console.log('Logo found at:', p);
        return p;
      }
    }
    console.log('No logo file found, checked:', candidates.map(c => c.split('/').slice(-3).join('/')));
    return null;
  }

  drawHeader(doc, company, title) {
    const logoPath = this.getLogoPath();
    if (logoPath) {
      try {
        doc.image(logoPath, 50, 35, { width: 120 });
      } catch (e) {
        console.error('Logo loading failed:', e.message, 'Path:', logoPath);
      }
    }
    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.primary)
       .text(title, 300, 45, { align: 'right', width: 245 });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.textLight)
       .text(`${company.name} | ${company.address} | ${company.zip} ${company.city}`, 50, 100, { width: 300 });
    return 115;
  }

  drawFooter(doc, company) {
    const y = 760;
    doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(COLORS.textLight);
    doc.text(`${company.name} | ${company.address}, ${company.zip} ${company.city}`, 50, y + 5, { align: 'center', width: 495 });
    const line2 = [company.email && `E-Mail: ${company.email}`, company.website && `Web: ${company.website}`, company.uid && `UID: ${company.uid}`].filter(Boolean).join(' | ');
    if (line2) doc.text(line2, 50, y + 15, { align: 'center', width: 495 });
    const line3 = [company.iban && `IBAN: ${company.iban}`, company.bic && `BIC: ${company.bic}`, company.bank].filter(Boolean).join(' | ');
    if (line3) doc.text(line3, 50, y + 25, { align: 'center', width: 495 });
  }

  // ==========================================
  // #1 + #29 + #31: CUSTOMER INVOICE PDF (returns Buffer)
  // ==========================================
  async generateInvoicePDFBuffer(order) {
    const company = await this.getCompanyInfo();
    const items = order.items || [];

    let invoiceNumber = order.invoice_number;
    if (!invoiceNumber) {
      invoiceNumber = await this.getNextInvoiceNumber();
      await pool.query('UPDATE orders SET invoice_number = $1, invoice_generated_at = CURRENT_TIMESTAMP WHERE id = $2', [invoiceNumber, order.id]).catch(() => {});
    }
    const invoiceDate = order.invoice_generated_at || order.created_at || new Date();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let y = this.drawHeader(doc, company, 'RECHNUNG');

        // Invoice meta
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        doc.text(`Rechnungsnr.: ${invoiceNumber}`, 350, y, { align: 'right', width: 195 });
        doc.text(`Datum: ${new Date(invoiceDate).toLocaleDateString('de-DE')}`, 350, y + 13, { align: 'right', width: 195 });
        doc.text(`Bestellnr.: ${order.order_number || ''}`, 350, y + 26, { align: 'right', width: 195 });

        // Billing address
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary).text('Rechnungsadresse:', 50, y);
        y += 14;
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        if (order.customer_company) { doc.text(order.customer_company, 50, y); y += 12; }
        const custName = `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim();
        if (custName) { doc.text(custName, 50, y); y += 12; }
        if (order.billing_street) { doc.text(order.billing_street, 50, y); y += 12; }
        const cityLine = `${order.billing_zip || ''} ${order.billing_city || ''}`.trim();
        if (cityLine) { doc.text(cityLine, 50, y); y += 12; }
        const cNames = { DE: 'Deutschland', AT: 'Oesterreich', CH: 'Schweiz' };
        if (order.billing_country) { doc.text(cNames[order.billing_country] || order.billing_country, 50, y); y += 12; }
        if (order.customer_vat_id) { doc.fontSize(8).fillColor(COLORS.textLight).text(`UID-Nr.: ${order.customer_vat_id}`, 50, y); y += 12; }

        y = Math.max(y, 195) + 15;
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
        y += 12;

        // Table header
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary);
        doc.text('Pos', 50, y, { width: 30 });
        doc.text('Beschreibung', 80, y, { width: 230 });
        doc.text('Menge', 310, y, { width: 50, align: 'center' });
        doc.text('Einzelpreis', 370, y, { width: 80, align: 'right' });
        doc.text('Summe', 460, y, { width: 85, align: 'right' });
        y += 16;
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.3).strokeColor(COLORS.border).stroke();
        y += 8;

        // Table rows
        doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.text);
        items.forEach((item, idx) => {
          const price = parseFloat(item.product_price || item.price || 0);
          const qty = parseInt(item.quantity || 1);
          const lineTotal = parseFloat(item.total || (price * qty));

          if (idx % 2 === 1) { doc.rect(50, y - 3, 495, 18).fill(COLORS.bgLight); doc.fillColor(COLORS.text); }

          doc.text(`${idx + 1}`, 50, y, { width: 30 });
          doc.text(item.product_name || item.name || '', 80, y, { width: 230 });
          doc.text(`${qty}`, 310, y, { width: 50, align: 'center' });
          doc.text(`${price.toFixed(2)} EUR`, 370, y, { width: 80, align: 'right' });
          doc.text(`${lineTotal.toFixed(2)} EUR`, 460, y, { width: 85, align: 'right' });
          y += 18;
        });

        y += 5;
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
        y += 12;

        // Totals
        const subtotal = parseFloat(order.subtotal || 0);
        const shippingCost = parseFloat(order.shipping_cost || 0);
        const vatRate = parseFloat(order.vat_rate || 0);
        const vatAmount = parseFloat(order.vat_amount || 0);
        const discountAmount = parseFloat(order.discount_amount || 0);
        const total = parseFloat(order.total || 0);
        const isRC = order.is_reverse_charge || (order.billing_country === 'DE' && !!order.customer_vat_id);

        const tLine = (label, val, bold) => {
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COLORS.text);
          doc.text(label, 340, y, { width: 110, align: 'right' });
          doc.text(`${val.toFixed(2)} EUR`, 460, y, { width: 85, align: 'right' });
          y += 16;
        };

        tLine('Zwischensumme (netto):', subtotal);
        if (shippingCost > 0) tLine('Versandkosten:', shippingCost);
        if (discountAmount > 0) { doc.font('Helvetica').fontSize(9).fillColor(COLORS.text); doc.text('Rabatt:', 340, y, { width: 110, align: 'right' }); doc.text(`-${discountAmount.toFixed(2)} EUR`, 460, y, { width: 85, align: 'right' }); y += 16; }

        if (isRC) {
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.textLight);
          doc.text('Reverse Charge - Steuerschuldnerschaft des Leistungsempfaengers', 50, y);
          y += 12;
          tLine('MwSt. (0% RC):', 0);
        } else if (vatRate > 0) {
          tLine(`MwSt. (${vatRate}%):`, vatAmount);
        } else {
          tLine('MwSt. (0%):', 0);
        }

        y += 4;
        doc.moveTo(350, y).lineTo(545, y).lineWidth(0.5).strokeColor(COLORS.primary).stroke();
        y += 8;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary);
        doc.text('Gesamtbetrag:', 340, y, { width: 110, align: 'right' });
        doc.text(`${total.toFixed(2)} EUR`, 460, y, { width: 85, align: 'right' });
        y += 30;

        if (isRC) {
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.textLight);
          doc.text('Hinweis: Innergemeinschaftliche Lieferung. Die Steuerschuld geht auf den Leistungsempfaenger ueber.', 50, y);
          y += 18;
        }

        if (order.billing_country === 'CH' && vatRate > 0) {
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.textLight);
          doc.text(`Schweizer MwSt. ${vatRate}% gemaess Schweizer Steuerrecht.`, 50, y);
          y += 18;
        }

        // Payment info
        if (company.iban && y < 710) {
          y += 5;
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary).text('Zahlungsinformationen:', 50, y);
          y += 12;
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
          doc.text([company.iban && `IBAN: ${company.iban}`, company.bic && `BIC: ${company.bic}`, company.bank].filter(Boolean).join('  |  '), 50, y);
          y += 12;
          doc.text(`Verwendungszweck: ${invoiceNumber}`, 50, y);
        }

        this.drawFooter(doc, company);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==========================================
  // PROVISIONSGUTSCHRIFT — proper monthly commission statement
  // ==========================================
  async generateCommissionStatementBuffer(partner, commissions, periodLabel, payoutRecord = null) {
    const company  = await this.getCompanyInfo();
    const now      = new Date();
    // Derive year/month from periodLabel (e.g. "März 2026") — authoritative source
    const MONTHS = { januar:1,februar:2,märz:3,april:4,mai:5,juni:6,
                     juli:7,august:8,september:9,oktober:10,november:11,dezember:12 };
    const labelParts = (periodLabel || '').toLowerCase().split(' ');
    const labelMonth = MONTHS[labelParts[0]] || (now.getMonth() + 1);
    const labelYear  = parseInt(labelParts[1]) || now.getFullYear();
    const yr         = labelYear;
    const mo         = String(labelMonth).padStart(2, '0');
    // Short statement number: PG-YYYYMM-XXXX (last 4 chars only)
    // Defensive: ensure partner.id is a string before calling .replace
    const partnerIdStr = String(partner?.id || '').replace(/-/g, '');
    const shortId    = (partnerIdStr.slice(-4) || 'XXXX').toUpperCase();
    const shortYear  = String(yr).slice(-2);
    const stmtNr     = `PG-${shortYear}${mo}-${shortId}`;

    // Payout date = 1st of the month FOLLOWING the period
    // (March commissions → paid 1st April)
    const payoutDate = new Date(yr, labelMonth, 1); // labelMonth is 1-indexed, so this gives 1st of next month

    const netTotal = commissions.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const country  = (partner.country || 'AT').toUpperCase();
    const hasUid   = !!partner.vat_id;

    let vatRate = 0, vatLabel = '', vatNote = '';
    if      (country === 'AT' && hasUid)  { vatRate = 20; vatLabel = 'USt. 20% (AT)';    vatNote = 'Umsatzsteuer 20 % gemäß österreichischem UStG.'; }
    else if (country === 'AT' && !hasUid) { vatNote = 'Steuerbefreit gemäß § 6 Abs. 1 Z 27 UStG (Kleinunternehmerregelung).'; }
    else if (country === 'DE' && hasUid)  { vatNote = 'Steuerschuldnerschaft des Leistungsempfängers gem. § 13b UStG (Reverse Charge).'; }
    else if (country === 'DE' && !hasUid) { vatRate = 19; vatLabel = 'USt. 19% (DE)';    vatNote = 'Umsatzsteuer 19 % gemäß deutschem UStG.'; }
    else if (country === 'CH')            { vatNote = 'Nicht steuerbar – Leistungsempfänger im Drittland (Schweiz).'; }

    const vatAmt   = vatRate > 0 ? Math.round(netTotal * vatRate / 100 * 100) / 100 : 0;
    const gross    = netTotal + vatAmt;

    // Use authoritative payout record values if present
    const pNet     = payoutRecord ? parseFloat(payoutRecord.net_amount  || netTotal) : netTotal;
    const pVat     = payoutRecord ? parseFloat(payoutRecord.vat_amount  || vatAmt)   : vatAmt;
    const pGross   = payoutRecord ? parseFloat(payoutRecord.gross_amount || gross)    : gross;
    const pDate    = payoutRecord?.created_at ? new Date(payoutRecord.created_at).toLocaleDateString('de-DE') : now.toLocaleDateString('de-DE');
    const pMethod  = payoutRecord?.method === 'stripe' ? 'Stripe (automatische Überweisung)' : 'SEPA-Banküberweisung';
    const pRef     = payoutRecord?.reference || '';
    const pStatus  = payoutRecord?.status || 'pending';

    const typeLabels = {
      direct:'Direktprovision', difference:'Differenzprovision',
      leadership_bonus:'Führungsbonus', team_volume_bonus:'Teamumsatz-Bonus',
      rank_bonus:'Rangbonus', bonus_pool:'Bonuspool',
      override:'Override', matching_bonus:'Matching Bonus'
    };

    const EUR = (n) => `€ ${parseFloat(n||0).toFixed(2)}`;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks = [];
        doc.on('data', d => chunks.push(d));
        doc.on('end',  () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let y = this.drawHeader(doc, company, 'PROVISIONSGUTSCHRIFT');

        // ── RIGHT META BLOCK (no overlap — placed before address) ──
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        doc.text(`Gutschrift-Nr.: ${stmtNr}`,  350, y,      { width: 195, align: 'right' });
        doc.text(`Abrechnungsmonat: ${periodLabel}`,        350, y + 14, { width: 195, align: 'right' });
        doc.text(`Auszahlung: ${payoutDate.toLocaleDateString('de-DE')}`, 350, y + 28, { width: 195, align: 'right' });

        // ── LEFT: PARTNER ADDRESS ──
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary).text('Empfänger:', 50, y);
        let ay = y + 14;
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        const nm = `${partner.first_name||''} ${partner.last_name||''}`.trim();
        if (nm)              { doc.text(nm, 50, ay);             ay += 12; }
        if (partner.company) { doc.text(partner.company, 50, ay); ay += 12; }
        if (partner.street)  { doc.text(partner.street, 50, ay);  ay += 12; }
        const city = `${partner.zip||''} ${partner.city||''}`.trim();
        if (city)            { doc.text(city, 50, ay);           ay += 12; }
        if (partner.country) { doc.text(partner.country, 50, ay); ay += 12; }
        if (partner.vat_id)  { doc.fontSize(8).fillColor(COLORS.textLight).text(`UID-Nr.: ${partner.vat_id}`, 50, ay); ay += 12; }

        y = Math.max(ay, y + 50) + 16;
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
        y += 14;

        // ── COMMISSION TABLE ──
        const cols = { date:50, order:112, type:200, basis:340, rate:415, amt:455 };
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary);
        doc.text('Datum',             cols.date,  y, { width: 60 });
        doc.text('Bestellung',        cols.order, y, { width: 86 });
        doc.text('Art der Provision', cols.type,  y, { width: 138 });
        doc.text('Basis (€)',         cols.basis, y, { width: 73, align: 'right' });
        doc.text('Satz',              cols.rate,  y, { width: 38, align: 'right' });
        doc.text('Betrag (€)',        cols.amt,   y, { width: 90, align: 'right' });
        y += 13;
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.3).strokeColor(COLORS.border).stroke();
        y += 7;

        doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
        commissions.forEach((comm, i) => {
          if (y > 660) { doc.addPage(); y = 50; }
          if (i % 2 === 1) { doc.rect(50, y - 2, 495, 15).fill('#F7F8FA'); doc.fillColor(COLORS.text); }
          const amt   = parseFloat(comm.amount || 0);
          const basis = comm.base_amount ? parseFloat(comm.base_amount).toFixed(2) : (comm.order_total ? parseFloat(comm.order_total).toFixed(2) : '—');
          const rate  = comm.rate ? `${parseFloat(comm.rate).toFixed(0)}%` : comm.type === 'difference' ? '—' : '—';
          doc.text(new Date(comm.order_date || comm.created_at).toLocaleDateString('de-DE'), cols.date,  y, { width: 60 });
          doc.text(comm.order_number || '—',                               cols.order, y, { width: 86 });
          doc.text(typeLabels[comm.type] || comm.type,                     cols.type,  y, { width: 138 });
          doc.text(basis,                                                   cols.basis, y, { width: 73, align: 'right' });
          doc.text(rate,                                                    cols.rate,  y, { width: 38, align: 'right' });
          doc.text(amt.toFixed(2),                                          cols.amt,   y, { width: 90, align: 'right' });
          y += 15;
        });

        // ── TOTALS ──
        y += 8;
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
        y += 12;

        const totRow = (lbl, val, bold = false) => {
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(bold ? COLORS.primary : COLORS.text);
          doc.text(lbl, 330, y, { width: 115, align: 'right' });
          doc.text(val, 455, y, { width: 90,  align: 'right' });
          y += 16;
        };
        totRow('Netto-Provision:', `${pNet.toFixed(2)} EUR`);
        if (vatRate > 0) totRow(`${vatLabel}:`, `${pVat.toFixed(2)} EUR`);
        doc.moveTo(340, y).lineTo(545, y).lineWidth(0.8).strokeColor(COLORS.primary).stroke();
        y += 6;
        totRow('AUSZAHLUNGSBETRAG:', `${pGross.toFixed(2)} EUR`, true);

        // ── PAYOUT DETAILS BOX ──
        y += 10;
        if (y > 640) { doc.addPage(); y = 50; }
        const boxH = 70;
        doc.rect(50, y, 495, boxH).fill('#EEF2FF');
        doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(9).text('Auszahlungsdetails', 62, y + 8);
        doc.font('Helvetica').fontSize(8.5).fillColor('#333');
        doc.text(`Auszahlungsdatum:   ${payoutDate.toLocaleDateString('de-DE')}`, 62, y + 22);
        doc.text(`Zahlungsmethode:    ${pMethod}`,    62, y + 35);
        doc.text(`Status:             ${pStatus === 'processing' ? 'Übermittelt' : pStatus === 'paid' ? 'Abgeschlossen' : 'Ausstehend'}`, 62, y + 48);
        if (pRef) doc.text(`Referenz:           ${pRef}`, 300, y + 22);
        y += boxH + 14;

        // ── VAT NOTE ──
        if (vatNote) {
          doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.textLight).text(vatNote, 50, y, { width: 495 });
          y += 18;
        }

        // ── BANK / IBAN ──
        if (partner.iban) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary).text('Auszahlung an:', 50, y);
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.text).text(
            `IBAN: ${partner.iban}${partner.bic ? '   BIC: ' + partner.bic : ''}`, 155, y
          );
        }

        this.drawFooter(doc, company);
        doc.end();
      } catch(err) { reject(err); }
    });
  }

  // ==========================================
  // GENERATE + STORE INVOICE (auto on order)
  // ==========================================
  async generateInvoice(orderId) {
    try {
      const orderResult = await pool.query(`
        SELECT o.*, c.first_name, c.last_name, c.email, c.phone,
               c.street, c.zip, c.city, c.country, c.company, c.vat_id
        FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `, [orderId]);
      if (orderResult.rows.length === 0) throw new Error('Order not found');
      const order = orderResult.rows[0];

      const itemsResult = await pool.query(`
        SELECT oi.*, p.name, p.description
        FROM order_items oi JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [orderId]);
      order.items = itemsResult.rows;

      const invoiceNumber = await this.getNextInvoiceNumber();
      const subtotal = parseFloat(order.subtotal || 0);
      const shipping = parseFloat(order.shipping_cost || 0);
      const customerCountry = order.billing_country || 'AT';
      const hasVatId = !!(order.customer_vat_id || order.vat_id);

      let taxRate;
      if (customerCountry === 'DE' && hasVatId) taxRate = 0;
      else if (customerCountry === 'DE') taxRate = 19;
      else if (customerCountry === 'AT') taxRate = 20;
      else if (customerCountry === 'CH') taxRate = 8.1;
      else taxRate = 20;

      const isReverseCharge = customerCountry === 'DE' && hasVatId;
      const netAmount = subtotal + shipping;
      const taxAmount = Math.round(netAmount * (taxRate / 100) * 100) / 100;
      const total = netAmount + taxAmount;

      const invoiceResult = await pool.query(`
        INSERT INTO invoices (invoice_number, type, order_id, customer_id,
          net_amount, vat_rate, vat_amount, gross_amount, vat_type, pdf_generated_at)
        VALUES ($1, 'customer', $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *
      `, [invoiceNumber, orderId, order.customer_id, netAmount, taxRate, taxAmount, total,
          isReverseCharge ? 'reverse_charge' : 'standard']);

      const invoice = invoiceResult.rows[0];
      await pool.query('UPDATE orders SET invoice_number = $1, invoice_generated_at = CURRENT_TIMESTAMP WHERE id = $2', [invoiceNumber, orderId]);

      order.invoice_number = invoiceNumber;
      const pdfBuffer = await this.generateInvoicePDFBuffer(order);

      const invoiceDir = path.join(__dirname, '../../public/invoices');
      if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });
      fs.writeFileSync(path.join(invoiceDir, `${invoiceNumber}.pdf`), pdfBuffer);

      const pdfUrl = `/invoices/${invoiceNumber}.pdf`;
      await pool.query('UPDATE invoices SET pdf_url = $1 WHERE id = $2', [pdfUrl, invoice.id]);

      return { ...invoice, pdf_url: pdfUrl };
    } catch (error) {
      console.error('Invoice generation error:', error);
      throw error;
    }
  }

  // LEGACY compatibility wrappers
  async generateInvoicePDF(orderData, invoiceNumber) {
    if (!orderData.items) {
      const r = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderData.id]).catch(() => ({ rows: [] }));
      orderData.items = r.rows;
    }
    if (invoiceNumber) orderData.invoice_number = invoiceNumber;
    return this.generateInvoicePDFBuffer(orderData);
  }

  async generateCommissionStatement(partnerOrData, commissionsOrNumber, periodLabel, payoutRecord = null) {
    if (Array.isArray(commissionsOrNumber)) {
      return this.generateCommissionStatementBuffer(partnerOrData, commissionsOrNumber, periodLabel, payoutRecord);
    }
    const data = partnerOrData;
    const partner = {
      id: data.partner_id || 0,
      first_name: data.partner_name?.split(' ')[0] || '',
      last_name: data.partner_name?.split(' ').slice(1).join(' ') || '',
      email: data.partner_email || '', country: 'AT', vat_id: null, iban: null
    };
    const commissions = (data.items || []).map(item => ({
      created_at: item.date, order_number: item.order_number, type: 'direct',
      amount: item.commission, order_amount: item.order_total, rate: null
    }));
    return this.generateCommissionStatementBuffer(partner, commissions, commissionsOrNumber || 'Statement', payoutRecord);
  }

  // ==========================================
  // HELPERS
  // ==========================================
  async getNextInvoiceNumber() {
    try {
      const result = await pool.query('SELECT generate_invoice_number()');
      return result.rows[0].generate_invoice_number;
    } catch (error) {
      const year = new Date().getFullYear();
      const countResult = await pool.query("SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1", [`RE-${year}-%`]).catch(() => ({ rows: [{ count: 0 }] }));
      const seq = parseInt(countResult.rows[0].count) + 1;
      return `RE-${year}-${String(seq).padStart(5, '0')}`;
    }
  }

  async getAllInvoices(type) {
    try {
      let whereClause = '';
      const params = [];
      if (type && type !== 'all') { whereClause = 'WHERE i.type = $1'; params.push(type); }
      const result = await pool.query(`
        SELECT i.*,
          COALESCE(c.first_name || ' ' || c.last_name, '') as customer_name,
          COALESCE(u.first_name || ' ' || u.last_name, '') as partner_name,
          o.order_number
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN orders o ON i.order_id = o.id
        LEFT JOIN users u ON i.user_id = u.id
        ${whereClause}
        ORDER BY i.created_at DESC
      `, params);
      return result.rows;
    } catch (error) {
      console.error('Get all invoices error:', error);
      return [];
    }
  }

  async getInvoiceById(invoiceId) {
    const result = await pool.query(`
      SELECT i.*, c.first_name as customer_first_name, c.last_name as customer_last_name,
        c.email as customer_email, c.street as customer_street,
        c.city as customer_city, c.zip as customer_zip, c.country as customer_country
      FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [invoiceId]);
    if (result.rows.length === 0) throw new Error('Invoice not found');
    return result.rows[0];
  }

  async getInvoiceByOrderId(orderId) {
    const result = await pool.query('SELECT * FROM invoices WHERE order_id = $1', [orderId]);
    return result.rows[0] || null;
  }
}

const invoiceService = new InvoiceService();

/**
 * Generate PDF invoice for partner annual fee
 */
export const generatePartnerFeeInvoicePDF = async (partner, amount) => {
  const company = await invoiceService.getCompanyInfo();
  const invoiceNumber = await invoiceService.getNextInvoiceNumber();
  const invoiceDate = new Date();

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), invoiceNumber }));
      doc.on('error', reject);

      let y = invoiceService.drawHeader(doc, company, 'RECHNUNG');

      // Invoice meta
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
      doc.text(`Rechnungsnr.: ${invoiceNumber}`, 350, y, { align: 'right', width: 195 });
      doc.text(`Datum: ${invoiceDate.toLocaleDateString('de-DE')}`, 350, y + 13, { align: 'right', width: 195 });

      // Partner address
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary).text('Rechnungsadresse:', 50, y);
      y += 14;
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
      const name = `${partner.first_name || ''} ${partner.last_name || ''}`.trim();
      if (partner.company) { doc.text(partner.company, 50, y); y += 12; }
      if (name) { doc.text(name, 50, y); y += 12; }
      if (partner.street) { doc.text(partner.street, 50, y); y += 12; }
      const cityLine = `${partner.zip || ''} ${partner.city || ''}`.trim();
      if (cityLine) { doc.text(cityLine, 50, y); y += 12; }
      const cNames = { DE: 'Deutschland', AT: 'Oesterreich', CH: 'Schweiz' };
      if (partner.country) { doc.text(cNames[partner.country] || partner.country, 50, y); y += 12; }
      if (partner.vat_id) { doc.fontSize(8).fillColor('#6B7280').text(`UID-Nr.: ${partner.vat_id}`, 50, y); y += 12; }

      y = Math.max(y, 195) + 15;
      doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor('#E5E7EB').stroke();
      y += 12;

      // Table header
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary);
      doc.text('Pos', 50, y, { width: 30 });
      doc.text('Beschreibung', 80, y, { width: 280 });
      doc.text('Netto', 440, y, { width: 100, align: 'right' });
      y += 18;
      doc.moveTo(50, y - 4).lineTo(545, y - 4).lineWidth(0.3).strokeColor('#E5E7EB').stroke();

      // Line item
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
      doc.text('1', 50, y, { width: 30 });
      doc.text(`CLYR Vertriebspartner Jahresgebuehr ${invoiceDate.getFullYear()} (anteilig)`, 80, y, { width: 280 });
      doc.text(`EUR ${amount.toFixed(2)}`, 440, y, { width: 100, align: 'right' });
      y += 25;

      // Totals
      doc.moveTo(350, y).lineTo(545, y).lineWidth(0.5).strokeColor('#E5E7EB').stroke();
      y += 8;
      doc.font('Helvetica').fontSize(9);
      doc.text('Nettobetrag:', 350, y, { width: 90, align: 'right' });
      doc.text(`EUR ${amount.toFixed(2)}`, 440, y, { width: 100, align: 'right' });
      y += 14;

      // VAT handling based on partner country
      let vatAmount = 0;
      let vatNote = '';
      if (partner.country === 'AT' && !partner.vat_id) {
        vatAmount = Math.round(amount * 0.20 * 100) / 100;
        doc.text('20% MwSt.:', 350, y, { width: 90, align: 'right' });
        doc.text(`EUR ${vatAmount.toFixed(2)}`, 440, y, { width: 100, align: 'right' });
        y += 14;
      } else if (partner.country === 'AT' && partner.vat_id) {
        vatNote = 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfaengers';
      } else if (partner.country === 'DE') {
        vatNote = 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfaengers';
      } else {
        vatNote = 'Steuerfreie Leistung';
      }

      const total = amount + vatAmount;
      y += 2;
      doc.moveTo(350, y).lineTo(545, y).lineWidth(1).strokeColor(COLORS.primary).stroke();
      y += 8;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary);
      doc.text('Gesamtbetrag:', 350, y, { width: 90, align: 'right' });
      doc.text(`EUR ${total.toFixed(2)}`, 440, y, { width: 100, align: 'right' });
      y += 25;

      if (vatNote) {
        doc.font('Helvetica').fontSize(8).fillColor('#6B7280');
        doc.text(vatNote, 50, y);
        y += 14;
      }

      // Payment note
      y += 10;
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
      doc.text('Zahlung erfolgt per Stripe. Betrag wurde bereits abgebucht.', 50, y);
      y += 20;
      doc.text('Vielen Dank fuer Ihr Vertrauen!', 50, y);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export const generateInvoice = (orderId) => invoiceService.generateInvoice(orderId);
export const generateInvoicePDF = (orderData, invoiceNumber) => invoiceService.generateInvoicePDF(orderData, invoiceNumber);
export const generateCommissionStatement = (a, b, c, d) => invoiceService.generateCommissionStatement(a, b, c, d);
export const getAllInvoices = (type) => invoiceService.getAllInvoices(type);
export const getInvoiceById = (invoiceId) => invoiceService.getInvoiceById(invoiceId);
export const getInvoiceByOrderId = (orderId) => invoiceService.getInvoiceByOrderId(orderId);

export default invoiceService;
