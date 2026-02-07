// server/src/routes/legal.routes.js
import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import * as legalController from '../controllers/legal.controller.js';

const router = Router();

// Public
router.get('/page/:pageKey', legalController.getLegalPage);
router.get('/cookie-settings', legalController.getCookieSettings);
router.post('/cookie-consent', legalController.saveCookieConsent);

// Admin
router.get('/admin/all', authenticate, isAdmin, legalController.getAllLegalPages);
router.put('/admin/:pageKey', authenticate, isAdmin, legalController.updateLegalPage);

export default router;
