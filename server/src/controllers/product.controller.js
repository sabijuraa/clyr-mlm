// server/src/controllers/product.controller.js
import pool from '../config/database.js';

// ========================================
// PUBLIC FUNCTIONS
// ========================================

// Get all products
export const getAllProducts = async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    
    let queryText = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;
    
    const params = [];
    let paramIdx = 1;
    if (category) {
      queryText += ` AND c.slug = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }
    if (search) {
      queryText += ` AND (p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    
    switch (sort) {
      case 'price_asc': queryText += ' ORDER BY p.price ASC'; break;
      case 'price_desc': queryText += ' ORDER BY p.price DESC'; break;
      case 'newest': queryText += ' ORDER BY p.created_at DESC'; break;
      default: queryText += ' ORDER BY p.is_featured DESC, p.created_at DESC';
    }
    
    const result = await pool.query(queryText, params);
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
      WHERE p.is_active = true AND p.is_featured = true
      ORDER BY p.created_at DESC
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
      WHERE p.is_active = true
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
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
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
      WHERE p.is_active = true AND c.slug = $1
      ORDER BY p.is_featured DESC, p.created_at DESC
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
        COUNT(*) FILTER (WHERE is_active = true) as active_products,
        COUNT(*) FILTER (WHERE is_featured = true) as featured_products,
        SUM(stock) as total_stock,
        COUNT(*) FILTER (WHERE stock <= low_stock_threshold AND track_stock = true) as low_stock_count,
        ROUND(AVG(price)::numeric, 2) as average_price
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
      name, name_en, description, description_en, short_description,
      price, original_price, cost_price,
      category_id, stock, sku,
      product_type, is_featured, is_new, is_active,
      meta_title, meta_description
    } = req.body;

    // Helper: parse FormData booleans
    const parseBool = (val, fallback = false) => {
      if (val === true || val === 'true' || val === '1') return true;
      if (val === false || val === 'false' || val === '0') return false;
      return fallback;
    };

    const parseNum = (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    // Generate slug
    const slug = (name || 'product').toLowerCase()
      .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    // Handle uploaded images - from DO Spaces middleware or local uploads
    const images = [];
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      images.push(...req.uploadedFiles); // CDN URLs from Spaces
    } else if (req.files && req.files.length > 0) {
      req.files.forEach(f => images.push(`/uploads/products/${f.filename}`));
    }

    const result = await pool.query(`
      INSERT INTO products (
        name, name_en, slug, sku, description, description_en, short_description,
        price, original_price, cost_price,
        category_id, product_type, stock, images,
        is_active, is_new, is_featured,
        meta_title, meta_description
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `, [
      name, name_en || null, slug, sku || null,
      description || null, description_en || null, short_description || null,
      parseNum(price), parseNum(original_price), parseNum(cost_price),
      parseNum(category_id), product_type || 'physical', parseNum(stock) || 0, JSON.stringify(images),
      parseBool(is_active, true), parseBool(is_new, false), parseBool(is_featured, false),
      meta_title || name, meta_description || ''
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product', details: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, name_en, description, description_en, short_description,
      price, original_price, cost_price,
      category_id, stock, sku,
      product_type, is_featured, is_new, is_active,
      meta_title, meta_description
    } = req.body;

    const checkResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existing = checkResult.rows[0];

    // Helper: parse FormData booleans (come as strings "true"/"false")
    const parseBool = (val, fallback) => {
      if (val === true || val === 'true' || val === '1') return true;
      if (val === false || val === 'false' || val === '0') return false;
      return fallback;
    };

    // Helper: parse numbers, return null for empty
    const parseNum = (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };
    
    // Handle images: start with kept existing images, then append new uploads
    let images = [];
    
    // If existing_images was sent, use those (user removed some via UI)
    if (req.body.existing_images) {
      try {
        images = JSON.parse(req.body.existing_images);
      } catch (e) {
        images = existing.images || [];
      }
    } else {
      images = existing.images || [];
    }

    // Append new uploaded images
    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
      images.push(...req.uploadedFiles);
    } else if (req.files && req.files.length > 0) {
      req.files.forEach(f => images.push(`/uploads/products/${f.filename}`));
    }

    const result = await pool.query(`
      UPDATE products SET
        name = COALESCE($1, name),
        name_en = $2,
        description = COALESCE($3, description),
        description_en = $4,
        short_description = $5,
        price = COALESCE($6, price),
        original_price = $7,
        cost_price = $8,
        category_id = $9,
        stock = COALESCE($10, stock),
        sku = $11,
        product_type = COALESCE($12, product_type),
        is_featured = $13,
        is_new = $14,
        is_active = $15,
        images = $16,
        meta_title = COALESCE($17, meta_title),
        meta_description = COALESCE($18, meta_description),
        updated_at = NOW()
      WHERE id = $19
      RETURNING *
    `, [
      name || null,
      name_en || null,
      description || null,
      description_en || null,
      short_description || null,
      parseNum(price),
      parseNum(original_price),
      parseNum(cost_price),
      parseNum(category_id),
      parseNum(stock),
      sku || null,
      product_type || existing.product_type || 'physical',
      parseBool(is_featured, existing.is_featured),
      parseBool(is_new, existing.is_new),
      parseBool(is_active, existing.is_active),
      JSON.stringify(images),
      meta_title || null,
      meta_description || null,
      id
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product', details: error.message });
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
      SET is_active = NOT is_active, updated_at = NOW()
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
    const { stock } = req.body;

    const result = await pool.query(`
      UPDATE products
      SET stock = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [stock, id]);

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

    const newPaths = req.uploadedFiles || (req.files ? req.files.map(f => `/uploads/products/${f.filename}`) : []);
    if (newPaths.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const productResult = await pool.query('SELECT images FROM products WHERE id = $1', [id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existingImages = productResult.rows[0].images || [];
    const allImages = [...existingImages, ...newPaths];

    const result = await pool.query(`
      UPDATE products SET images = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(allImages), id]);

    res.json({ images: allImages, product: result.rows[0] });
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
      UPDATE products SET images = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(images), id]);

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
      UPDATE products SET images = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(images), id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

// ========================================
// ADMIN CATEGORY FUNCTIONS
// ========================================

// Get all categories (admin - including inactive)
export const getAllCategoriesAdmin = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all categories admin error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Create category
export const createCategory = async (req, res) => {
  try {
    const { name, name_en, description, description_en, sort_order, is_active } = req.body;
    
    const slug = (name || 'kategorie').toLowerCase()
      .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await pool.query(`
      INSERT INTO categories (name, name_en, slug, description, description_en, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, name_en || null, slug, description || null, description_en || null, sort_order || 0, is_active !== false]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_en, description, description_en, sort_order, is_active } = req.body;

    const result = await pool.query(`
      UPDATE categories SET
        name = COALESCE($1, name),
        name_en = $2,
        description = $3,
        description_en = $4,
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [name, name_en, description, description_en, sort_order, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};