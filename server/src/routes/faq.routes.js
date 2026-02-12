// server/src/routes/faq.routes.js
import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import * as faqController from '../controllers/faq.controller.js';

const router = Router();

// Public
router.get('/', faqController.getFaqItems);

// Admin
router.get('/admin/all', authenticate, isAdmin, faqController.getAllFaqItems);
router.post('/admin', authenticate, isAdmin, faqController.createFaqItem);
router.put('/admin/:id', authenticate, isAdmin, faqController.updateFaqItem);
router.delete('/admin/:id', authenticate, isAdmin, faqController.deleteFaqItem);

export default router;
