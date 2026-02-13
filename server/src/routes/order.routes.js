import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.middleware.js';
import { validationRules, handleValidationErrors } from '../middleware/validation.middleware.js';

const router = Router();

// Public routes (checkout doesn't require login)
router.post(
  '/',
  optionalAuth,
  validationRules.createOrder,
  handleValidationErrors,
  orderController.createOrder
);

// Get order by ID (for confirmation page)
router.get('/confirmation/:orderNumber', orderController.getOrderConfirmation);

// Public invoice download (no auth - uses order ID, generates on-the-fly)
router.get('/:id/public-invoice', orderController.getPublicInvoice);

// Verify payment and mark order paid (called from confirmation page after Stripe redirect)
router.post('/:id/verify-payment', orderController.verifyPayment);

// Create payment intent
router.post('/create-payment-intent', orderController.createPaymentIntent);

// Calculate shipping & tax
router.post('/calculate', orderController.calculateOrderTotals);

// Partner routes - their referred orders
router.get(
  '/my-referrals',
  authenticate,
  orderController.getPartnerReferredOrders
);

// Admin routes
router.get(
  '/',
  authenticate,
  requireRole('admin', 'support'),
  orderController.getAllOrders
);

router.get(
  '/:id',
  authenticate,
  requireRole('admin', 'support'),
  orderController.getOrderById
);

router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin', 'support'),
  orderController.updateOrderStatus
);

router.post(
  '/:id/refund',
  authenticate,
  requireRole('admin'),
  orderController.refundOrder
);

router.get(
  '/:id/invoice',
  authenticate,
  orderController.generateInvoice
);

export default router;