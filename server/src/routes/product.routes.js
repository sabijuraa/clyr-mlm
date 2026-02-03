/**
 * Product Routes
 * ==============
 * Routes for product management (public + admin)
 */

import express from 'express';
import * as productController from '../controllers/product.controller.js';
import { authenticate, isAdmin, optionalAuth } from '../middleware/auth.middleware.js';
import { upload, uploadMultipleToSpaces } from '../middleware/upload.middleware.js';

const router = express.Router();

// ========================================
// PUBLIC ROUTES (no auth required)
// ========================================

// Get all active products (public shop)
router.get('/', optionalAuth, productController.getAllProducts);

// Get featured products for homepage
router.get('/featured', productController.getFeaturedProducts);

// Get new products
router.get('/new', productController.getNewProducts);

// Get all categories
router.get('/categories', productController.getCategories);

// Get products by category
router.get('/category/:slug', optionalAuth, productController.getProductsByCategory);

// Get single product by slug (public)
router.get('/slug/:slug', optionalAuth, productController.getProductBySlug);

// Get single product by ID (public)
router.get('/:id', optionalAuth, productController.getProductById);

// ========================================
// ADMIN ROUTES (requires authentication + admin role)
// ========================================

// Get all products (including inactive) - Admin only
router.get('/admin/all', authenticate, isAdmin, productController.getAllProductsAdmin);

// Get product statistics - Admin only
router.get('/admin/stats', authenticate, isAdmin, productController.getProductStats);

// Create new product with images - Admin only (NEW - with Spaces upload)
router.post(
  '/admin', 
  authenticate, 
  isAdmin, 
  upload.array('images', 5), 
  uploadMultipleToSpaces('products'), 
  productController.createProduct
);

// Update product with new images - Admin only (NEW - with Spaces upload)
router.put(
  '/admin/:id', 
  authenticate, 
  isAdmin, 
  upload.array('images', 5), 
  uploadMultipleToSpaces('products'), 
  productController.updateProduct
);

// Upload additional product images - Admin only (NEW - for Theresa's fixes)
router.post(
  '/admin/:id/images', 
  authenticate, 
  isAdmin, 
  upload.array('images', 5), 
  uploadMultipleToSpaces('products'), 
  productController.uploadProductImages
);

// Remove product image - Admin only (NEW - for Theresa's fixes)
router.delete(
  '/admin/:id/images', 
  authenticate, 
  isAdmin, 
  productController.removeProductImage
);

// Delete product (soft delete) - Admin only
router.delete('/admin/:id', authenticate, isAdmin, productController.deleteProduct);

// Toggle product active status - Admin only
router.patch('/admin/:id/toggle-active', authenticate, isAdmin, productController.toggleProductActive);

// Toggle product featured status - Admin only
router.patch('/admin/:id/toggle-featured', authenticate, isAdmin, productController.toggleProductFeatured);

// Update product stock - Admin only
router.patch('/admin/:id/stock', authenticate, isAdmin, productController.updateProductStock);

// Bulk update products - Admin only
router.post('/admin/bulk-update', authenticate, isAdmin, productController.bulkUpdateProducts);

// Upload single product image (legacy) - Admin only
router.post('/admin/:id/image', authenticate, isAdmin, productController.uploadProductImage);

// Delete product image by index (legacy) - Admin only
router.delete('/admin/:id/image/:imageIndex', authenticate, isAdmin, productController.deleteProductImage);

export default router;