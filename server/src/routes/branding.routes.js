// server/src/routes/branding.routes.js
import express from 'express';
import { upload, uploadSingleToSpaces } from '../middleware/upload.middleware.js';
import * as brandingController from '../controllers/branding.controller.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route
router.get('/branding', brandingController.getBranding);

// Admin routes
router.put('/admin/branding', authenticate, isAdmin, brandingController.updateBranding);
router.post('/admin/branding/logo-light', authenticate, isAdmin, upload.single('logo'), uploadSingleToSpaces('branding'), brandingController.uploadLogoLight);
router.post('/admin/branding/logo-dark', authenticate, isAdmin, upload.single('logo'), uploadSingleToSpaces('branding'), brandingController.uploadLogoDark);
router.post('/admin/branding/favicon', authenticate, isAdmin, upload.single('favicon'), uploadSingleToSpaces('branding'), brandingController.uploadFavicon);

export default router;