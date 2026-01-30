import express from 'express';
import * as productController from '../controllers/product.controller.js';
import { authenticate, isAdmin, optionalAuth } from '../middleware/auth.middleware.js';

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

// Create new product - Admin only
router.post('/admin', authenticate, isAdmin, productController.createProduct);

// Update product - Admin only
router.put('/admin/:id', authenticate, isAdmin, productController.updateProduct);

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

// Upload product image - Admin only
router.post('/admin/:id/image', authenticate, isAdmin, productController.uploadProductImage);

// Delete product image - Admin only
router.delete('/admin/:id/image/:imageIndex', authenticate, isAdmin, productController.deleteProductImage);

export default router;