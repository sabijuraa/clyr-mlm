// server/src/routes/settings.routes.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as settingsController from '../controllers/settings.controller.js';
import * as brandingController from '../controllers/branding.controller.js';
import { upload, uploadSingleToSpaces } from '../middleware/upload.middleware.js';
import invoiceService from '../services/invoice.service.js';
import pool from '../config/database.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Public routes (legal routes removed - handled by /api/legal via legal.routes.js)
router.get('/company', settingsController.getCompanySettings);
router.get('/shipping-rules', settingsController.getShippingRules);
router.get('/return-policy', settingsController.getReturnPolicy);
router.get('/shipping-costs', settingsController.getShippingCosts);
router.get('/vat-rates', settingsController.getVatRates);

// Admin routes - Company settings (legal routes removed - handled by legal.routes.js)
router.put('/admin/company', authenticate, isAdmin, settingsController.updateCompanySettings);

// Admin routes - Shipping rules
router.put('/admin/shipping-rules/:id', authenticate, isAdmin, settingsController.updateShippingRule);

// Admin routes - Return policy
router.put('/admin/return-policy', authenticate, isAdmin, settingsController.updateReturnPolicy);

// Admin routes - Shipping costs
router.put('/admin/shipping-costs', authenticate, isAdmin, settingsController.updateShippingCosts);

// Admin routes - VAT rates
router.put('/admin/vat-rates', authenticate, isAdmin, settingsController.updateVatRates);

// Admin routes - Branding (client expects at /api/admin/settings/branding)
router.get('/admin/settings/branding', authenticate, isAdmin, brandingController.getBranding);
router.put('/admin/settings/branding', authenticate, isAdmin, brandingController.updateBranding);
router.post('/admin/settings/branding/logo', authenticate, isAdmin, upload.single('logo'), uploadSingleToSpaces('branding'), brandingController.uploadLogoLight);
router.post('/admin/settings/branding/logo-light', authenticate, isAdmin, upload.single('logo'), uploadSingleToSpaces('branding'), brandingController.uploadLogoLight);
router.post('/admin/settings/branding/logo-dark', authenticate, isAdmin, upload.single('logo'), uploadSingleToSpaces('branding'), brandingController.uploadLogoDark);
router.post('/admin/settings/branding/favicon', authenticate, isAdmin, upload.single('favicon'), uploadSingleToSpaces('branding'), brandingController.uploadFavicon);

// Admin routes - Invoices
router.get('/admin/invoices', authenticate, isAdmin, async (req, res) => {
  try {
    const { type } = req.query;
    const invoices = await invoiceService.getAllInvoices(type);
    res.json({ invoices });
  } catch (error) {
    res.status(500).json({ error: error.message, invoices: [] });
  }
});

router.post('/admin/invoices/generate/:orderId', authenticate, isAdmin, async (req, res) => {
  try {
    const invoice = await invoiceService.generateInvoice(req.params.orderId);
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download invoice PDF by invoice ID
router.get('/admin/invoices/:id/pdf', authenticate, isAdmin, async (req, res) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    if (invoice.pdf_url) {
      const pdfPath = path.join(__dirname, '../../public', invoice.pdf_url);
      if (fs.existsSync(pdfPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
        return res.sendFile(pdfPath);
      }
    }
    // If no file on disk, regenerate
    if (invoice.order_id) {
      const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [invoice.order_id]);
      if (orderResult.rows.length > 0) {
        const order = orderResult.rows[0];
        const itemsResult = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
        order.items = itemsResult.rows;
        order.invoice_number = invoice.invoice_number;
        const pdfBuffer = await invoiceService.generateInvoicePDFBuffer(order);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        return res.end(pdfBuffer);
      }
    }
    res.status(404).json({ error: 'PDF nicht gefunden' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate invoices for all orders that don't have one
router.post('/admin/invoices/generate-missing', authenticate, isAdmin, async (req, res) => {
  try {
    const ordersResult = await pool.query(`
      SELECT o.id FROM orders o
      LEFT JOIN invoices i ON i.order_id = o.id AND i.type = 'customer'
      WHERE i.id IS NULL AND o.payment_status IN ('paid', 'pending')
      ORDER BY o.created_at ASC
      LIMIT 50
    `);
    
    let generated = 0;
    for (const row of ordersResult.rows) {
      try {
        await invoiceService.generateInvoice(row.id);
        generated++;
      } catch (err) {
        console.error(`Failed to generate invoice for order ${row.id}:`, err.message);
      }
    }
    
    res.json({ generated, total: ordersResult.rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
