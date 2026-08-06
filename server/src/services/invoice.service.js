// server/src/services/invoice.service.js
// GROUP 4: Invoice & Commission Statement PDFs
// #1: Customer invoices, #29: CLYR branding, #30: Provisionsgutschrift, #31: Download as PDF
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import { calculateVatRule, getVatIdValidation, splitGrossAmount } from './tax.service.js';

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

const formatVariantDescription = (item = {}) => {
  if (item.variant_description) return String(item.variant_description);

  let variantData = item.variant_data;
  if (typeof variantData === 'string') {
    try {
      variantData = JSON.parse(variantData);
    } catch {
      variantData = null;
    }
  }

  if (!variantData || typeof variantData !== 'object') return '';

  return Object.entries(variantData)
    .map(([type, option]) => {
      if (!option) return null;
      const name = option.name || option.label || option.title;
      if (!name) return null;
      const typeLabel = type
        ? `${String(type).charAt(0).toUpperCase()}${String(type).slice(1)}: `
        : '';
      return `${typeLabel}${name}`;
    })
    .filter(Boolean)
    .join(', ');
};

const toDate = (value) => (value ? new Date(value) : new Date());

const calculateAffiliateFeeVatRule = async ({ country, vatId, date = new Date() } = {}) => {
  let vatIdValid = null;
  if (vatId) {
    const validation = await getVatIdValidation(vatId, country);
    vatIdValid = validation.usableForReverseCharge;
  }

  return calculateVatRule({ country, vatId, date, vatIdValid });
};

const REAL_INVOICE_WHERE = `
  (
    (type = 'customer' AND order_id IS NOT NULL)
    OR (type = 'fee' AND subscription_payment_id IS NOT NULL)
  )
`;

const INVOICEABLE_ORDER_WHERE = `
  o.status NOT IN ('cancelled', 'refunded', 'disputed')
  AND (
    o.payment_status IN ('paid', 'partially_refunded')
    OR o.status IN ('processing', 'shipped', 'delivered', 'completed', 'pending')
  )
`;

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
    const invoiceDate = order.created_at || order.invoice_generated_at || new Date();

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
        // BUG FIX (Aug 6, 2026 — admin list showed 24.6.2026, PDF showed 23.6.2026
        // for the same invoice): the PDF was formatted using the server's
        // timezone (UTC) while the admin list was formatted in the browser's
        // local timezone (Europe/Vienna), so any order placed late in the
        // evening UTC rolled over to the next calendar day on one side but
        // not the other. Both are now explicitly pinned to Europe/Vienna.
        doc.text(`Datum: ${new Date(invoiceDate).toLocaleDateString('de-DE', { timeZone: 'Europe/Vienna' })}`, 350, y + 13, { align: 'right', width: 195 });
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
          const variantDescription = formatVariantDescription(item);
          const productName = item.product_name || item.name || '';
          const descriptionHeight = doc.heightOfString(productName, { width: 230 });
          const variantHeight = variantDescription
            ? doc.heightOfString(`Variante: ${variantDescription}`, { width: 230 })
            : 0;
          const rowHeight = Math.max(22, descriptionHeight + variantHeight + 10);

          if (y + rowHeight > 735) {
            doc.addPage();
            y = 50;
          }

          if (idx % 2 === 1) {
            doc.rect(50, y - 3, 495, rowHeight).fill(COLORS.bgLight);
            doc.fillColor(COLORS.text);
          }

          doc.text(`${idx + 1}`, 50, y, { width: 30 });
          doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.text);
          doc.text(productName, 80, y, { width: 230 });
          if (variantDescription) {
            doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.textLight);
            doc.text(`Variante: ${variantDescription}`, 80, doc.y + 2, { width: 230 });
            doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.text);
          }
          doc.text(`${qty}`, 310, y, { width: 50, align: 'center' });
          doc.text(`${price.toFixed(2)} EUR`, 370, y, { width: 80, align: 'right' });
          doc.text(`${lineTotal.toFixed(2)} EUR`, 460, y, { width: 85, align: 'right' });
          y += rowHeight;
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
        const isRC = order.billing_country === 'DE' && (
          order.is_reverse_charge === true ||
          order.is_reverse_charge === 'true' ||
          (parseFloat(order.vat_rate || 0) === 0 && !!order.customer_vat_id)
        );

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
    // The payout record is authoritative.  A payout can happen on either
    // the 1st or the 15th, so deriving this date from the commission period
    // produced incorrect statement dates.
    const recordPayoutDate = payoutRecord && (
      payoutRecord.completed_at || payoutRecord.processed_at || payoutRecord.created_at
    );
    const parsedRecordPayoutDate = recordPayoutDate ? new Date(recordPayoutDate) : null;
    const payoutDate = parsedRecordPayoutDate && !Number.isNaN(parsedRecordPayoutDate.getTime())
      ? parsedRecordPayoutDate
      : new Date(yr, labelMonth, 1);
    let stmtNr = payoutRecord?.statement_number;
    if (!stmtNr) {
      const sequenceDate = payoutRecord?.created_at ? new Date(payoutRecord.created_at) : payoutDate;
      const seqYear = sequenceDate.getFullYear();
      const seqResult = await pool.query(
        `SELECT COUNT(*)::int + 1 as seq
         FROM payouts p
         JOIN users u ON u.id = p.user_id
         WHERE p.created_at >= date_trunc('year', $1::timestamp)
           AND p.created_at <= $1::timestamp
           AND p.status NOT IN ('cancelled')
           AND LOWER(u.email) <> 'technik@clyr.shop'`,
        [sequenceDate]
      ).catch(() => ({ rows: [{ seq: 1 }] }));
      stmtNr = `PG-${seqYear}-${String(seqResult.rows[0]?.seq || 1).padStart(3, '0')}`;
    }

    const netTotal = commissions.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
    const country  = (partner.country || 'AT').toUpperCase();
    const hasUid   = !!partner.vat_id;
    const uidValidation = hasUid ? await getVatIdValidation(partner.vat_id, country) : null;
    const hasValidUid = uidValidation?.usableForReverseCharge === true;

    let vatRate = 0, vatLabel = '', vatNote = '';
    if      (country === 'AT')            { vatRate = 20; vatLabel = 'USt. 20% (AT)';    vatNote = 'Umsatzsteuer 20 % gemaess oesterreichischem UStG.'; }
    else if (country === 'DE' && hasValidUid) { vatNote = 'Steuerschuldnerschaft des Leistungsempfaengers gem. Par. 13b UStG (Reverse Charge).'; }
    else if (country === 'DE')            { vatRate = 19; vatLabel = 'USt. 19% (DE)';    vatNote = 'Umsatzsteuer 19 % gemaess deutschem UStG.'; }
    else if (country === 'CH')            { vatNote = 'Nicht steuerbar - Leistungsempfaenger im Drittland (Schweiz).'; }

    const vatAmt   = vatRate > 0 ? Math.round(netTotal * vatRate / 100 * 100) / 100 : 0;
    const gross    = netTotal + vatAmt;

    // The statement totals must match the printed commission rows. Payout records
    // can be stale or cancelled, so use them only for metadata below.
    const pNet     = netTotal;
    const pVat     = vatAmt;
    const pGross   = gross;
    const payoutMethodLabels = {
      stripe: 'Stripe (automatische Überweisung)',
      sepa: 'SEPA-Banküberweisung',
      paypal: 'PayPal',
      manual: 'Manuelle Auszahlung',
    };
    const pMethod  = payoutMethodLabels[payoutRecord?.method] || 'Auszahlung';
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
        doc.text(`Abrechnungszeitraum: ${periodLabel}`,     350, y + 14, { width: 195, align: 'right' });
        doc.text(`Auszahlung: ${payoutDate.toLocaleDateString('de-DE', { timeZone: 'Europe/Vienna' })}`, 350, y + 28, { width: 195, align: 'right' });

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
        doc.text('Kunde',             cols.order, y, { width: 86 });
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
          doc.text(new Date(comm.order_date || comm.created_at).toLocaleDateString('de-DE', { timeZone: 'Europe/Vienna' }), cols.date,  y, { width: 60 });
          // Show customer name in the Bestellung column (not order number)
          const customerDisplay = comm.customer_name ||
            (comm.customer_first_name && comm.customer_last_name
              ? `${comm.customer_first_name} ${comm.customer_last_name}`.trim()
              : comm.order_number || '—');
          doc.text(customerDisplay, cols.order, y, { width: 86 });
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
        doc.text(`Auszahlungsdatum:   ${payoutDate.toLocaleDateString('de-DE', { timeZone: 'Europe/Vienna' })}`, 62, y + 22);
        doc.text(`Zahlungsmethode:    ${pMethod}`,    62, y + 35);
        doc.text(`Status:             ${pStatus === 'processing' ? 'Übermittelt' : ['paid', 'completed'].includes(pStatus) ? 'Abgeschlossen' : 'Ausstehend'}`, 62, y + 48);
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

      const subtotal = parseFloat(order.subtotal || 0);
      const discount = parseFloat(order.discount_amount || 0);
      const shipping = parseFloat(order.shipping_cost || 0);
      const customerCountry = order.billing_country || 'AT';
      const customerVatId = order.customer_vat_id || order.vat_id;
      const vatValidation = customerVatId
        ? await getVatIdValidation(customerVatId, customerCountry)
        : null;
      const taxRule = calculateVatRule({
        country: customerCountry,
        vatId: customerVatId,
        date: order.created_at || new Date(),
        vatIdValid: vatValidation ? vatValidation.usableForReverseCharge : null,
      });
      const taxRate = taxRule.vatRate;
      const isReverseCharge = taxRule.isReverseCharge;
      const discountedSubtotal = Math.max(0, subtotal - discount);
      const netAmount = Math.round((discountedSubtotal + shipping) * 100) / 100;
      const taxAmount = Math.round(netAmount * (taxRate / 100) * 100) / 100;
      const total = Math.round((netAmount + taxAmount) * 100) / 100;

      const existingInvoice = await pool.query(
        `SELECT * FROM invoices
         WHERE order_id = $1 AND type = 'customer'
         ORDER BY created_at ASC
         LIMIT 1`,
        [orderId]
      );

      let invoice;
      let invoiceNumber = existingInvoice.rows[0]?.invoice_number;
      if (invoiceNumber) {
        const invoiceResult = await pool.query(`
          UPDATE invoices
          SET customer_id = $1,
              net_amount = $2,
              vat_rate = $3,
              vat_amount = $4,
              gross_amount = $5,
              vat_type = $6,
              pdf_generated_at = CURRENT_TIMESTAMP
          WHERE id = $7
          RETURNING *
        `, [
          order.customer_id,
          netAmount,
          taxRate,
          taxAmount,
          total,
          isReverseCharge ? 'reverse_charge' : 'standard',
          existingInvoice.rows[0].id,
        ]);
        invoice = invoiceResult.rows[0];
      } else {
        for (let attempt = 0; attempt < 3; attempt++) {
          invoiceNumber = await this.getNextInvoiceNumber(order.created_at || new Date());
          try {
            const invoiceResult = await pool.query(`
              INSERT INTO invoices (invoice_number, type, order_id, customer_id,
                net_amount, vat_rate, vat_amount, gross_amount, vat_type, pdf_generated_at)
              VALUES ($1, 'customer', $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
              RETURNING *
            `, [invoiceNumber, orderId, order.customer_id, netAmount, taxRate, taxAmount, total,
                isReverseCharge ? 'reverse_charge' : 'standard']);
            invoice = invoiceResult.rows[0];
            break;
          } catch (error) {
            if (error.code !== '23505' || error.constraint !== 'invoices_invoice_number_key' || attempt === 2) {
              throw error;
            }
          }
        }
      }

      await pool.query(
        `UPDATE orders
         SET invoice_number = $1,
             invoice_generated_at = CURRENT_TIMESTAMP,
             vat_rate = $2,
             vat_amount = $3,
             total = $4,
             is_reverse_charge = $5
         WHERE id = $6`,
        [invoiceNumber, taxRate, taxAmount, total, isReverseCharge, orderId]
      );

      order.invoice_number = invoiceNumber;
      order.invoice_generated_at = new Date();
      order.vat_rate = taxRate;
      order.vat_amount = taxAmount;
      order.total = total;
      order.is_reverse_charge = isReverseCharge;
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
  async getNextInvoiceNumber(date = new Date()) {
    try {
      const year = new Date(date).getFullYear();
      const result = await pool.query(`
        SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)), 0) + 1 as next_seq
        FROM invoices
        WHERE invoice_number ~ $1
          AND ${REAL_INVOICE_WHERE}
      `, [`^RE-${year}-[0-9]+$`]);
      return `RE-${year}-${String(parseInt(result.rows[0].next_seq) || 1).padStart(4, '0')}`;
    } catch (error) {
      const year = new Date(date).getFullYear();
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM invoices
        WHERE invoice_number LIKE $1
          AND ${REAL_INVOICE_WHERE}
      `, [`RE-${year}-%`]).catch(() => ({ rows: [{ count: 0 }] }));
      const seq = parseInt(countResult.rows[0].count) + 1;
      return `RE-${year}-${String(seq).padStart(4, '0')}`;
    }
  }

  async renumberRealInvoicesByDate() {
    const result = {
      updated: 0,
      skipped: 0,
      invoices: [],
    };

    const realInvoices = await pool.query(`
      SELECT i.id, i.invoice_number, i.type, i.order_id, i.subscription_payment_id,
             COALESCE(i.created_at, o.created_at, sp.paid_at, sp.created_at) as invoice_date
      FROM invoices i
      LEFT JOIN orders o ON o.id = i.order_id
      LEFT JOIN subscription_payments sp ON sp.id = i.subscription_payment_id
      WHERE ${REAL_INVOICE_WHERE.replaceAll('type', 'i.type')
        .replaceAll('order_id', 'i.order_id')
        .replaceAll('subscription_payment_id', 'i.subscription_payment_id')}
      ORDER BY COALESCE(i.created_at, o.created_at, sp.paid_at, sp.created_at) ASC, i.id ASC
    `);

    for (const invoice of realInvoices.rows) {
      await pool.query(
        'UPDATE invoices SET invoice_number = $1 WHERE id = $2',
        [`TMP-${invoice.id}`, invoice.id]
      );
    }

    const countersByYear = new Map();
    for (const invoice of realInvoices.rows) {
      const invoiceDate = toDate(invoice.invoice_date);
      const year = invoiceDate.getFullYear();
      const next = (countersByYear.get(year) || 0) + 1;
      countersByYear.set(year, next);

      const invoiceNumber = `RE-${year}-${String(next).padStart(4, '0')}`;
      await pool.query(
        `UPDATE invoices
         SET invoice_number = CONCAT('LEGACY-', LEFT(id::text, 8), '-', invoice_number)
         WHERE invoice_number = $1
           AND NOT ${REAL_INVOICE_WHERE}`,
        [invoiceNumber]
      );

      if (invoice.invoice_number === invoiceNumber) {
        await pool.query(
          'UPDATE invoices SET invoice_number = $1 WHERE id = $2',
          [invoiceNumber, invoice.id]
        );
        result.skipped += 1;
        continue;
      }

      await pool.query(
        'UPDATE invoices SET invoice_number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [invoiceNumber, invoice.id]
      );

      if (invoice.type === 'customer' && invoice.order_id) {
        await pool.query(
          'UPDATE orders SET invoice_number = $1 WHERE id = $2',
          [invoiceNumber, invoice.order_id]
        ).catch(() => {});
      }

      result.updated += 1;
      result.invoices.push({
        id: invoice.id,
        from: invoice.invoice_number,
        to: invoiceNumber,
      });
    }

    return result;
  }

  async ensureFeeInvoiceStorage() {
    await pool.query(`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS subscription_payment_id INTEGER
    `).catch(() => {});

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_subscription_payment
      ON invoices(subscription_payment_id)
      WHERE subscription_payment_id IS NOT NULL
    `).catch(() => {});

    await pool.query(`
      DO $$
      DECLARE constraint_name text;
      BEGIN
        SELECT conname INTO constraint_name
        FROM pg_constraint
        WHERE conrelid = 'invoices'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%type%'
          AND pg_get_constraintdef(oid) LIKE '%customer%';

        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE invoices DROP CONSTRAINT %I', constraint_name);
          ALTER TABLE invoices
            ADD CONSTRAINT invoices_type_check
            CHECK (type IN ('customer', 'commission', 'commission_statement', 'fee'));
        END IF;
      END $$;
    `).catch(() => {});
  }

  async createOrGetPartnerFeeInvoice(payment) {
    await this.ensureFeeInvoiceStorage();

    const existing = await pool.query(
      'SELECT * FROM invoices WHERE subscription_payment_id = $1 LIMIT 1',
      [payment.id]
    ).catch(() => ({ rows: [] }));

    const paidAt = toDate(payment.paid_at || payment.created_at);
    const vatRule = await calculateAffiliateFeeVatRule({
      country: payment.country,
      vatId: payment.vat_id,
      date: paidAt,
    });
    const amounts = splitGrossAmount(payment.amount, vatRule.vatRate);

    if (existing.rows.length > 0) {
      const existingInvoice = existing.rows[0];
      const updated = await pool.query(
        `UPDATE invoices
         SET created_at = $1,
             net_amount = $2,
             vat_rate = $3,
             vat_amount = $4,
             gross_amount = $5,
             vat_type = $6
         WHERE id = $7
         RETURNING *`,
        [
          paidAt,
          amounts.netAmount,
          vatRule.vatRate,
          amounts.vatAmount,
          amounts.grossAmount,
          vatRule.vatType,
          existingInvoice.id,
        ]
      ).catch(() => ({ rows: [] }));
      return updated.rows[0] || { ...existingInvoice, created_at: paidAt };
    }

    let result = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const invoiceNumber = await this.getNextInvoiceNumber(paidAt);
      try {
        result = await pool.query(`
          INSERT INTO invoices (
            invoice_number, type, partner_id, subscription_payment_id,
            net_amount, vat_rate, vat_amount, gross_amount, vat_type,
            pdf_generated_at, created_at
          )
          VALUES ($1, 'fee', $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
          RETURNING *
        `, [
          invoiceNumber,
          payment.user_id,
          payment.id,
          amounts.netAmount,
          vatRule.vatRate,
          amounts.vatAmount,
          amounts.grossAmount,
          vatRule.vatType,
          paidAt,
        ]);
        break;
      } catch (error) {
        if (error.code !== '23505' || error.constraint !== 'invoices_invoice_number_key' || attempt === 2) {
          throw error;
        }
      }
    }

      return result.rows[0];
  }

  async generateMissingInvoices() {
    const result = {
      customerGenerated: 0,
      customerUpdated: 0,
      feeGenerated: 0,
      feeUpdated: 0,
      errors: [],
    };

    const paidOrders = await pool.query(`
      SELECT o.id, i.id as invoice_id
      FROM orders o
      LEFT JOIN invoices i ON i.order_id = o.id AND i.type = 'customer'
      WHERE ${INVOICEABLE_ORDER_WHERE}
      ORDER BY o.created_at ASC
    `);

    for (const row of paidOrders.rows) {
      try {
        await this.generateInvoice(row.id);
        if (row.invoice_id) result.customerUpdated += 1;
        else result.customerGenerated += 1;
      } catch (error) {
        result.errors.push({ type: 'customer', id: row.id, message: error.message });
      }
    }

    const paidFees = await pool.query(`
      SELECT sp.*, sp.id as payment_id,
             u.first_name, u.last_name, u.company, u.street, u.zip, u.city, u.country, u.vat_id, u.email
      FROM subscription_payments sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.status = 'paid'
        AND u.role = 'partner'
        AND LOWER(u.email) <> 'technik@clyr.shop'
      ORDER BY sp.paid_at ASC, sp.created_at ASC
    `);

    for (const payment of paidFees.rows) {
      try {
        payment.id = payment.payment_id;
        const before = await pool.query(
          'SELECT id FROM invoices WHERE subscription_payment_id = $1 LIMIT 1',
          [payment.id]
        );
        await this.createOrGetPartnerFeeInvoice(payment);
        if (before.rows.length > 0) result.feeUpdated += 1;
        else result.feeGenerated += 1;
      } catch (error) {
        result.errors.push({ type: 'fee', id: payment.payment_id, message: error.message });
      }
    }

    result.generated = result.customerGenerated + result.feeGenerated;
    result.updated = result.customerUpdated + result.feeUpdated;
    result.renumbered = await this.renumberRealInvoicesByDate();
    return result;
  }

  async getAllInvoices(type) {
    try {
      let whereClause = '';
      const params = [];
      if (type && type !== 'all') {
        whereClause = 'WHERE i.type = $1';
        params.push(type);
        if (type === 'customer') whereClause += ' AND i.order_id IS NOT NULL';
        if (type === 'fee') whereClause += ' AND i.subscription_payment_id IS NOT NULL';
      } else {
        whereClause = "WHERE ((i.type = 'customer' AND i.order_id IS NOT NULL) OR (i.type = 'fee' AND i.subscription_payment_id IS NOT NULL))";
      }
      const result = await pool.query(`
        SELECT i.*,
          COALESCE(c.first_name || ' ' || c.last_name, '') as customer_name,
          COALESCE(u.first_name || ' ' || u.last_name, pu.first_name || ' ' || pu.last_name, '') as partner_name,
          o.order_number
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        LEFT JOIN orders o ON i.order_id = o.id
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN users pu ON i.partner_id = pu.id
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
export const generatePartnerFeeInvoicePDF = async (partner, amount, options = {}) => {
  const company = await invoiceService.getCompanyInfo();
  const invoiceNumber = options.invoiceNumber || await invoiceService.getNextInvoiceNumber();
  const invoiceDate = toDate(options.invoiceDate || options.paidAt);
  const vatRateFromDB = options.vatRate != null ? parseFloat(options.vatRate) : null;
  const vatTypeFromDB = options.vatType || null;
  const vatRule = vatTypeFromDB
    ? {
        vatRate: vatRateFromDB ?? 0,
        vatType: vatTypeFromDB,
        vatNote: vatTypeFromDB === 'reverse_charge'
          ? 'Gem. §19 UStg. Uebergang der Steuerschuld beim Leistungsempfaenger / Reverse Charge'
          : vatTypeFromDB === 'standard' && vatRateFromDB === 20
          ? 'Umsatzsteuerbefreit - Kleinunternehmer gem. � 6 Abs. 1 Z 27 UStG 1994'
          : '',
      }
    : await calculateAffiliateFeeVatRule({ country: partner.country, vatId: partner.vat_id, date: invoiceDate });
  const totals = splitGrossAmount(amount, vatRule.vatRate);

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
      doc.text(`Datum: ${invoiceDate.toLocaleDateString('de-DE', { timeZone: 'Europe/Vienna' })}`, 350, y + 13, { align: 'right', width: 195 });

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
      doc.text(`EUR ${totals.netAmount.toFixed(2)}`, 440, y, { width: 100, align: 'right' });
      y += 25;

      // Totals
      doc.moveTo(350, y).lineTo(545, y).lineWidth(0.5).strokeColor('#E5E7EB').stroke();
      y += 8;
      doc.font('Helvetica').fontSize(9);
      doc.text('Nettobetrag:', 350, y, { width: 90, align: 'right' });
      doc.text(`EUR ${totals.netAmount.toFixed(2)}`, 440, y, { width: 100, align: 'right' });
      y += 14;

      if (vatRule.vatRate > 0) {
        doc.text(`${vatRule.vatRate}% MwSt.:`, 350, y, { width: 90, align: 'right' });
        doc.text(`EUR ${totals.vatAmount.toFixed(2)}`, 440, y, { width: 100, align: 'right' });
        y += 14;
      } else {
        doc.text('MwSt. (0%):', 350, y, { width: 90, align: 'right' });
        doc.text('EUR 0.00', 440, y, { width: 100, align: 'right' });
        y += 14;
      }

      y += 2;
      doc.moveTo(350, y).lineTo(545, y).lineWidth(1).strokeColor(COLORS.primary).stroke();
      y += 8;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary);
      doc.text('Gesamtbetrag:', 350, y, { width: 90, align: 'right' });
      doc.text(`EUR ${totals.grossAmount.toFixed(2)}`, 440, y, { width: 100, align: 'right' });
      y += 25;

      if (vatRule.vatNote) {
        doc.font('Helvetica').fontSize(8).fillColor('#6B7280');
        doc.text(vatRule.vatNote, 50, y);
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
export const createOrGetPartnerFeeInvoice = (payment) => invoiceService.createOrGetPartnerFeeInvoice(payment);
export const generateMissingInvoices = () => invoiceService.generateMissingInvoices();
export const renumberRealInvoicesByDate = () => invoiceService.renumberRealInvoicesByDate();
export const getAllInvoices = (type) => invoiceService.getAllInvoices(type);
export const getInvoiceById = (invoiceId) => invoiceService.getInvoiceById(invoiceId);
export const getInvoiceByOrderId = (orderId) => invoiceService.getInvoiceByOrderId(orderId);

export default invoiceService;
