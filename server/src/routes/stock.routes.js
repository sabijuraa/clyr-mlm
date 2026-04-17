import express from 'express';
import * as stockController from '../controllers/stock.controller.js';
import { authenticate, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Get stock levels for all products
router.get('/levels', stockController.getStockLevels);

// Get low stock alerts
router.get('/alerts', stockController.getLowStockAlerts);

// Get stock movements for a specific product
router.get('/movements/:productId', stockController.getStockMovements);

// Adjust stock manually
router.post('/adjust/:productId', stockController.adjustStock);

// Update low stock threshold
router.patch('/threshold/:productId', stockController.updateThreshold);

// Bulk stock import
router.post('/bulk-import', stockController.bulkImport);

export default router;
