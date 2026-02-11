import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import * as variantController from '../controllers/variant.controller.js';

const router = express.Router();

// Public routes
router.get('/product/:slug', variantController.getProductWithVariants);
router.get('/product/:productId/options', variantController.getProductVariants);

// Admin routes
router.get('/options', authenticate, requireRole('admin'), variantController.getVariantOptions);
router.post('/options', authenticate, requireRole('admin'), variantController.createVariantOption);
router.put('/options/:id', authenticate, requireRole('admin'), variantController.updateVariantOption);
router.post('/assign', authenticate, requireRole('admin'), variantController.assignVariantToProduct);
router.delete('/product/:productId/option/:optionId', authenticate, requireRole('admin'), variantController.removeVariantFromProduct);

export default router;
