import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { uploadBrandingLogo } from '../middleware/upload.middleware.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Partners management
router.get('/partners', adminController.getPartners);
router.get('/partners/:id', adminController.getPartnerById);
router.patch('/partners/:id/status', adminController.updatePartnerStatus);
router.patch('/partners/:id/rank', adminController.updatePartnerRank);

// Invoices
router.get('/invoices', adminController.getInvoices);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);

// Branding Settings
router.get('/settings/branding', adminController.getBranding);
router.put('/settings/branding', adminController.updateBranding);
router.post('/settings/branding/logo', uploadBrandingLogo, adminController.uploadLogo);

// Reports
router.get('/reports/sales', adminController.getSalesReport);
router.get('/reports/commissions', adminController.getCommissionsReport);
router.get('/reports/partners', adminController.getPartnersReport);

// Export
router.get('/export/orders', adminController.exportOrders);
router.get('/export/commissions', adminController.exportCommissions);

// Activity log
router.get('/activity', adminController.getActivityLog);

export default router;
