/**
 * Import Routes
 * =============
 * Routes for bulk data imports (admin only)
 */

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import {
  importPartners,
  importCustomers,
  importDownlines,
  getPartnersTemplate,
  getCustomersTemplate,
  getDownlinesTemplate,
  upload
} from '../controllers/import.controller.js';

const router = Router();

// All import routes require admin authentication
router.use(authenticate, requireAdmin);

// Import endpoints
router.post('/partners', upload.single('file'), importPartners);
router.post('/customers', upload.single('file'), importCustomers);
router.post('/downlines', upload.single('file'), importDownlines);

// Template downloads
router.get('/templates/partners', getPartnersTemplate);
router.get('/templates/customers', getCustomersTemplate);
router.get('/templates/downlines', getDownlinesTemplate);

export default router;
