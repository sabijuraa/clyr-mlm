import { Router } from 'express';
import * as stripeConnect from '../controllers/stripe-connect.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Partner routes — authenticated
router.get('/status',         authenticate, stripeConnect.getConnectStatus);
router.post('/onboarding',    authenticate, stripeConnect.startOnboarding);
router.get('/dashboard-link', authenticate, stripeConnect.getConnectDashboardLink);

// Admin routes
router.get('/payouts',          authenticate, requireRole('admin'), stripeConnect.getPayoutHistory);
router.post('/process-payouts', authenticate, requireRole('admin'), stripeConnect.processStripePayouts);

// Admin: diagnose — show current commission/payout state
router.get('/diagnose', authenticate, requireRole('admin'), stripeConnect.diagnosePayouts);

// Admin: force release + pay now (for missed payouts)
router.post('/release-and-pay', authenticate, requireRole('admin'), stripeConnect.releaseAndPay);

export default router;
