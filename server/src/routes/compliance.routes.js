// server/src/routes/compliance.routes.js
// GROUP 10: Legal Compliance routes
import { Router } from 'express';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';
import * as complianceController from '../controllers/compliance.controller.js';

const router = Router();

// Partner routes
router.post('/termination/request', authenticate, complianceController.requestTermination);
router.get('/termination/status', authenticate, complianceController.getTerminationStatus);
router.get('/intranet-fee/status', authenticate, complianceController.getIntranetFeeStatus);

// Admin routes
router.get('/admin/terminations', authenticate, isAdmin, complianceController.getTerminationRequests);
router.put('/admin/terminations/:id', authenticate, isAdmin, complianceController.processTermination);
router.post('/admin/intranet-fee/payment', authenticate, isAdmin, complianceController.recordFeePayment);
router.get('/admin/intranet-fee/overdue', authenticate, isAdmin, complianceController.getOverduePartners);
router.get('/admin/inactivity', authenticate, isAdmin, complianceController.getInactivityReport);

export default router;
