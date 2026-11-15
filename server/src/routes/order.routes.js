import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.middleware.js';
import { validationRules, handleValidationErrors } from '../middleware/validation.middleware.js';

const router = Router();

// ============================================
// STATIC ROUTES FIRST (before any :id wildcard routes)
// ============================================

// Stripe redirects here after payment - backend verifies, then returns user to frontend
router.get('/payment-success', orderController.paymentSuccessRedirect);

// Calculate order totals
router.post('/calculate-totals', optionalAuth, orderController.calculateOrderTotals);

// Validate discount code
router.post('/validate-discount', orderController.validateDiscountCode);

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
  '/:id/mark-paid',
  authenticate,
  requireRole('admin'),
  orderController.markOrderPaid
);

router.post(
  '/:id/repair-financials',
  authenticate,
  requireRole('admin'),
  orderController.repairOrderFinancials
);

router.post(
  '/:id/refund',
  authenticate,
  requireRole('admin'),
  orderController.refundOrder
);

// Two-step product return process: receiving the goods records the negative
// credit note; the separate endpoint is the explicit money-refund confirmation.
router.get(
  '/:id/returns',
  authenticate,
  requireRole('admin'),
  orderController.getOrderReturns
);

router.post(
  '/:id/returns',
  authenticate,
  requireRole('admin'),
  orderController.receiveOrderReturn
);

router.post(
  '/:id/returns/:returnId/refund',
  authenticate,
  requireRole('admin'),
  orderController.refundReceivedReturn
);

router.get(
  '/:id/invoice',
  authenticate,
  orderController.generateInvoice
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  orderController.deleteOrder
);

export default router;
