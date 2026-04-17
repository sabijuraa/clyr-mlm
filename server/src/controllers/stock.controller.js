import { query, transaction } from '../config/database.js';

/**
 * CLYR Stock Controller
 * Handles inventory management and stock movements
 */

/**
 * Get current stock levels for all products
 */
export const getStockLevels = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.id, p.name, p.sku, p.stock, p.reserved_stock,
        p.low_stock_threshold, p.track_stock, p.allow_backorder,
        (p.stock - p.reserved_stock) as available_stock,
        (p.stock <= p.low_stock_threshold) as is_low_stock
      FROM products p
      WHERE p.track_stock = true
      ORDER BY p.stock ASC, p.name ASC
    `);

    // Get low stock count
    const lowStockCount = result.rows.filter(p => p.is_low_stock).length;

    res.json({
      success: true,
      data: {
        products: result.rows,
        summary: {
          totalProducts: result.rows.length,
          lowStockCount,
          outOfStockCount: result.rows.filter(p => p.available_stock <= 0).length
        }
      }
    });
  } catch (error) {
    console.error('Error getting stock levels:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Lagerbestände'
    });
  }
};

/**
 * Get stock movements for a product
 */
export const getStockMovements = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT sm.*, u.email as created_by_email, u.first_name, u.last_name
       FROM stock_movements sm
       LEFT JOIN users u ON sm.created_by = u.id
       WHERE sm.product_id = $1
       ORDER BY sm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, parseInt(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM stock_movements WHERE product_id = $1',
      [productId]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        movements: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting stock movements:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Lagerbewegungen'
    });
  }
};

/**
 * Adjust stock manually (admin)
 */
export const adjustStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, type, notes } = req.body;

    // Validate type
    const validTypes = ['purchase', 'adjustment', 'return'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Bewegungstyp'
      });
    }

    return await transaction(async (client) => {
      // Get current stock
      const productResult = await client.query(
        'SELECT id, name, stock FROM products WHERE id = $1',
        [productId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Produkt nicht gefunden'
        });
      }

      const product = productResult.rows[0];
      const newStock = product.stock + quantity;

      if (newStock < 0) {
        return res.status(400).json({
          success: false,
          message: 'Lagerbestand kann nicht negativ sein'
        });
      }

      // Update product stock
      await client.query(
        'UPDATE products SET stock = $1 WHERE id = $2',
        [newStock, productId]
      );

      // Create movement record
      const movementResult = await client.query(
        `INSERT INTO stock_movements (product_id, quantity, type, reference_type, notes, created_by)
         VALUES ($1, $2, $3, 'manual', $4, $5)
         RETURNING *`,
        [productId, quantity, type, notes, req.user.id]
      );

      // Log activity
      await client.query(
        `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
         VALUES ($1, 'stock_adjusted', 'product', $2, $3)`,
        [req.user.id, productId, JSON.stringify({
          type,
          quantity,
          oldStock: product.stock,
          newStock,
          notes
        })]
      );

      res.json({
        success: true,
        message: 'Lagerbestand angepasst',
        data: {
          movement: movementResult.rows[0],
          newStock
        }
      });
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Anpassen des Lagerbestands'
    });
  }
};

/**
 * Reserve stock for an order
 */
export const reserveStock = async (client, productId, quantity, orderId) => {
  // Get product
  const productResult = await client.query(
    'SELECT stock, reserved_stock, allow_backorder FROM products WHERE id = $1 FOR UPDATE',
    [productId]
  );

  if (productResult.rows.length === 0) {
    throw new Error('Product not found');
  }

  const product = productResult.rows[0];
  const availableStock = product.stock - product.reserved_stock;

  if (availableStock < quantity && !product.allow_backorder) {
    throw new Error(`Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`);
  }

  // Update reserved stock
  await client.query(
    'UPDATE products SET reserved_stock = reserved_stock + $1 WHERE id = $2',
    [quantity, productId]
  );

  // Create movement record
  await client.query(
    `INSERT INTO stock_movements (product_id, quantity, type, reference_type, reference_id)
     VALUES ($1, $2, 'reservation', 'order', $3)`,
    [productId, -quantity, orderId]
  );

  return true;
};

/**
 * Release reserved stock (order cancelled)
 */
export const releaseStock = async (client, productId, quantity, orderId) => {
  // Update reserved stock
  await client.query(
    'UPDATE products SET reserved_stock = GREATEST(0, reserved_stock - $1) WHERE id = $2',
    [quantity, productId]
  );

  // Create movement record
  await client.query(
    `INSERT INTO stock_movements (product_id, quantity, type, reference_type, reference_id)
     VALUES ($1, $2, 'release', 'order', $3)`,
    [productId, quantity, orderId]
  );

  return true;
};

/**
 * Confirm stock deduction (order shipped)
 */
export const confirmStockDeduction = async (client, productId, quantity, orderId) => {
  // Reduce both stock and reserved stock
  await client.query(
    `UPDATE products SET 
       stock = stock - $1,
       reserved_stock = GREATEST(0, reserved_stock - $1)
     WHERE id = $2`,
    [quantity, productId]
  );

  // Create movement record
  await client.query(
    `INSERT INTO stock_movements (product_id, quantity, type, reference_type, reference_id)
     VALUES ($1, $2, 'sale', 'order', $3)`,
    [productId, -quantity, orderId]
  );

  return true;
};

/**
 * Get low stock alerts
 */
export const getLowStockAlerts = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.id, p.name, p.sku, p.stock, p.reserved_stock,
        p.low_stock_threshold,
        (p.stock - p.reserved_stock) as available_stock
      FROM products p
      WHERE p.track_stock = true
      AND p.stock <= p.low_stock_threshold
      ORDER BY p.stock ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting low stock alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Warnungen'
    });
  }
};

/**
 * Update low stock threshold
 */
export const updateThreshold = async (req, res) => {
  try {
    const { productId } = req.params;
    const { threshold } = req.body;

    if (threshold < 0) {
      return res.status(400).json({
        success: false,
        message: 'Schwellenwert muss positiv sein'
      });
    }

    const result = await query(
      'UPDATE products SET low_stock_threshold = $1 WHERE id = $2 RETURNING id, name, low_stock_threshold',
      [threshold, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Schwellenwert aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating threshold:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren'
    });
  }
};

/**
 * Bulk stock import (admin)
 */
export const bulkImport = async (req, res) => {
  try {
    const { items } = req.body; // Array of {sku, quantity}

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Artikel zum Importieren'
      });
    }

    return await transaction(async (client) => {
      const results = [];
      const errors = [];

      for (const item of items) {
        try {
          // Find product by SKU
          const productResult = await client.query(
            'SELECT id, name, stock FROM products WHERE sku = $1',
            [item.sku]
          );

          if (productResult.rows.length === 0) {
            errors.push({ sku: item.sku, error: 'Produkt nicht gefunden' });
            continue;
          }

          const product = productResult.rows[0];
          const newStock = product.stock + item.quantity;

          // Update stock
          await client.query(
            'UPDATE products SET stock = $1 WHERE id = $2',
            [newStock, product.id]
          );

          // Create movement
          await client.query(
            `INSERT INTO stock_movements (product_id, quantity, type, reference_type, notes, created_by)
             VALUES ($1, $2, 'purchase', 'bulk_import', $3, $4)`,
            [product.id, item.quantity, `Bulk Import: ${item.sku}`, req.user.id]
          );

          results.push({
            sku: item.sku,
            name: product.name,
            oldStock: product.stock,
            newStock,
            added: item.quantity
          });
        } catch (err) {
          errors.push({ sku: item.sku, error: err.message });
        }
      }

      res.json({
        success: true,
        message: `${results.length} Produkte importiert, ${errors.length} Fehler`,
        data: { results, errors }
      });
    });
  } catch (error) {
    console.error('Error bulk importing:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Massenimport'
    });
  }
};
