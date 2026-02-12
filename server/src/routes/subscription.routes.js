import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Customer routes
router.get('/my', authenticate, subscriptionController.getMySubscriptions);
router.post('/:id/cancel', authenticate, subscriptionController.cancelSubscription);
router.post('/:id/pause', authenticate, subscriptionController.pauseSubscription);
router.post('/:id/resume', authenticate, subscriptionController.resumeSubscription);

// Admin routes
router.get('/admin/all', authenticate, isAdmin, subscriptionController.getAllSubscriptions);
router.get('/admin/due', authenticate, isAdmin, subscriptionController.getDueSubscriptions);
router.get('/admin/stats', authenticate, isAdmin, subscriptionController.getSubscriptionStats);
router.post('/admin/run-renewals', authenticate, isAdmin, subscriptionController.runRenewalCycle);

export default router;
