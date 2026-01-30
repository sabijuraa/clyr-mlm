import express from 'express';
import * as payoutController from '../controllers/payout.controller.js';
import { authenticate, requireRole, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Partner routes
router.get('/my', authenticate, payoutController.getMyPayouts);
router.post('/request', authenticate, requireRole('partner'), payoutController.requestPayout);
router.get('/:id', authenticate, payoutController.getPayoutDetails);
router.get('/:id/statement', authenticate, payoutController.downloadStatement);

// Admin routes
router.get('/admin/pending', authenticate, isAdmin, payoutController.getPendingPayouts);
router.get('/admin/eligible', authenticate, isAdmin, payoutController.getEligiblePartners);
router.get('/admin/stats', authenticate, isAdmin, payoutController.getPayoutStats);
router.post('/admin/:id/approve', authenticate, isAdmin, payoutController.approvePayout);
router.post('/admin/:id/cancel', authenticate, isAdmin, payoutController.cancelPayout);
router.post('/admin/:id/complete', authenticate, isAdmin, payoutController.completePayout);
router.post('/admin/process', authenticate, isAdmin, payoutController.processPayouts);
router.post('/admin/run-cycle', authenticate, isAdmin, payoutController.runPayoutCycle);

export default router;
