import express from 'express';
import * as academyController from '../controllers/academy.controller.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import { uploadAcademy, uploadSingleToSpaces } from '../middleware/upload.middleware.js';

const router = express.Router();

// Partner routes
router.get('/', authenticate, academyController.getContent);
router.get('/progress', authenticate, academyController.getProgressOverview);
router.get('/content/:slug', authenticate, academyController.getContentItem);
router.post('/progress/:contentId', authenticate, academyController.updateProgress);
router.post('/complete/:contentId', authenticate, academyController.markComplete);

// Admin routes
router.get('/admin/all', authenticate, isAdmin, academyController.getAllContent);
router.post('/admin/content', authenticate, isAdmin, academyController.createContent);
router.put('/admin/content/:id', authenticate, isAdmin, academyController.updateContent);
router.delete('/admin/content/:id', authenticate, isAdmin, academyController.deleteContent);
router.get('/admin/partner/:partnerId/progress', authenticate, isAdmin, academyController.getPartnerProgressStats);

// File upload for academy content (videos, PDFs, documents)
router.post('/admin/upload', authenticate, isAdmin, uploadAcademy.single('file'), uploadSingleToSpaces('academy'), academyController.uploadFile);

export default router;

