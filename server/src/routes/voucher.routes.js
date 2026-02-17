// server/src/routes/voucher.routes.js
import { Router } from 'express';
import * as voucherController from '../controllers/voucher.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// PUBLIC: Validate voucher at checkout (no auth needed)
router.post('/validate', voucherController.validateVoucher);

// PARTNER: Manage own vouchers
router.get('/my', authenticate, voucherController.getMyVouchers);
router.post('/', authenticate, voucherController.createVoucher);
router.patch('/:id/toggle', authenticate, voucherController.toggleVoucher);
router.delete('/:id', authenticate, voucherController.deleteVoucher);

// ADMIN: Manage all vouchers
router.get('/admin/all', authenticate, requireRole('admin'), voucherController.getAllVouchers);
router.delete('/admin/:id', authenticate, requireRole('admin'), voucherController.adminDeleteVoucher);

export default router;
