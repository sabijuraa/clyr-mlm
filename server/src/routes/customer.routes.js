/**
 * Customer Portal Routes
 * ======================
 * Routes for customer-facing portal
 */

import { Router } from 'express';
import { authenticateCustomer } from '../middleware/auth.middleware.js';
import {
  registerCustomer,
  loginCustomer,
  getCurrentCustomer,
  getCustomerOrders,
  getCustomerOrder,
  downloadCustomerInvoice,
  getCustomerSubscriptions,
  cancelSubscription,
  reactivateSubscription,
  updateCustomerProfile,
  changeCustomerPassword,
  forgotCustomerPassword,
  resetCustomerPassword
} from '../controllers/customer.controller.js';

const router = Router();

// Public routes (no auth)
router.post('/register', registerCustomer);
router.post('/login', loginCustomer);
router.post('/forgot-password', forgotCustomerPassword);
router.post('/reset-password', resetCustomerPassword);

// Protected routes (require customer auth)
router.get('/me', authenticateCustomer, getCurrentCustomer);
router.put('/profile', authenticateCustomer, updateCustomerProfile);
router.put('/change-password', authenticateCustomer, changeCustomerPassword);

// Orders
router.get('/orders', authenticateCustomer, getCustomerOrders);
router.get('/orders/:orderNumber', authenticateCustomer, getCustomerOrder);
router.get('/orders/:orderNumber/invoice', authenticateCustomer, downloadCustomerInvoice);

// Subscriptions
router.get('/subscriptions', authenticateCustomer, getCustomerSubscriptions);
router.post('/subscriptions/:id/cancel', authenticateCustomer, cancelSubscription);
router.post('/subscriptions/:id/reactivate', authenticateCustomer, reactivateSubscription);

export default router;
