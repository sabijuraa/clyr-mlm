// server/src/routes/settings.routes.js
import express from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import invoiceService from '../services/invoice.service.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/legal/:type', settingsController.getLegalDocument);
router.get('/legal', settingsController.getAllLegalDocuments);
router.get('/company', settingsController.getCompanySettings);
router.get('/shipping-rules', settingsController.getShippingRules);

// Admin routes - Legal documents
router.put('/admin/legal/:type', authenticate, isAdmin, settingsController.updateLegalDocument);

// Admin routes - Company settings
router.put('/admin/company', authenticate, isAdmin, settingsController.updateCompanySettings);

// Admin routes - Shipping rules
router.put('/admin/shipping-rules/:id', authenticate, isAdmin, settingsController.updateShippingRule);

// Admin routes - Invoices
router.get('/admin/invoices', authenticate, isAdmin, async (req, res) => {
  try {
    const invoices = await invoiceService.getAllInvoices();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

export default router;