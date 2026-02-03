/**
 * Customer Portal Routes
 * ======================
 * Routes for customer-facing portal
 */

import { Router } from 'express';
import { authenticateCustomer } from '../middleware/auth.middleware.js';
import * as customerController from '../controllers/customer.controller.js';

const router = Router();

// ========================================
// PUBLIC ROUTES (no auth required)
// ========================================

// Registration & Authentication
router.post('/register', customerController.customerRegister);
router.post('/login', customerController.customerLogin);

// ========================================
// PROTECTED ROUTES (require customer auth)
// ========================================

// Profile Management
router.get('/profile', authenticateCustomer, customerController.getCustomerProfile);
router.put('/profile', authenticateCustomer, customerController.updateCustomerProfile);

// Orders Management
router.get('/orders', authenticateCustomer, customerController.getCustomerOrders);

// Invoices
router.get('/invoices', authenticateCustomer, customerController.getCustomerInvoices);

export default router;