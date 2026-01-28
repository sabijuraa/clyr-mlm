import express from 'express';
import * as payoutController from '../controllers/payout.controller.js';
import { authenticateToken, requireRole, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Partner routes
router.get('/my', authenticateToken, payoutController.getMyPayouts);
router.post('/request', authenticateToken, requireRole(['partner']), payoutController.requestPayout);
router.get('/:id', authenticateToken, payoutController.getPayoutDetails);
router.get('/:id/statement', authenticateToken, payoutController.downloadStatement);

// Admin routes
router.get('/admin/pending', authenticateToken, requireAdmin, payoutController.getPendingPayouts);
router.get('/admin/eligible', authenticateToken, requireAdmin, payoutController.getEligiblePartners);
router.get('/admin/stats', authenticateToken, requireAdmin, payoutController.getPayoutStats);
router.post('/admin/:id/approve', authenticateToken, requireAdmin, payoutController.approvePayout);
router.post('/admin/:id/cancel', authenticateToken, requireAdmin, payoutController.cancelPayout);
router.post('/admin/:id/complete', authenticateToken, requireAdmin, payoutController.completePayout);
router.post('/admin/process', authenticateToken, requireAdmin, payoutController.processPayouts);
router.post('/admin/run-cycle', authenticateToken, requireAdmin, payoutController.runPayoutCycle);

export default router;
