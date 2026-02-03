// server/src/controllers/product.controller.js
import pool from '../config/database.js';

// Get all products
export const getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = true
    `;
    
    const params = [];
    if (category) {
      query += ' AND p.category_id = $1';
      params.push(category);
    }
    
    query += ' ORDER BY p.order_index, p.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// Create product
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category_id,
      stock_quantity,
      sku,
      meta_title,
      meta_description,
      is_featured
    } = req.body;

    // Handle uploaded images
    const images = req.uploadedFiles || [];

    const result = await pool.query(`
      INSERT INTO products (
        name, description, price, category_id, stock_quantity, sku,
        images, image_url, meta_title, meta_description, is_featured, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      RETURNING *
    `, [
      name,
      description,
      price,
      category_id || null,
      stock_quantity || 0,
      sku || null,
      JSON.stringify(images),
      images[0] || null,
      meta_title || name,
      meta_description || description,
      is_featured || false
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      category_id,
      stock_quantity,
      sku,
      meta_title,
      meta_description,
      is_featured,
      active
    } = req.body;

    const checkResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existingProduct = checkResult.rows[0];
    let images = existingProduct.images || [];

    // Handle new uploaded images
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      images = [...images, ...req.uploadedFiles];
    }

    const result = await pool.query(`
      UPDATE products
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          category_id = $4,
          stock_quantity = COALESCE($5, stock_quantity),
          sku = COALESCE($6, sku),
          images = $7,
          image_url = $8,
          meta_title = COALESCE($9, meta_title),
          meta_description = COALESCE($10, meta_description),
          is_featured = COALESCE($11, is_featured),
          active = COALESCE($12, active),
          updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      name,
      description,
      price,
      category_id,
      stock_quantity,
      sku,
      JSON.stringify(images),
      images[0] || existingProduct.image_url,
      meta_title,
      meta_description,
      is_featured,
      active,
      id
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// Upload product images
export const uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.uploadedFiles || req.uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const productResult = await pool.query('SELECT images FROM products WHERE id = $1', [id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let existingImages = productResult.rows[0].images || [];
    const newImages = [...existingImages, ...req.uploadedFiles];

    const result = await pool.query(`
      UPDATE products
      SET images = $1, image_url = COALESCE(image_url, $2), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [JSON.stringify(newImages), req.uploadedFiles[0], id]);

    res.json({ images: newImages, product: result.rows[0] });
  } catch (error) {
    console.error('Upload product images error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
};

// Remove product image
export const removeProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    const productResult = await pool.query('SELECT images FROM products WHERE id = $1', [id]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let images = productResult.rows[0].images || [];
    images = images.filter(img => img !== imageUrl);

    const result = await pool.query(`
      UPDATE products
      SET images = $1, image_url = COALESCE($2, image_url), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [JSON.stringify(images), images[0] || null, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Remove image error:', error);
    res.status(500).json({ error: 'Failed to remove image' });
  }
};