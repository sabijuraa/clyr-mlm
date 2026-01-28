import PDFDocument from 'pdfkit';
import { query } from '../config/database.js';
import crypto from 'crypto';

/**
 * CLYR Invoice Service
 * 
 * Generates invoices and commission statements as PDF
 * 
 * Customer Invoice Types:
 * - German customers: Net + 19% VAT
 * - Austrian customers: Net + 20% VAT
 * - Austrian with VAT ID: Net, Reverse Charge (0%)
 * - Swiss customers: Net (0% VAT, export)
 * 
 * Commission Statement Types:
 * - German affiliates: Net commission (they need VAT ID)
 * - Austrian with VAT ID: Net commission, Reverse Charge
 * - Austrian without VAT ID (Kleinunternehmer): VAT exempt §6 Abs.1 Z 27 UStG
 * 
 * Invoices are issued by: MUTIMBAUCH Vertriebs GmbH (Germany)
 * Commission statements issued by: Theresa Struger - FreshLiving (Austria)
 */

// Brand colors
const COLORS = {
  primary: '#0ea5e9',
  secondary: '#171717',
  text: '#374151',
  muted: '#6b7280',
  border: '#e5e7eb'
};

/**
 * Generate invoice number
 */
export const generateInvoiceNumber = async (type = 'customer') => {
  const prefix = type === 'customer' ? 'RE' : 'CS';
  const date = new Date();
  const yearMonth = `${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const result = await query(
    `SELECT invoice_number FROM invoices 
     WHERE invoice_number LIKE $1 
     ORDER BY created_at DESC LIMIT 1`,
    [`${prefix}${yearMonth}%`]
  );

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].invoice_number;
    sequence = parseInt(lastNumber.slice(-4)) + 1;
  }

  return `${prefix}${yearMonth}${sequence.toString().padStart(4, '0')}`;
};

/**
 * Generate customer invoice PDF
 */
export const generateInvoicePDF = async (order) => {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Rechnung ${order.invoice_number || order.order_number}`,
          Author: 'CLYR - MUTIMBAUCH Vertriebs GmbH'
        }
      });

      doc.on('data', chunks.push.bind(chunks));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const invoiceNumber = order.invoice_number || `RE-${order.order_number}`;
      const invoiceDate = new Date(order.created_at).toLocaleDateString('de-DE');

      // Determine VAT note
      let vatNote = '';
      if (order.billing_country === 'AT' && order.customer_vat_id) {
        vatNote = 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfängers gem. Art. 196 MwStSystRL';
      } else if (order.billing_country === 'CH') {
        vatNote = 'Steuerfreie Ausfuhrlieferung gem. §4 Nr. 1a UStG';
      }

      // Header with Logo
      doc.fontSize(24)
         .fillColor(COLORS.secondary)
         .text('CLYR', 50, 50);

      doc.fontSize(10)
         .fillColor(COLORS.muted)
         .text('Powered by MUTIMBAUCH Vertriebs GmbH', 50, 78);

      // Invoice title
      doc.fontSize(28)
         .fillColor(COLORS.secondary)
         .text('RECHNUNG', 400, 50, { align: 'right' });

      doc.fontSize(12)
         .fillColor(COLORS.muted)
         .text(invoiceNumber, 400, 85, { align: 'right' });

      // Company info (sender)
      doc.fontSize(8)
         .fillColor(COLORS.muted)
         .text('MUTIMBAUCH Vertriebs GmbH · Industriestraße 123 · 80333 München', 50, 120);

      // Customer address
      doc.fontSize(10)
         .fillColor(COLORS.text);
      
      let yPos = 145;
      if (order.customer_company) {
        doc.text(order.customer_company, 50, yPos);
        yPos += 15;
      }
      doc.text(`${order.customer_first_name} ${order.customer_last_name}`, 50, yPos);
      yPos += 15;
      doc.text(order.billing_street, 50, yPos);
      yPos += 15;
      doc.text(`${order.billing_zip} ${order.billing_city}`, 50, yPos);
      yPos += 15;
      doc.text(getCountryName(order.billing_country), 50, yPos);
      
      if (order.customer_vat_id) {
        yPos += 15;
        doc.text(`USt-IdNr.: ${order.customer_vat_id}`, 50, yPos);
      }

      // Invoice details (right side)
      const detailsY = 145;
      doc.fontSize(9)
         .fillColor(COLORS.muted)
         .text('Rechnungsnummer:', 380, detailsY)
         .text('Rechnungsdatum:', 380, detailsY + 18)
         .text('Bestellnummer:', 380, detailsY + 36)
         .text('Kundennummer:', 380, detailsY + 54);

      doc.fillColor(COLORS.text)
         .text(invoiceNumber, 480, detailsY, { align: 'right' })
         .text(invoiceDate, 480, detailsY + 18, { align: 'right' })
         .text(order.order_number, 480, detailsY + 36, { align: 'right' })
         .text(order.customer_id?.slice(0, 8) || 'GAST', 480, detailsY + 54, { align: 'right' });

      // Items table
      const tableTop = 280;
      
      // Table header
      doc.fillColor(COLORS.primary)
         .rect(50, tableTop, 495, 25)
         .fill();

      doc.fillColor('white')
         .fontSize(9)
         .text('Pos.', 55, tableTop + 8)
         .text('Beschreibung', 85, tableTop + 8)
         .text('Menge', 350, tableTop + 8, { width: 50, align: 'right' })
         .text('Einzelpreis', 405, tableTop + 8, { width: 60, align: 'right' })
         .text('Gesamt', 470, tableTop + 8, { width: 70, align: 'right' });

      // Table rows
      let rowY = tableTop + 30;
      doc.fillColor(COLORS.text);

      order.items.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#f9fafb' : 'white';
        doc.fillColor(rowBg)
           .rect(50, rowY - 5, 495, 22)
           .fill();

        doc.fillColor(COLORS.text)
           .fontSize(9)
           .text(String(index + 1), 55, rowY)
           .text(item.product_name, 85, rowY, { width: 250 })
           .text(String(item.quantity), 350, rowY, { width: 50, align: 'right' })
           .text(formatCurrency(item.product_price), 405, rowY, { width: 60, align: 'right' })
           .text(formatCurrency(item.total), 470, rowY, { width: 70, align: 'right' });

        rowY += 22;
      });

      // Totals section
      const totalsY = rowY + 20;
      const totalsX = 350;

      doc.strokeColor(COLORS.border)
         .moveTo(totalsX, totalsY)
         .lineTo(545, totalsY)
         .stroke();

      doc.fontSize(9)
         .fillColor(COLORS.muted)
         .text('Zwischensumme (netto):', totalsX, totalsY + 10)
         .text('Versandkosten:', totalsX, totalsY + 25);

      doc.fillColor(COLORS.text)
         .text(formatCurrency(order.subtotal), 470, totalsY + 10, { width: 70, align: 'right' })
         .text(formatCurrency(order.shipping_cost), 470, totalsY + 25, { width: 70, align: 'right' });

      let currentY = totalsY + 40;

      if (order.discount_amount > 0) {
        doc.fillColor(COLORS.muted)
           .text('Rabatt:', totalsX, currentY);
        doc.fillColor('#22c55e')
           .text(`-${formatCurrency(order.discount_amount)}`, 470, currentY, { width: 70, align: 'right' });
        currentY += 15;
      }

      doc.fillColor(COLORS.muted)
         .text(`MwSt. (${order.vat_rate}%):`, totalsX, currentY);
      doc.fillColor(COLORS.text)
         .text(formatCurrency(order.vat_amount), 470, currentY, { width: 70, align: 'right' });
      currentY += 15;

      // Total
      doc.strokeColor(COLORS.secondary)
         .lineWidth(2)
         .moveTo(totalsX, currentY + 5)
         .lineTo(545, currentY + 5)
         .stroke();

      doc.fontSize(12)
         .fillColor(COLORS.secondary)
         .text('Gesamtbetrag:', totalsX, currentY + 15)
         .text(formatCurrency(order.total), 470, currentY + 15, { width: 70, align: 'right' });

      // VAT note if applicable
      if (vatNote) {
        doc.fontSize(9)
           .fillColor(COLORS.muted)
           .text(vatNote, 50, currentY + 50, { width: 400 });
      }

      // Payment info
      doc.roundedRect(50, currentY + 80, 495, 50, 5)
         .fillColor('#ecfeff')
         .fill();

      doc.fontSize(10)
         .fillColor(COLORS.primary)
         .text('Zahlungsinformation', 60, currentY + 90);

      doc.fontSize(9)
         .fillColor(COLORS.text)
         .text(
           order.payment_status === 'paid' 
             ? 'Der Rechnungsbetrag wurde bereits beglichen. Vielen Dank für Ihre Bestellung!' 
             : 'Bitte überweisen Sie den Rechnungsbetrag innerhalb von 14 Tagen.',
           60, currentY + 107
         );

      // Footer
      const footerY = 750;
      doc.strokeColor(COLORS.border)
         .moveTo(50, footerY)
         .lineTo(545, footerY)
         .stroke();

      doc.fontSize(8)
         .fillColor(COLORS.muted)
         .text('MUTIMBAUCH Vertriebs GmbH | Industriestraße 123 | 80333 München | Deutschland', 50, footerY + 10, { align: 'center', width: 495 })
         .text('Handelsregister: HRB 123456 | Amtsgericht München | USt-IdNr.: DE123456789', 50, footerY + 22, { align: 'center', width: 495 })
         .text('Vertrieb: CLYR | www.clyr.at', 50, footerY + 34, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate commission statement PDF
 */
export const generateCommissionStatement = async (user, commissions, period, vatInfo = null) => {
  return new Promise((resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Provisionsabrechnung ${user.statement_number || period}`,
          Author: 'CLYR - Theresa Struger FreshLiving'
        }
      });

      doc.on('data', chunks.push.bind(chunks));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const statementDate = new Date().toLocaleDateString('de-DE');
      const statementNumber = user.statement_number || `CS-${Date.now()}`;

      // Calculate VAT info if not provided
      if (!vatInfo) {
        vatInfo = {
          vatRate: 0,
          vatAmount: 0,
          grossAmount: commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0),
          vatNote: ''
        };
      }

      const totalAmount = commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0);

      // Determine VAT handling text
      let vatHandling = '';
      if (user.country === 'DE') {
        vatHandling = 'Reverse Charge - Steuerschuldnerschaft gem. §13b UStG';
      } else if (user.country === 'AT' && user.vat_id) {
        vatHandling = 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfängers';
      } else if (user.country === 'AT' && user.is_kleinunternehmer) {
        vatHandling = 'Umsatzsteuerfrei gem. §6 Abs.1 Z 27 UStG (Kleinunternehmerregelung)';
      } else if (user.country === 'AT') {
        vatHandling = 'Umsatzsteuer in der Provision enthalten';
      }

      // Header
      doc.fontSize(24)
         .fillColor(COLORS.secondary)
         .text('CLYR', 50, 50);

      doc.fontSize(10)
         .fillColor(COLORS.muted)
         .text('Partner Provisionsabrechnung', 50, 78);

      // Statement title
      doc.fontSize(20)
         .fillColor(COLORS.secondary)
         .text('PROVISIONSABRECHNUNG', 300, 50, { align: 'right' });

      doc.fontSize(11)
         .fillColor(COLORS.muted)
         .text(statementNumber, 300, 75, { align: 'right' })
         .text(`Zeitraum: ${period}`, 300, 90, { align: 'right' });

      // Issuing company (FreshLiving)
      doc.fontSize(8)
         .fillColor(COLORS.muted)
         .text('Theresa Struger - FreshLiving · Musterstraße 1 · 1010 Wien · Österreich', 50, 120);

      // Partner info box
      doc.roundedRect(50, 145, 250, 100, 5)
         .fillColor('#f9fafb')
         .fill();

      doc.fontSize(10)
         .fillColor(COLORS.primary)
         .text('Partner:', 60, 155);

      doc.fontSize(10)
         .fillColor(COLORS.text);

      let yPos = 170;
      doc.text(`${user.first_name} ${user.last_name}`, 60, yPos);
      yPos += 14;
      if (user.company) {
        doc.text(user.company, 60, yPos);
        yPos += 14;
      }
      if (user.street) {
        doc.text(user.street, 60, yPos);
        yPos += 14;
      }
      doc.text(`${user.zip || ''} ${user.city || ''}`, 60, yPos);
      yPos += 14;
      doc.text(getCountryName(user.country), 60, yPos);
      if (user.vat_id) {
        yPos += 14;
        doc.text(`USt-IdNr.: ${user.vat_id}`, 60, yPos);
      }

      // Statement details box
      doc.roundedRect(320, 145, 225, 100, 5)
         .fillColor('#f9fafb')
         .fill();

      doc.fontSize(9)
         .fillColor(COLORS.muted)
         .text('Abrechnungsnummer:', 330, 155)
         .text('Abrechnungsdatum:', 330, 175)
         .text('Abrechnungsart:', 330, 195)
         .text('IBAN:', 330, 215);

      doc.fillColor(COLORS.text)
         .text(statementNumber, 440, 155, { align: 'right', width: 95 })
         .text(statementDate, 440, 175, { align: 'right', width: 95 })
         .text(vatHandling ? 'Siehe unten' : 'Standard', 440, 195, { align: 'right', width: 95 })
         .text(user.iban ? `...${user.iban.slice(-4)}` : 'Nicht hinterlegt', 440, 215, { align: 'right', width: 95 });

      // VAT handling info
      if (vatHandling) {
        doc.roundedRect(50, 255, 495, 30, 3)
           .fillColor('#fef3c7')
           .fill();

        doc.fontSize(9)
           .fillColor('#92400e')
           .text(`Steuerliche Behandlung: ${vatHandling}`, 60, 265, { width: 475 });
      }

      // Commissions table
      const tableTop = vatHandling ? 300 : 270;
      
      // Table header
      doc.fillColor(COLORS.primary)
         .rect(50, tableTop, 495, 25)
         .fill();

      doc.fillColor('white')
         .fontSize(9)
         .text('Datum', 55, tableTop + 8)
         .text('Bestellung', 120, tableTop + 8)
         .text('Art', 200, tableTop + 8)
         .text('Beschreibung', 280, tableTop + 8)
         .text('Betrag', 470, tableTop + 8, { width: 70, align: 'right' });

      // Table rows
      let rowY = tableTop + 30;
      doc.fillColor(COLORS.text);

      commissions.forEach((commission, index) => {
        const rowBg = index % 2 === 0 ? '#f9fafb' : 'white';
        doc.fillColor(rowBg)
           .rect(50, rowY - 5, 495, 20)
           .fill();

        const date = new Date(commission.created_at).toLocaleDateString('de-DE');
        const type = getCommissionTypeName(commission.type);

        doc.fillColor(COLORS.text)
           .fontSize(8)
           .text(date, 55, rowY)
           .text(commission.order_number || '-', 120, rowY)
           .text(type, 200, rowY)
           .text(commission.description || type, 280, rowY, { width: 160 })
           .text(formatCurrency(commission.amount), 470, rowY, { width: 70, align: 'right' });

        rowY += 20;

        // Page break if needed
        if (rowY > 680 && index < commissions.length - 1) {
          doc.addPage();
          rowY = 50;
        }
      });

      // Totals
      const totalsY = Math.min(rowY + 20, 650);
      
      doc.strokeColor(COLORS.border)
         .moveTo(350, totalsY)
         .lineTo(545, totalsY)
         .stroke();

      doc.fontSize(9)
         .fillColor(COLORS.muted)
         .text('Summe Provisionen:', 350, totalsY + 10);

      doc.fillColor(COLORS.text)
         .text(formatCurrency(totalAmount), 470, totalsY + 10, { width: 70, align: 'right' });

      if (vatInfo.vatAmount > 0 && vatInfo.vatType !== 'included') {
        doc.fillColor(COLORS.muted)
           .text(`+ MwSt. (${vatInfo.vatRate}%):`, 350, totalsY + 25);
        doc.fillColor(COLORS.text)
           .text(formatCurrency(vatInfo.vatAmount), 470, totalsY + 25, { width: 70, align: 'right' });
      }

      // Grand total
      doc.strokeColor(COLORS.secondary)
         .lineWidth(2)
         .moveTo(350, totalsY + 45)
         .lineTo(545, totalsY + 45)
         .stroke();

      doc.fontSize(11)
         .fillColor(COLORS.secondary)
         .text('Auszahlungsbetrag:', 350, totalsY + 55)
         .text(formatCurrency(vatInfo.grossAmount), 470, totalsY + 55, { width: 70, align: 'right' });

      // VAT note if applicable
      if (vatInfo.vatNote) {
        doc.fontSize(8)
           .fillColor(COLORS.muted)
           .text(vatInfo.vatNote, 50, totalsY + 85, { width: 400 });
      }

      // Footer
      const footerY = 750;
      doc.strokeColor(COLORS.border)
         .moveTo(50, footerY)
         .lineTo(545, footerY)
         .stroke();

      doc.fontSize(8)
         .fillColor(COLORS.muted)
         .text('Theresa Struger - FreshLiving | Musterstraße 1 | 1010 Wien | Österreich', 50, footerY + 10, { align: 'center', width: 495 })
         .text('USt-IdNr.: ATU12345678 | Provisionen CLYR Partner-Programm', 50, footerY + 22, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Save invoice to database
 */
export const saveInvoice = async (invoiceData) => {
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(invoiceData))
    .digest('hex');

  const result = await query(
    `INSERT INTO invoices (
       invoice_number, type, order_id, payout_id, customer_id, partner_id,
       net_amount, vat_rate, vat_amount, gross_amount, vat_type, hash
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      invoiceData.invoiceNumber,
      invoiceData.type,
      invoiceData.orderId,
      invoiceData.payoutId,
      invoiceData.customerId,
      invoiceData.partnerId,
      invoiceData.netAmount,
      invoiceData.vatRate,
      invoiceData.vatAmount,
      invoiceData.grossAmount,
      invoiceData.vatType,
      hash
    ]
  );

  return result.rows[0];
};

/**
 * Helper functions
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

const getCountryName = (code) => {
  const countries = {
    DE: 'Deutschland',
    AT: 'Österreich',
    CH: 'Schweiz'
  };
  return countries[code] || code;
};

const getCommissionTypeName = (type) => {
  const types = {
    admin: 'Admin',
    direct: 'Direkt',
    difference: 'Differenz',
    leadership_bonus: 'Leadership',
    team_volume_bonus: 'Team-Volumen',
    rank_bonus: 'Rang-Bonus'
  };
  return types[type] || type;
};
