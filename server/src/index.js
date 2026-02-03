// Add to server/src/routes/index.js

import { upload, uploadSingleToSpaces, uploadMultipleToSpaces } from '../middleware/upload.middleware.js';
import * as brandingController from '../controllers/branding.controller.js';
import * as productController from '../controllers/product.controller.js';
import * as customerController from '../controllers/customer.controller.js';
import * as settingsController from '../controllers/settings.controller.js';
import invoiceService from '../services/invoice.service.js';

// ===== PUBLIC ROUTES =====
router.get('/branding', brandingController.getBranding);
router.get('/legal/:type', settingsController.getLegalDocument);
router.get('/legal', settingsController.getAllLegalDocuments);
router.get('/company', settingsController.getCompanySettings);
router.get('/shipping-rules', settingsController.getShippingRules);

// Customer Auth
router.post('/customer/login', customerController.customerLogin);
router.post('/customer/register', customerController.customerRegister);

// ===== CUSTOMER ROUTES =====
router.get('/customer/profile', authenticateUser, customerController.getCustomerProfile);
router.put('/customer/profile', authenticateUser, customerController.updateCustomerProfile);
router.get('/customer/orders', authenticateUser, customerController.getCustomerOrders);
router.get('/customer/invoices', authenticateUser, customerController.getCustomerInvoices);

// ===== ADMIN ROUTES =====

// Branding
router.put('/admin/branding', authenticateAdmin, brandingController.updateBranding);
router.post('/admin/branding/logo-light', authenticateAdmin, upload.single('logo'), uploadSingleToSpaces('branding'), brandingController.uploadLogoLight);
router.post('/admin/branding/logo-dark', authenticateAdmin, upload.single('logo'), uploadSingleToSpaces('branding'), brandingController.uploadLogoDark);
router.post('/admin/branding/favicon', authenticateAdmin, upload.single('favicon'), uploadSingleToSpaces('branding'), brandingController.uploadFavicon);

// Products
router.post('/admin/products', authenticateAdmin, upload.array('images', 5), uploadMultipleToSpaces('products'), productController.createProduct);
router.put('/admin/products/:id', authenticateAdmin, upload.array('images', 5), uploadMultipleToSpaces('products'), productController.updateProduct);
router.post('/admin/products/:id/images', authenticateAdmin, upload.array('images', 5), uploadMultipleToSpaces('products'), productController.uploadProductImages);
router.delete('/admin/products/:id/images', authenticateAdmin, productController.removeProductImage);

// Legal Documents
router.put('/admin/legal/:type', authenticateAdmin, settingsController.updateLegalDocument);

// Company Settings
router.put('/admin/company', authenticateAdmin, settingsController.updateCompanySettings);

// Shipping Rules
router.put('/admin/shipping-rules/:id', authenticateAdmin, settingsController.updateShippingRule);

// Invoices
router.get('/admin/invoices', authenticateAdmin, async (req, res) => {
  try {
    const invoices = await invoiceService.getAllInvoices();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/invoices/generate/:orderId', authenticateAdmin, async (req, res) => {
  try {
    const invoice = await invoiceService.generateInvoice(req.params.orderId);
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});