// server/src/services/invoice.service.js
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class InvoiceService {
  // ========================================
  // GENERATE INVOICE (NEW - For Theresa's fixes)
  // ========================================
  async generateInvoice(orderId) {
    try {
      const orderResult = await pool.query(`
        SELECT o.*, c.first_name, c.last_name, c.email, c.phone,
               c.address_line1, c.address_line2, c.city, c.postal_code, c.country
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `, [orderId]);

      if (orderResult.rows.length === 0) throw new Error('Order not found');

      const order = orderResult.rows[0];

      const itemsResult = await pool.query(`
        SELECT oi.*, p.name, p.description
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
      `, [orderId]);

      const items = itemsResult.rows;
      const invoiceNumber = await this.getNextInvoiceNumber();

      const subtotal = parseFloat(order.subtotal || 0);
      const shipping = parseFloat(order.shipping_cost || 0);
      const taxRate = 19;
      const netAmount = subtotal + shipping;
      const taxAmount = netAmount * (taxRate / 100);
      const total = netAmount + taxAmount;

      const invoiceResult = await pool.query(`
        INSERT INTO invoices (invoice_number, order_id, customer_id, subtotal, tax_rate, tax_amount, shipping_cost, total, invoice_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, 'sent')
        RETURNING *
      `, [invoiceNumber, orderId, order.customer_id, subtotal, taxRate, taxAmount, shipping, total]);

      const invoice = invoiceResult.rows[0];

      for (const item of items) {
        await pool.query(`
          INSERT INTO invoice_items (invoice_id, product_name, description, quantity, unit_price, tax_rate, total)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [invoice.id, item.name, item.description || '', item.quantity, item.price, taxRate, item.total]);
      }

      const pdfUrl = await this.generatePDF(invoice, order, items);
      await pool.query('UPDATE invoices SET pdf_url = $1, sent_at = NOW() WHERE id = $2', [pdfUrl, invoice.id]);

      return { ...invoice, pdf_url: pdfUrl };
    } catch (error) {
      console.error('Invoice generation error:', error);
      throw error;
    }
  }

  // ========================================
  // GENERATE INVOICE PDF (LEGACY - For order.controller.js)
  // ========================================
  async generateInvoicePDF(orderData, invoiceNumber) {
    try {
      const companyResult = await pool.query('SELECT * FROM company_settings WHERE id = 1').catch(() => ({ rows: [] }));
      const company = companyResult.rows[0] || { 
        company_name: 'CLYR', 
        email: 'info@clyr.de',
        address_line1: '',
        postal_code: '',
        city: '',
        tax_id: ''
      };

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `${invoiceNumber || 'INV-' + Date.now()}.pdf`;
      const invoiceDir = path.join(__dirname, '../../public/invoices');
      
      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
      }
      
      const filepath = path.join(invoiceDir, filename);
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      doc.fontSize(20).text('RECHNUNG', 400, 50, { align: 'right' });
      doc.fontSize(10)
         .text(`Nr: ${invoiceNumber || 'DRAFT'}`, 400, 75, { align: 'right' })
         .text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 400, 90, { align: 'right' });

      doc.fontSize(10)
         .text(company.company_name, 50, 150)
         .text(company.address_line1 || '', 50, 165)
         .text(`${company.postal_code || ''} ${company.city || ''}`, 50, 180)
         .text(`Email: ${company.email || ''}`, 50, 195);

      doc.text('Rechnungsadresse:', 300, 150)
         .text(`${orderData.customer_name || ''}`, 300, 165)
         .text(orderData.shipping_address || '', 300, 180);

      doc.moveTo(50, 260).lineTo(550, 260).stroke();

      const tableTop = 280;
      doc.font('Helvetica-Bold')
         .text('Pos', 50, tableTop)
         .text('Beschreibung', 100, tableTop)
         .text('Menge', 350, tableTop)
         .text('Preis', 420, tableTop)
         .text('Summe', 490, tableTop);

      doc.font('Helvetica');
      let yPosition = tableTop + 25;

      if (orderData.items && orderData.items.length > 0) {
        orderData.items.forEach((item, index) => {
          doc.text(index + 1, 50, yPosition)
             .text(item.name || item.product_name, 100, yPosition, { width: 230 })
             .text(item.quantity, 350, yPosition)
             .text(`€${parseFloat(item.price || item.unit_price).toFixed(2)}`, 420, yPosition)
             .text(`€${parseFloat(item.total).toFixed(2)}`, 490, yPosition);
          yPosition += 25;
        });
      }

      yPosition += 10;
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 20;

      const subtotal = parseFloat(orderData.subtotal || 0);
      const shipping = parseFloat(orderData.shipping_cost || 0);
      const taxRate = 19;
      const netAmount = subtotal + shipping;
      const taxAmount = netAmount * (taxRate / 100);
      const total = netAmount + taxAmount;

      doc.text('Zwischensumme:', 350, yPosition).text(`€${subtotal.toFixed(2)}`, 490, yPosition);
      yPosition += 20;

      if (shipping > 0) {
        doc.text('Versandkosten:', 350, yPosition).text(`€${shipping.toFixed(2)}`, 490, yPosition);
        yPosition += 20;
      }

      doc.text('Netto:', 350, yPosition).text(`€${netAmount.toFixed(2)}`, 490, yPosition);
      yPosition += 20;

      doc.text(`MwSt (${taxRate}%):`, 350, yPosition).text(`€${taxAmount.toFixed(2)}`, 490, yPosition);
      yPosition += 20;

      doc.font('Helvetica-Bold').fontSize(12)
         .text('GESAMT:', 350, yPosition)
         .text(`€${total.toFixed(2)}`, 490, yPosition);

      yPosition += 40;
      doc.font('Helvetica').fontSize(10);
      
      if (company.iban) {
        doc.text('Zahlungsinformationen:', 50, yPosition);
        yPosition += 20;
        doc.text(`IBAN: ${company.iban}`, 50, yPosition);
        if (company.bic) {
          yPosition += 15;
          doc.text(`BIC: ${company.bic}`, 50, yPosition);
        }
      }

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(`/invoices/${filename}`));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  // ========================================
  // GENERATE COMMISSION STATEMENT (For commission.controller.js)
  // ========================================
  async generateCommissionStatement(commissionData, statementNumber) {
    try {
      const companyResult = await pool.query('SELECT * FROM company_settings WHERE id = 1').catch(() => ({ rows: [] }));
      const company = companyResult.rows[0] || { company_name: 'CLYR', email: 'info@clyr.de' };

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const filename = `${statementNumber || 'COMM-' + Date.now()}.pdf`;
      const invoiceDir = path.join(__dirname, '../../public/invoices');
      
      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
      }
      
      const filepath = path.join(invoiceDir, filename);
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      doc.fontSize(20).text('PROVISIONSABRECHNUNG', 50, 50);
      doc.fontSize(10)
         .text(`Nr: ${statementNumber || 'DRAFT'}`, 400, 50, { align: 'right' })
         .text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 400, 65, { align: 'right' });

      doc.fontSize(10)
         .text(company.company_name, 50, 120)
         .text(company.address_line1 || '', 50, 135);

      doc.text('Partner:', 300, 120)
         .text(commissionData.partner_name || '', 300, 135)
         .text(commissionData.partner_email || '', 300, 150);

      doc.moveTo(50, 200).lineTo(550, 200).stroke();

      const tableTop = 220;
      doc.font('Helvetica-Bold')
         .text('Bestellung', 50, tableTop)
         .text('Datum', 200, tableTop)
         .text('Betrag', 350, tableTop)
         .text('Provision', 450, tableTop);

      doc.font('Helvetica');
      let yPosition = tableTop + 25;

      if (commissionData.items && commissionData.items.length > 0) {
        commissionData.items.forEach((item) => {
          doc.text(item.order_number || '', 50, yPosition)
             .text(new Date(item.date).toLocaleDateString('de-DE'), 200, yPosition)
             .text(`€${parseFloat(item.order_total).toFixed(2)}`, 350, yPosition)
             .text(`€${parseFloat(item.commission).toFixed(2)}`, 450, yPosition);
          yPosition += 20;
        });
      }

      yPosition += 10;
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 20;

      const total = commissionData.total_commission || 0;
      doc.font('Helvetica-Bold').fontSize(12)
         .text('GESAMT PROVISION:', 350, yPosition)
         .text(`€${parseFloat(total).toFixed(2)}`, 450, yPosition);

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(`/invoices/${filename}`));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Commission statement generation error:', error);
      throw error;
    }
  }

  // ========================================
  // GENERATE PDF (INTERNAL)
  // ========================================
  async generatePDF(invoice, order, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const companyResult = await pool.query('SELECT * FROM company_settings WHERE id = 1').catch(() => ({ rows: [] }));
        const company = companyResult.rows[0] || { company_name: 'CLYR', email: 'info@clyr.de' };

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const filename = `${invoice.invoice_number}.pdf`;
        const invoiceDir = path.join(__dirname, '../../public/invoices');
        
        if (!fs.existsSync(invoiceDir)) {
          fs.mkdirSync(invoiceDir, { recursive: true });
        }
        
        const filepath = path.join(invoiceDir, filename);
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        doc.fontSize(20).text('RECHNUNG', 400, 50, { align: 'right' });
        doc.fontSize(10)
           .text(`Nr: ${invoice.invoice_number}`, 400, 75, { align: 'right' })
           .text(`Datum: ${new Date(invoice.invoice_date).toLocaleDateString('de-DE')}`, 400, 90, { align: 'right' });

        doc.fontSize(10)
           .text(company.company_name, 50, 150)
           .text(company.address_line1 || '', 50, 165)
           .text(`${company.postal_code || ''} ${company.city || ''}`, 50, 180)
           .text(`Email: ${company.email || ''}`, 50, 195);

        doc.text('Rechnungsadresse:', 300, 150)
           .text(`${order.first_name} ${order.last_name}`, 300, 165)
           .text(order.address_line1, 300, 180)
           .text(`${order.postal_code} ${order.city}`, 300, 210);

        doc.moveTo(50, 260).lineTo(550, 260).stroke();

        const tableTop = 280;
        doc.font('Helvetica-Bold')
           .text('Pos', 50, tableTop)
           .text('Beschreibung', 100, tableTop)
           .text('Menge', 350, tableTop)
           .text('Preis', 420, tableTop)
           .text('Summe', 490, tableTop);

        doc.font('Helvetica');
        let yPosition = tableTop + 25;
        items.forEach((item, index) => {
          doc.text(index + 1, 50, yPosition)
             .text(item.name, 100, yPosition, { width: 230 })
             .text(item.quantity, 350, yPosition)
             .text(`€${parseFloat(item.price).toFixed(2)}`, 420, yPosition)
             .text(`€${parseFloat(item.total).toFixed(2)}`, 490, yPosition);
          yPosition += 25;
        });

        yPosition += 10;
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 20;

        doc.text('Zwischensumme:', 350, yPosition).text(`€${parseFloat(invoice.subtotal).toFixed(2)}`, 490, yPosition);
        yPosition += 20;

        if (invoice.shipping_cost > 0) {
          doc.text('Versandkosten:', 350, yPosition).text(`€${parseFloat(invoice.shipping_cost).toFixed(2)}`, 490, yPosition);
          yPosition += 20;
        }

        const netAmount = parseFloat(invoice.subtotal) + parseFloat(invoice.shipping_cost);
        doc.text('Netto:', 350, yPosition).text(`€${netAmount.toFixed(2)}`, 490, yPosition);
        yPosition += 20;

        doc.text(`MwSt (${invoice.tax_rate}%):`, 350, yPosition).text(`€${parseFloat(invoice.tax_amount).toFixed(2)}`, 490, yPosition);
        yPosition += 20;

        doc.font('Helvetica-Bold').fontSize(12)
           .text('GESAMT:', 350, yPosition)
           .text(`€${parseFloat(invoice.total).toFixed(2)}`, 490, yPosition);

        yPosition += 40;
        doc.font('Helvetica').fontSize(10);
        doc.text('Zahlungsinformationen:', 50, yPosition);
        yPosition += 20;
        if (company.iban) doc.text(`IBAN: ${company.iban}`, 50, yPosition);
        
        doc.end();
        stream.on('finish', () => resolve(`/invoices/${filename}`));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  async getNextInvoiceNumber() {
    try {
      const result = await pool.query('SELECT generate_invoice_number()');
      return result.rows[0].generate_invoice_number;
    } catch (error) {
      // Fallback if function doesn't exist yet
      return `INV-${new Date().getFullYear()}-${Date.now()}`;
    }
  }

  async getAllInvoices() {
    try {
      const result = await pool.query(`
        SELECT i.*, c.first_name, c.last_name, o.order_number
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        LEFT JOIN orders o ON i.order_id = o.id
        ORDER BY i.created_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Get all invoices error:', error);
      return [];
    }
  }

  async getInvoiceById(invoiceId) {
    const result = await pool.query(`
      SELECT i.*, c.first_name, c.last_name, c.email, c.address_line1, c.city, c.postal_code
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = $1
    `, [invoiceId]);
    
    if (result.rows.length === 0) {
      throw new Error('Invoice not found');
    }
    
    return result.rows[0];
  }

  async getInvoiceByOrderId(orderId) {
    const result = await pool.query(`
      SELECT * FROM invoices WHERE order_id = $1
    `, [orderId]);
    
    return result.rows[0] || null;
  }
}

// ========================================
// EXPORTS (ALL OF THEM!)
// ========================================

const invoiceService = new InvoiceService();

// Named exports for compatibility
export const generateInvoice = (orderId) => invoiceService.generateInvoice(orderId);
export const generateInvoicePDF = (orderData, invoiceNumber) => invoiceService.generateInvoicePDF(orderData, invoiceNumber);
export const generateCommissionStatement = (commissionData, statementNumber) => invoiceService.generateCommissionStatement(commissionData, statementNumber);
export const getAllInvoices = () => invoiceService.getAllInvoices();
export const getInvoiceById = (invoiceId) => invoiceService.getInvoiceById(invoiceId);
export const getInvoiceByOrderId = (orderId) => invoiceService.getInvoiceByOrderId(orderId);

// Default export
export default invoiceService;