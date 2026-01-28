import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Customer routes
router.get('/my', authenticateToken, subscriptionController.getMySubscriptions);
router.post('/:id/cancel', authenticateToken, subscriptionController.cancelSubscription);
router.post('/:id/pause', authenticateToken, subscriptionController.pauseSubscription);
router.post('/:id/resume', authenticateToken, subscriptionController.resumeSubscription);

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, subscriptionController.getAllSubscriptions);
router.get('/admin/due', authenticateToken, requireAdmin, subscriptionController.getDueSubscriptions);
router.get('/admin/stats', authenticateToken, requireAdmin, subscriptionController.getSubscriptionStats);
router.post('/admin/run-renewals', authenticateToken, requireAdmin, subscriptionController.runRenewalCycle);

export default router;
