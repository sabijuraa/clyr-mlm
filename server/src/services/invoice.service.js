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
  city: 'St. Magdalen',
  country: 'Oesterreich',
  email: 'service@clyr.shop',
  website: 'www.clyr.shop',
  phone: '',
  uid: '',
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
  // #30 + #31: COMMISSION STATEMENT / PROVISIONSGUTSCHRIFT (returns Buffer)
  // ==========================================
  async generateCommissionStatementBuffer(partner, commissions, periodLabel) {
    const company = await this.getCompanyInfo();
    const statementNumber = `PG-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${partner.id}`;

    const totalCommission = commissions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    // Partner VAT handling
    const partnerCountry = partner.country || 'AT';
    const partnerHasUid = !!partner.vat_id;
    let vatRate = 0, vatDisplay = 'none', vatNote = '';

    if (partnerCountry === 'AT' && partnerHasUid) {
      vatRate = 20; vatDisplay = 'separate';
      vatNote = '20% USt. wird gemaess oesterr. UStG separat ausgewiesen.';
    } else if (partnerCountry === 'AT' && !partnerHasUid) {
      vatNote = 'Steuerbefreit gemaess Par. 6 Abs. 1 Z 27 UStG (Kleinunternehmerregelung).';
    } else if (partnerCountry === 'DE') {
      vatNote = 'Steuerschuldnerschaft des Leistungsempfaengers (Reverse Charge).';
    } else if (partnerCountry === 'CH') {
      vatNote = 'Nicht steuerbar - Leistungsempfaenger im Drittland.';
    }

    const vatAmount = vatDisplay === 'separate' ? Math.round(totalCommission * (vatRate / 100) * 100) / 100 : 0;
    const grossTotal = totalCommission + vatAmount;

    const typeLabels = {
      direct: 'Direktprovision', difference: 'Differenzprovision',
      leadership_bonus: 'Fuehrungsbonus', team_volume_bonus: 'Teamumsatz-Bonus',
      rank_bonus: 'Rangbonus', bonus_pool: 'Bonuspool',
      override: 'Override', matching_bonus: 'Matching Bonus'
    };

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        let y = this.drawHeader(doc, company, 'PROVISIONSGUTSCHRIFT');

        // Meta
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        doc.text(`Nr.: ${statementNumber}`, 350, y, { align: 'right', width: 195 });
        doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 350, y + 13, { align: 'right', width: 195 });
        doc.text(`Zeitraum: ${periodLabel}`, 350, y + 26, { align: 'right', width: 195 });

        // Partner address
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary).text('Empfaenger:', 50, y);
        y += 14;
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        const pName = `${partner.first_name || ''} ${partner.last_name || ''}`.trim();
        if (pName) { doc.text(pName, 50, y); y += 12; }
        if (partner.company) { doc.text(partner.company, 50, y); y += 12; }
        if (partner.street) { doc.text(partner.street, 50, y); y += 12; }
        const pCity = `${partner.zip || ''} ${partner.city || ''}`.trim();
        if (pCity) { doc.text(pCity, 50, y); y += 12; }
        if (partner.vat_id) { doc.fontSize(8).fillColor(COLORS.textLight).text(`UID-Nr.: ${partner.vat_id}`, 50, y); y += 12; }

        y = Math.max(y, 195) + 15;
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
        y += 12;

        // Table header
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary);
        doc.text('Datum', 50, y, { width: 65 });
        doc.text('Bestellung', 115, y, { width: 80 });
        doc.text('Typ', 200, y, { width: 120 });
        doc.text('Basis', 330, y, { width: 75, align: 'right' });
        doc.text('Satz', 410, y, { width: 45, align: 'right' });
        doc.text('Provision', 460, y, { width: 85, align: 'right' });
        y += 16;
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.3).strokeColor(COLORS.border).stroke();
        y += 8;

        // Rows
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
        commissions.forEach((c, idx) => {
          if (y > 700) { doc.addPage(); y = 50; }
          if (idx % 2 === 1) { doc.rect(50, y - 3, 495, 16).fill(COLORS.bgLight); doc.fillColor(COLORS.text); }

          const amt = parseFloat(c.amount || 0);
          const rate = c.rate ? `${(parseFloat(c.rate) * 100).toFixed(0)}%` : '-';
          const basisVal = c.base_amount || c.order_total;
          const basis = basisVal ? `${parseFloat(basisVal).toFixed(2)}` : '-';

          doc.text(new Date(c.created_at).toLocaleDateString('de-DE'), 50, y, { width: 65 });
          doc.text(c.order_number || '-', 115, y, { width: 80 });
          doc.text(typeLabels[c.type] || c.type, 200, y, { width: 120 });
          doc.text(basis === '-' ? '-' : `${basis} EUR`, 330, y, { width: 75, align: 'right' });
          doc.text(rate, 410, y, { width: 45, align: 'right' });
          doc.text(`${amt.toFixed(2)} EUR`, 460, y, { width: 85, align: 'right' });
          y += 16;
        });

        y += 5;
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
        y += 12;

        // Totals
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
        doc.text('Netto-Provision:', 340, y, { width: 110, align: 'right' });
        doc.text(`${totalCommission.toFixed(2)} EUR`, 460, y, { width: 85, align: 'right' });
        y += 16;

        if (vatDisplay === 'separate') {
          doc.text(`USt. (${vatRate}%):`, 340, y, { width: 110, align: 'right' });
          doc.text(`${vatAmount.toFixed(2)} EUR`, 460, y, { width: 85, align: 'right' });
          y += 16;
        }

        y += 4;
        doc.moveTo(350, y).lineTo(545, y).lineWidth(0.5).strokeColor(COLORS.primary).stroke();
        y += 8;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary);
        doc.text('Auszahlungsbetrag:', 320, y, { width: 130, align: 'right' });
        doc.text(`${grossTotal.toFixed(2)} EUR`, 460, y, { width: 85, align: 'right' });
        y += 28;

        if (vatNote) {
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.textLight).text(vatNote, 50, y);
          y += 14;
        }

        if (partner.iban && y < 720) {
          y += 5;
          doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary).text('Auszahlung an:', 50, y);
          y += 12;
          doc.font('Helvetica').fontSize(8).fillColor(COLORS.text);
          doc.text(`IBAN: ${partner.iban}${partner.bic ? '  |  BIC: ' + partner.bic : ''}`, 50, y);
        }

        this.drawFooter(doc, company);
        doc.end();
      } catch (error) {
        reject(error);
      }
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

  async generateCommissionStatement(partnerOrData, commissionsOrNumber, periodLabel) {
    if (Array.isArray(commissionsOrNumber)) {
      return this.generateCommissionStatementBuffer(partnerOrData, commissionsOrNumber, periodLabel);
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
    return this.generateCommissionStatementBuffer(partner, commissions, commissionsOrNumber || 'Statement');
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
export const generateCommissionStatement = (a, b, c) => invoiceService.generateCommissionStatement(a, b, c);
export const getAllInvoices = (type) => invoiceService.getAllInvoices(type);
export const getInvoiceById = (invoiceId) => invoiceService.getInvoiceById(invoiceId);
export const getInvoiceByOrderId = (orderId) => invoiceService.getInvoiceByOrderId(orderId);

export default invoiceService;