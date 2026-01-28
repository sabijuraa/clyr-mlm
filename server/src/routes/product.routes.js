import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { uploadProductImages } from '../middleware/upload.middleware.js';

const router = Router();

// Public routes
router.get('/', productController.getAllProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/categories', productController.getCategories);
router.get('/category/:slug', productController.getProductsByCategory);
router.get('/:slug', productController.getProductBySlug);

// Admin routes
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  uploadProductImages,
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  uploadProductImages,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  productController.deleteProduct
);

router.patch(
  '/:id/stock',
  authenticate,
  requireRole('admin'),
  productController.updateStock
);

export default router;
