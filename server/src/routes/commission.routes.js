import { Router } from 'express';
import * as commissionController from '../controllers/commission.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Partner routes
router.get('/', commissionController.getMyCommissions);
router.get('/summary', commissionController.getCommissionSummary);
router.get('/statement/:period', commissionController.getStatement);

// Admin routes
router.get('/all', requireRole('admin', 'accounting'), commissionController.getAllCommissions);
router.get('/pending', requireRole('admin'), commissionController.getPendingCommissions);
router.post('/release', requireRole('admin'), commissionController.releaseCommissions);
router.post('/process-payouts', requireRole('admin'), commissionController.processPayouts);
router.post('/generate-statement', requireRole('admin'), commissionController.generateStatementForPartner);
router.post('/bonus-pool', requireRole('admin'), commissionController.distributeBonusPoolHandler);
router.post('/rank-decay', requireRole('admin'), commissionController.runRankDecay);

export default router;
