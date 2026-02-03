// server/src/services/invoice.service.js
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import pool from '../config/database.js';

class InvoiceService {
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

  async getNextInvoiceNumber() {
    const result = await pool.query('SELECT generate_invoice_number()');
    return result.rows[0].generate_invoice_number;
  }

  async generatePDF(invoice, order, items) {
    return new Promise(async (resolve, reject) => {
      try {
        const companyResult = await pool.query('SELECT * FROM company_settings WHERE id = 1');
        const company = companyResult.rows[0] || { company_name: 'CLYR', email: 'info@clyr.de' };

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const filename = `${invoice.invoice_number}.pdf`;
        const invoiceDir = path.join(process.cwd(), 'public', 'invoices');
        
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

  async getAllInvoices() {
    const result = await pool.query(`
      SELECT i.*, c.first_name, c.last_name, o.order_number
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN orders o ON i.order_id = o.id
      ORDER BY i.created_at DESC
    `);
    return result.rows;
  }
}

export default new InvoiceService();