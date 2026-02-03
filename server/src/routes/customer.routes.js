/**
 * Customer Portal Routes
 * ======================
 * Routes for customer-facing portal
 */

import { Router } from 'express';
import { authenticateCustomer, authenticate } from '../middleware/auth.middleware.js';
import * as customerController from '../controllers/customer.controller.js';

const router = Router();

// ========================================
// PUBLIC ROUTES (no auth required)
// ========================================

// Registration & Authentication
router.post('/register', customerController.registerCustomer || customerController.customerRegister);
router.post('/login', customerController.loginCustomer || customerController.customerLogin);
router.post('/forgot-password', customerController.forgotCustomerPassword);
router.post('/reset-password', customerController.resetCustomerPassword);

// ========================================
// PROTECTED ROUTES (require customer auth)
// ========================================

// Profile Management
router.get('/me', authenticateCustomer, customerController.getCurrentCustomer || customerController.getCustomerProfile);
router.get('/profile', authenticateCustomer, customerController.getCustomerProfile);
router.put('/profile', authenticateCustomer, customerController.updateCustomerProfile);
router.put('/change-password', authenticateCustomer, customerController.changeCustomerPassword);

// Orders Management
router.get('/orders', authenticateCustomer, customerController.getCustomerOrders);
router.get('/orders/:orderNumber', authenticateCustomer, customerController.getCustomerOrder);
router.get('/orders/:orderNumber/invoice', authenticateCustomer, customerController.downloadCustomerInvoice);

// Invoices (NEW - for Theresa's fixes)
router.get('/invoices', authenticateCustomer, customerController.getCustomerInvoices);

// Subscriptions Management
router.get('/subscriptions', authenticateCustomer, customerController.getCustomerSubscriptions);
router.post('/subscriptions/:id/cancel', authenticateCustomer, customerController.cancelSubscription);
router.post('/subscriptions/:id/reactivate', authenticateCustomer, customerController.reactivateSubscription);

export default router;