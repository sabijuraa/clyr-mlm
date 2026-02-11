import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import * as shippingController from '../controllers/shipping.controller.js';

const router = express.Router();

// Public routes
router.get('/rates', shippingController.getAllRates);
router.get('/default-rate', shippingController.getDefaultRate);
router.post('/calculate', shippingController.calculateShipping);

// Admin routes
router.get('/admin/rates', authenticate, requireRole('admin'), shippingController.getAdminRates);
router.post('/admin/rates', authenticate, requireRole('admin'), shippingController.createRate);
router.put('/admin/rates/:id', authenticate, requireRole('admin'), shippingController.updateRate);
router.delete('/admin/rates/:id', authenticate, requireRole('admin'), shippingController.deleteRate);

export default router;
