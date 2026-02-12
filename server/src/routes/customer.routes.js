// server/src/routes/customer.routes.js
// GROUP 7: Customer Portal routes
import { Router } from 'express';
import { authenticateCustomer } from '../middleware/auth.middleware.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import * as customerController from '../controllers/customer.controller.js';
import multer from 'multer';
import path from 'path';

const router = Router();

// Multer for document uploads
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/documents'),
  filename: (req, file, cb) => cb(null, `doc-${Date.now()}${path.extname(file.originalname)}`)
});
const docUpload = multer({ storage: docStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// ========================================
// PUBLIC (no auth)
// ========================================
router.post('/register', customerController.customerRegister);
router.post('/login', customerController.customerLogin);

// ========================================
// CUSTOMER AUTH REQUIRED
// ========================================
router.get('/profile', authenticateCustomer, customerController.getCustomerProfile);
router.put('/profile', authenticateCustomer, customerController.updateCustomerProfile);
router.get('/orders', authenticateCustomer, customerController.getCustomerOrders);
router.get('/invoices', authenticateCustomer, customerController.getCustomerInvoices);
router.get('/orders/:orderNumber/invoice', authenticateCustomer, customerController.downloadOrderInvoice);

// #42: Documents
router.get('/documents', authenticateCustomer, customerController.getCustomerDocuments);
router.get('/documents/product/:productId', customerController.getDocumentsByProduct);

// #36: Subscriptions
router.get('/subscriptions', authenticateCustomer, customerController.getCustomerSubscriptions);
router.post('/subscriptions', authenticateCustomer, customerController.createFilterSubscription);
router.post('/subscriptions/:id/cancel', authenticateCustomer, customerController.cancelCustomerSubscription);

// ========================================
// ADMIN: Upload documents for customers
// ========================================
router.post('/admin/documents', authenticate, isAdmin, docUpload.single('file'), customerController.uploadCustomerDocument);

export default router;
