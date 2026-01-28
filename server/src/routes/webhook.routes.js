import { Router } from 'express';
import * as webhookController from '../controllers/webhook.controller.js';

const router = Router();

// Stripe webhook (raw body handled in index.js)
router.post('/stripe', webhookController.handleStripeWebhook);

export default router;