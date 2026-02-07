// server/src/controllers/product.controller.js
import pool from '../config/database.js';

// ========================================
// PUBLIC FUNCTIONS
// ========================================

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

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = true AND p.is_featured = true
      ORDER BY p.order_index, p.created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
};

// Get new products
export const getNewProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.active = true
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get new products error:', error);
    res.status(500).json({ error: 'Failed to fetch new products' });
  }
};

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.active = true
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.active = true AND c.slug = $1
      ORDER BY p.order_index, p.created_at DESC
    `, [slug]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get product by slug
export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const result = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1
    `, [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// Get single product by ID
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

// Alias
export const getProductById = getProduct;

// ========================================
// ADMIN FUNCTIONS
// ========================================

// Get all products (including inactive) - Admin
export const getAllProductsAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all products admin error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get product statistics
export const getProductStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE active = true) as active_products,
        COUNT(*) FILTER (WHERE is_featured = true) as featured_products,
        SUM(stock_quantity) as total_stock,
        AVG(price) as average_price
      FROM products
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
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

// Toggle product active status
export const toggleProductActive = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE products
      SET active = NOT active, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle active error:', error);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
};

// Toggle product featured status
export const toggleProductFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE products
      SET is_featured = NOT is_featured, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({ error: 'Failed to toggle featured' });
  }
};

// Update product stock
export const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_quantity } = req.body;

    const result = await pool.query(`
      UPDATE products
      SET stock_quantity = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [stock_quantity, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
};

// Bulk update products
export const bulkUpdateProducts = async (req, res) => {
  try {
    const { product_ids, updates } = req.body;

    if (!product_ids || !Array.isArray(product_ids)) {
      return res.status(400).json({ error: 'Invalid product IDs' });
    }

    const updateFields = [];
    const values = [];
    let valueIndex = 1;

    Object.keys(updates).forEach(key => {
      updateFields.push(`${key} = $${valueIndex}`);
      values.push(updates[key]);
      valueIndex++;
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(product_ids);

    const result = await pool.query(`
      UPDATE products
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = ANY($${valueIndex})
      RETURNING *
    `, values);

    res.json({ updated: result.rows.length, products: result.rows });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to bulk update' });
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

// Upload single product image (legacy)
export const uploadProductImage = uploadProductImages;

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

// Delete product image by index (legacy)
export const deleteProductImage = async (req, res) => {
  try {
    const { id, imageIndex } = req.params;

    const productResult = await pool.query('SELECT images FROM products WHERE id = $1', [id]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let images = productResult.rows[0].images || [];
    const index = parseInt(imageIndex);
    
    if (index < 0 || index >= images.length) {
      return res.status(400).json({ error: 'Invalid image index' });
    }

    images.splice(index, 1);

    const result = await pool.query(`
      UPDATE products
      SET images = $1, image_url = COALESCE($2, image_url), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [JSON.stringify(images), images[0] || null, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};