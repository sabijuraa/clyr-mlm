/**
 * GDPR Routes
 * ============
 * Routes for GDPR compliance endpoints
 */

import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import {
  exportUserData,
  exportUserDataPDF,
  deleteUserData,
  getConsents,
  updateConsents,
  withdrawAllConsents,
  getProcessingInfo
} from '../controllers/gdpr.controller.js';

const router = Router();

// Public routes
router.get('/processing-info', getProcessingInfo);

// Authenticated routes
router.get('/export', authenticate, exportUserData);
router.get('/export/pdf', authenticate, exportUserDataPDF);
router.delete('/delete-account', authenticate, deleteUserData);

// Consent routes (optional auth - can work for guests via cookies)
router.get('/consents', optionalAuth, getConsents);
router.put('/consents', optionalAuth, updateConsents);
router.delete('/consents', optionalAuth, withdrawAllConsents);

export default router;
