/**
 * Credit Note Service
 * Generate credit notes (Gutschriften) for refunds
 * GoBD-compliant for German tax law
 */

import PDFDocument from 'pdfkit';
import { query } from '../config/database.js';
import crypto from 'crypto';

// Company Information
const COMPANY = {
  name: 'CLYR Solutions GmbH',
  street: 'Musterstraße 123',
  zip: '12345',
  city: 'Berlin',
  country: 'Deutschland',
  vatId: 'DE123456789',
  taxNumber: '12/345/67890',
  email: 'info@clyr.de',
  phone: '+49 30 123456',
  bankName: 'Deutsche Bank',
  iban: 'DE89 3704 0044 0532 0130 00',
  bic: 'COBADEFFXXX'
};

/**
 * Generate sequential credit note number
 */
export const generateCreditNoteNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `GS-${year}-`;
  
  const result = await query(`
    SELECT credit_note_number FROM credit_notes 
    WHERE credit_note_number LIKE $1
    ORDER BY id DESC LIMIT 1
  `, [`${prefix}%`]);
  
  let nextNumber = 1;
  if (result.rows.length > 0) {
    const lastNumber = parseInt(result.rows[0].credit_note_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

/**
 * Generate Credit Note PDF
 */
export const generateCreditNotePDF = async (creditNote) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Gutschrift ${creditNote.credit_note_number}`,
          Author: COMPANY.name,
          Creator: 'CLYR MLM Platform'
        }
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      const pageWidth = doc.page.width - 100;
      
      // HEADER
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a1a2e')
         .text('GUTSCHRIFT', 50, 50);
      
      doc.fontSize(10).font('Helvetica').fillColor('#666')
         .text('CREDIT NOTE', 50, 78);
      
      // Credit Note Number & Date
      doc.fontSize(10).fillColor('#333')
         .text(`Nr.: ${creditNote.credit_note_number}`, 400, 50, { align: 'right' })
         .text(`Datum: ${formatDate(creditNote.issued_at)}`, 400, 65, { align: 'right' });
      
      if (creditNote.invoice_number) {
        doc.text(`Zu Rechnung: ${creditNote.invoice_number}`, 400, 80, { align: 'right' });
      }
      
      // COMPANY INFO
      doc.fontSize(8).fillColor('#666')
         .text(`${COMPANY.name} · ${COMPANY.street} · ${COMPANY.zip} ${COMPANY.city}`, 50, 120);
      
      // CUSTOMER INFO
      doc.fontSize(10).fillColor('#333')
         .text(creditNote.customer_name, 50, 145);
      
      const addressLines = (creditNote.customer_address || '').split('\n');
      let addrY = 160;
      addressLines.forEach(line => {
        if (line.trim()) {
          doc.text(line.trim(), 50, addrY);
          addrY += 14;
        }
      });
      
      if (creditNote.customer_vat_id) {
        doc.text(`USt-IdNr.: ${creditNote.customer_vat_id}`, 50, addrY);
      }
      
      // COMPANY DETAILS (Right side)
      doc.fontSize(9).fillColor('#333')
         .text(COMPANY.name, 400, 145, { align: 'right' })
         .text(COMPANY.street, 400, 158, { align: 'right' })
         .text(`${COMPANY.zip} ${COMPANY.city}`, 400, 171, { align: 'right' })
         .text(`USt-IdNr.: ${COMPANY.vatId}`, 400, 191, { align: 'right' });
      
      // REASON
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a2e')
         .text('Grund der Gutschrift:', 50, 230);
      
      doc.fontSize(10).font('Helvetica').fillColor('#333')
         .text(creditNote.reason, 50, 248, { width: pageWidth });
      
      // TABLE HEADER
      const tableTop = 300;
      
      doc.rect(50, tableTop, pageWidth, 25).fill('#f3f4f6');
      doc.fillColor('#333').font('Helvetica-Bold').fontSize(9);
      doc.text('Pos', 55, tableTop + 8);
      doc.text('Beschreibung', 85, tableTop + 8);
      doc.text('Menge', 340, tableTop + 8, { width: 50, align: 'right' });
      doc.text('Preis', 400, tableTop + 8, { width: 60, align: 'right' });
      doc.text('Betrag', 470, tableTop + 8, { width: 70, align: 'right' });
      
      // TABLE ROWS
      let y = tableTop + 30;
      doc.font('Helvetica').fontSize(9);
      
      const lineItems = typeof creditNote.line_items === 'string' 
        ? JSON.parse(creditNote.line_items) 
        : (creditNote.line_items || []);
      
      lineItems.forEach((item, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        
        const itemTotal = (item.quantity || 1) * (item.price || 0);
        
        doc.fillColor('#333')
           .text(String(index + 1), 55, y)
           .text(item.name || 'Gutschrift', 85, y, { width: 240 })
           .text(String(item.quantity || 1), 340, y, { width: 50, align: 'right' })
           .text(formatCurrency(item.price || 0), 400, y, { width: 60, align: 'right' })
           .text(formatCurrency(itemTotal), 470, y, { width: 70, align: 'right' });
        
        y += 20;
        doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#e5e7eb').stroke();
        y += 5;
      });
      
      // TOTALS
      const totalsTop = Math.max(y + 20, 480);
      
      doc.font('Helvetica').fontSize(10).fillColor('#333')
         .text('Zwischensumme:', 350, totalsTop)
         .text(formatCurrency(creditNote.subtotal), 470, totalsTop, { width: 70, align: 'right' });
      
      if (parseFloat(creditNote.vat_amount) > 0) {
        doc.text(`MwSt. ${creditNote.vat_rate}%:`, 350, totalsTop + 18)
           .text(formatCurrency(creditNote.vat_amount), 470, totalsTop + 18, { width: 70, align: 'right' });
      }
      
      if (creditNote.is_reverse_charge) {
        doc.fontSize(8).fillColor('#666')
           .text('Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge)', 50, totalsTop + 40);
      } else if (creditNote.is_export) {
        doc.fontSize(8).fillColor('#666')
           .text('Steuerfreie Ausfuhrlieferung gem. § 4 Nr. 1a UStG', 50, totalsTop + 40);
      }
      
      // TOTAL BOX
      doc.rect(350, totalsTop + 55, 190, 28).fill('#1a1a2e');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff')
         .text('Gutschriftbetrag:', 358, totalsTop + 63)
         .text(formatCurrency(creditNote.total), 470, totalsTop + 63, { width: 65, align: 'right' });
      
      // PAYMENT NOTE
      doc.fontSize(9).font('Helvetica').fillColor('#333')
         .text('Der Gutschriftbetrag wird mit offenen Forderungen verrechnet oder auf Ihr Konto überwiesen.', 
               50, totalsTop + 100, { width: pageWidth });
      
      // FOOTER
      const footerY = 750;
      
      doc.fontSize(8).fillColor('#666');
      doc.text(COMPANY.name, 50, footerY);
      doc.text(`${COMPANY.street}, ${COMPANY.zip} ${COMPANY.city}`, 50, footerY + 10);
      doc.text(`Tel: ${COMPANY.phone} | E-Mail: ${COMPANY.email}`, 50, footerY + 20);
      
      doc.text(`Bank: ${COMPANY.bankName}`, 300, footerY);
      doc.text(`IBAN: ${COMPANY.iban}`, 300, footerY + 10);
      doc.text(`BIC: ${COMPANY.bic}`, 300, footerY + 20);
      
      // Document hash for GoBD
      const hashInput = `${creditNote.credit_note_number}|${creditNote.total}|${creditNote.issued_at}`;
      const docHash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
      doc.fontSize(6).fillColor('#999')
         .text(`Dok-Hash: ${docHash}`, 480, footerY + 32, { align: 'right' });
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Create credit note record and generate PDF
 */
export const createCreditNote = async (orderId, reason, lineItems = null, issuedBy = null) => {
  // Get order details
  const orderResult = await query(`
    SELECT 
      o.*,
      c.first_name, c.last_name, c.company, c.vat_id,
      c.street, c.zip, c.city, c.country,
      i.invoice_number
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN invoices i ON o.id = i.order_id
    WHERE o.id = $1
  `, [orderId]);
  
  if (orderResult.rows.length === 0) {
    throw new Error('Bestellung nicht gefunden');
  }
  
  const order = orderResult.rows[0];
  
  // Get order items if not provided
  if (!lineItems) {
    const itemsResult = await query(
      'SELECT name, quantity, price FROM order_items WHERE order_id = $1',
      [orderId]
    );
    lineItems = itemsResult.rows;
  }
  
  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const vatRate = order.vat_rate || 19;
  const isReverseCharge = order.country === 'AT' && order.vat_id;
  const isExport = order.country === 'CH';
  const vatAmount = (isReverseCharge || isExport) ? 0 : subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;
  
  // Generate credit note number
  const creditNoteNumber = await generateCreditNoteNumber();
  
  // Create hash for GoBD
  const hashInput = `${creditNoteNumber}|${total}|${new Date().toISOString()}`;
  const documentHash = crypto.createHash('sha256').update(hashInput).digest('hex');
  
  // Insert credit note
  const insertResult = await query(`
    INSERT INTO credit_notes (
      credit_note_number, order_id, invoice_id, customer_id,
      subtotal, vat_rate, vat_amount, total,
      reason, line_items,
      customer_name, customer_address, customer_vat_id, customer_country,
      is_reverse_charge, is_export, document_hash,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *
  `, [
    creditNoteNumber,
    orderId,
    order.invoice_id || null,
    order.customer_id,
    subtotal,
    vatRate,
    vatAmount,
    total,
    reason,
    JSON.stringify(lineItems),
    order.company || `${order.first_name} ${order.last_name}`,
    `${order.street}\n${order.zip} ${order.city}\n${order.country}`,
    order.vat_id,
    order.country,
    isReverseCharge,
    isExport,
    documentHash,
    issuedBy
  ]);
  
  const creditNote = insertResult.rows[0];
  creditNote.invoice_number = order.invoice_number;
  
  return creditNote;
};

/**
 * Get credit note by ID
 */
export const getCreditNoteById = async (id) => {
  const result = await query('SELECT * FROM credit_notes WHERE id = $1', [id]);
  return result.rows[0] || null;
};

/**
 * Get credit notes for an order
 */
export const getCreditNotesByOrder = async (orderId) => {
  const result = await query(
    'SELECT * FROM credit_notes WHERE order_id = $1 ORDER BY created_at DESC',
    [orderId]
  );
  return result.rows;
};

/**
 * Get all credit notes with filters
 */
export const getCreditNotes = async (filters = {}) => {
  const { status, customerId, startDate, endDate, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramCount = 0;
  
  if (status) {
    params.push(status);
    whereClause += ` AND status = $${++paramCount}`;
  }
  
  if (customerId) {
    params.push(customerId);
    whereClause += ` AND customer_id = $${++paramCount}`;
  }
  
  if (startDate) {
    params.push(startDate);
    whereClause += ` AND issued_at >= $${++paramCount}`;
  }
  
  if (endDate) {
    params.push(endDate);
    whereClause += ` AND issued_at <= $${++paramCount}`;
  }
  
  const countResult = await query(
    `SELECT COUNT(*) FROM credit_notes ${whereClause}`,
    params
  );
  
  params.push(limit, offset);
  const result = await query(`
    SELECT cn.*, o.order_number
    FROM credit_notes cn
    LEFT JOIN orders o ON cn.order_id = o.id
    ${whereClause}
    ORDER BY cn.created_at DESC
    LIMIT $${++paramCount} OFFSET $${++paramCount}
  `, params);
  
  return {
    creditNotes: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    pages: Math.ceil(countResult.rows[0].count / limit)
  };
};

// Helper functions
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0);
}

export default {
  generateCreditNoteNumber,
  generateCreditNotePDF,
  createCreditNote,
  getCreditNoteById,
  getCreditNotesByOrder,
  getCreditNotes
};
