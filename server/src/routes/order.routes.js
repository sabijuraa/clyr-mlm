import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.middleware.js';
import { validationRules, handleValidationErrors } from '../middleware/validation.middleware.js';

const router = Router();

// ============================================
// STATIC ROUTES FIRST (before any :id wildcard routes)
// ============================================

// Stripe redirects here after payment - serves confirmation HTML directly from server
router.get('/payment-success', orderController.paymentSuccessPage);

// Calculate order totals
router.post('/calculate-totals', orderController.calculateOrderTotals);

// Create Stripe Checkout Session
router.post('/create-payment-intent', orderController.createPaymentIntent);

// ============================================
// PUBLIC ROUTES
// ============================================

// Create order (checkout doesn't require login)
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

// Verify payment and mark order paid
router.post('/:id/verify-payment', orderController.verifyPayment);

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