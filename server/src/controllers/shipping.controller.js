import { query } from '../config/database.js';

/**
 * Shipping Controller
 * Manages shipping rates and calculations
 */

// ============================================
// GET ALL ACTIVE SHIPPING RATES
// ============================================
export const getAllRates = async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM shipping_rates 
      WHERE is_active = true 
      ORDER BY sort_order ASC, base_rate ASC
    `);
    res.json({ rates: result.rows });
  } catch (error) {
    console.error('Get shipping rates error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping rates' });
  }
};

// ============================================
// GET ALL RATES (ADMIN)
// ============================================
export const getAdminRates = async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM shipping_rates 
      ORDER BY sort_order ASC, created_at DESC
    `);
    res.json({ rates: result.rows });
  } catch (error) {
    console.error('Get admin shipping rates error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping rates' });
  }
};

// ============================================
// CREATE SHIPPING RATE
// ============================================
export const createRate = async (req, res) => {
  try {
    const {
      name,
      description,
      base_rate,
      free_shipping_threshold,
      country_code,
      min_weight_kg,
      max_weight_kg,
      estimated_days_min,
      estimated_days_max,
      is_default,
      is_active,
      sort_order
    } = req.body;
    
    if (!name || base_rate === undefined) {
      return res.status(400).json({ error: 'Name and base_rate are required' });
    }
    
    // If this rate is default, unset other defaults
    if (is_default) {
      await query(`UPDATE shipping_rates SET is_default = false`);
    }
    
    const result = await query(`
      INSERT INTO shipping_rates (
        name, description, base_rate, free_shipping_threshold,
        country_code, min_weight_kg, max_weight_kg,
        estimated_days_min, estimated_days_max,
        is_default, is_active, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      name,
      description || null,
      base_rate,
      free_shipping_threshold || null,
      country_code || null,
      min_weight_kg || null,
      max_weight_kg || null,
      estimated_days_min || null,
      estimated_days_max || null,
      is_default || false,
      is_active !== false,
      sort_order || 0
    ]);
    
    res.status(201).json({ rate: result.rows[0] });
  } catch (error) {
    console.error('Create shipping rate error:', error);
    res.status(500).json({ error: 'Failed to create shipping rate' });
  }
};

// ============================================
// UPDATE SHIPPING RATE
// ============================================
export const updateRate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      base_rate,
      free_shipping_threshold,
      country_code,
      min_weight_kg,
      max_weight_kg,
      estimated_days_min,
      estimated_days_max,
      is_default,
      is_active,
      sort_order
    } = req.body;
    
    // Check if rate exists
    const existingResult = await query(`SELECT * FROM shipping_rates WHERE id = $1`, [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shipping rate not found' });
    }
    
    // If setting as default, unset other defaults
    if (is_default && !existingResult.rows[0].is_default) {
      await query(`UPDATE shipping_rates SET is_default = false WHERE id != $1`, [id]);
    }
    
    const result = await query(`
      UPDATE shipping_rates SET
        name = $1,
        description = $2,
        base_rate = $3,
        free_shipping_threshold = $4,
        country_code = $5,
        min_weight_kg = $6,
        max_weight_kg = $7,
        estimated_days_min = $8,
        estimated_days_max = $9,
        is_default = $10,
        is_active = $11,
        sort_order = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      name,
      description,
      base_rate,
      free_shipping_threshold,
      country_code,
      min_weight_kg,
      max_weight_kg,
      estimated_days_min,
      estimated_days_max,
      is_default,
      is_active,
      sort_order,
      id
    ]);
    
    res.json({ rate: result.rows[0] });
  } catch (error) {
    console.error('Update shipping rate error:', error);
    res.status(500).json({ error: 'Failed to update shipping rate' });
  }
};

// ============================================
// DELETE SHIPPING RATE
// ============================================
export const deleteRate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`DELETE FROM shipping_rates WHERE id = $1`, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Shipping rate not found' });
    }
    
    res.json({ message: 'Shipping rate deleted successfully' });
  } catch (error) {
    console.error('Delete shipping rate error:', error);
    res.status(500).json({ error: 'Failed to delete shipping rate' });
  }
};

// ============================================
// CALCULATE SHIPPING
// ============================================
export const calculateShipping = async (req, res) => {
  try {
    const { cart_total, country_code, weight_kg } = req.body;
    
    if (!cart_total) {
      return res.status(400).json({ error: 'cart_total is required' });
    }
    
    // Build query for finding best shipping rate
    let queryText = `
      SELECT * FROM shipping_rates 
      WHERE is_active = true
    `;
    const params = [];
    let paramIndex = 1;
    
    // Filter by country if provided
    if (country_code) {
      queryText += ` AND (country_code = $${paramIndex} OR country_code IS NULL)`;
      params.push(country_code);
      paramIndex++;
    }
    
    // Filter by weight if provided
    if (weight_kg) {
      queryText += ` AND ((min_weight_kg IS NULL OR min_weight_kg <= $${paramIndex}) 
                      AND (max_weight_kg IS NULL OR max_weight_kg >= $${paramIndex + 1}))`;
      params.push(weight_kg, weight_kg);
      paramIndex += 2;
    }
    
    // Order by specificity (country-specific first, then default, then by price)
    queryText += ` ORDER BY 
      CASE WHEN country_code = $${paramIndex} THEN 0 ELSE 1 END,
      is_default DESC,
      base_rate ASC
      LIMIT 1
    `;
    params.push(country_code || '');
    
    const result = await query(queryText, params);
    
    // If no matching rate, try to get default
    if (result.rows.length === 0) {
      const defaultResult = await query(`
        SELECT * FROM shipping_rates 
        WHERE is_default = true 
        LIMIT 1
      `);
      
      if (defaultResult.rows.length === 0) {
        return res.status(404).json({ error: 'No shipping rate found' });
      }
      
      result.rows.push(defaultResult.rows[0]);
    }
    
    const rate = result.rows[0];
    let shipping_cost = parseFloat(rate.base_rate);
    const free_shipping_threshold = parseFloat(rate.free_shipping_threshold || 0);
    
    // Apply free shipping if threshold met
    if (free_shipping_threshold > 0 && parseFloat(cart_total) >= free_shipping_threshold) {
      shipping_cost = 0;
    }
    
    res.json({
      rate: {
        id: rate.id,
        name: rate.name,
        description: rate.description,
        estimated_days_min: rate.estimated_days_min,
        estimated_days_max: rate.estimated_days_max
      },
      base_rate: parseFloat(rate.base_rate),
      shipping_cost: shipping_cost,
      is_free_shipping: shipping_cost === 0,
      free_shipping_threshold: free_shipping_threshold,
      amount_to_free_shipping: Math.max(0, free_shipping_threshold - parseFloat(cart_total))
    });
  } catch (error) {
    console.error('Calculate shipping error:', error);
    res.status(500).json({ error: 'Failed to calculate shipping' });
  }
};

// ============================================
// GET DEFAULT RATE
// ============================================
export const getDefaultRate = async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM shipping_rates 
      WHERE is_default = true AND is_active = true 
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No default shipping rate found' });
    }
    
    res.json({ rate: result.rows[0] });
  } catch (error) {
    console.error('Get default rate error:', error);
    res.status(500).json({ error: 'Failed to fetch default rate' });
  }
};
