/**
 * Import Routes
 * =============
 * Routes for bulk data imports (admin only)
 */

import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import {
  importPartners,
  importCustomers,
  importProducts,
  importDownlines,
  downloadTemplate,
  upload
} from '../controllers/import.controller.js';

const router = Router();

// All import routes require admin authentication
router.use(authenticate, isAdmin);

// Import endpoints
router.post('/partners', upload.single('file'), importPartners);
router.post('/customers', upload.single('file'), importCustomers);
router.post('/products', upload.single('file'), importProducts);
router.post('/downlines', upload.single('file'), importDownlines);

// Template downloads
router.get('/templates/:type', downloadTemplate);

export default router;
