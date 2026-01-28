import express from 'express';
import * as academyController from '../controllers/academy.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Partner routes
router.get('/', authenticateToken, academyController.getContent);
router.get('/progress', authenticateToken, academyController.getProgressOverview);
router.get('/content/:slug', authenticateToken, academyController.getContentItem);
router.post('/progress/:contentId', authenticateToken, academyController.updateProgress);
router.post('/complete/:contentId', authenticateToken, academyController.markComplete);

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, academyController.getAllContent);
router.post('/admin/content', authenticateToken, requireAdmin, academyController.createContent);
router.put('/admin/content/:id', authenticateToken, requireAdmin, academyController.updateContent);
router.delete('/admin/content/:id', authenticateToken, requireAdmin, academyController.deleteContent);
router.get('/admin/partner/:partnerId/progress', authenticateToken, requireAdmin, academyController.getPartnerProgressStats);

export default router;
