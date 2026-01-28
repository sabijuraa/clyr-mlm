import slugify from 'slugify';
import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';

/**
 * Get all products with filtering and pagination
 */
export const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    category,
    search,
    minPrice,
    maxPrice,
    sort = 'featured',
    inStock
  } = req.query;

  const offset = (page - 1) * limit;
  const params = [];
  let paramIndex = 1;

  let whereClause = 'WHERE p.is_active = true';

  if (category) {
    whereClause += ` AND c.slug = $${paramIndex}`;
    params.push(category);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (minPrice) {
    whereClause += ` AND p.price >= $${paramIndex}`;
    params.push(parseFloat(minPrice));
    paramIndex++;
  }

  if (maxPrice) {
    whereClause += ` AND p.price <= $${paramIndex}`;
    params.push(parseFloat(maxPrice));
    paramIndex++;
  }

  if (inStock === 'true') {
    whereClause += ' AND p.stock > 0';
  }

  let orderClause;
  switch (sort) {
    case 'price_asc':
      orderClause = 'ORDER BY p.price ASC';
      break;
    case 'price_desc':
      orderClause = 'ORDER BY p.price DESC';
      break;
    case 'name_asc':
      orderClause = 'ORDER BY p.name ASC';
      break;
    case 'newest':
      orderClause = 'ORDER BY p.created_at DESC';
      break;
    default:
      orderClause = 'ORDER BY p.is_featured DESC, p.is_new DESC, p.created_at DESC';
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const productsResult = await query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ${whereClause}
     ${orderClause}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    products: productsResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * Get featured products
 */
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const { limit = 4 } = req.query;

  const result = await query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.is_active = true AND p.is_featured = true
     ORDER BY p.created_at DESC
     LIMIT $1`,
    [parseInt(limit)]
  );

  res.json({ products: result.rows });
});

/**
 * Get all categories
 */
export const getCategories = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.*, COUNT(p.id) as product_count
     FROM categories c
     LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
     GROUP BY c.id
     ORDER BY c.sort_order ASC`
  );

  res.json({ categories: result.rows });
});

/**
 * Get products by category slug
 */
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;

  const categoryResult = await query('SELECT * FROM categories WHERE slug = $1', [slug]);
  
  if (categoryResult.rows.length === 0) {
    throw new AppError('Kategorie nicht gefunden', 404);
  }

  const category = categoryResult.rows[0];

  const countResult = await query(
    'SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = true',
    [category.id]
  );
  const total = parseInt(countResult.rows[0].count);

  const productsResult = await query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.category_id = $1 AND p.is_active = true
     ORDER BY p.is_featured DESC, p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [category.id, parseInt(limit), offset]
  );

  res.json({
    category,
    products: productsResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * Get single product by slug
 */
export const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const result = await query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.slug = $1`,
    [slug]
  );

  if (result.rows.length === 0) {
    throw new AppError('Produkt nicht gefunden', 404);
  }

  const product = result.rows[0];

  // Get related products from same category
  const relatedResult = await query(
    `SELECT p.*, c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.category_id = $1 AND p.id != $2 AND p.is_active = true
     ORDER BY RANDOM()
     LIMIT 4`,
    [product.category_id, product.id]
  );

  res.json({
    product,
    relatedProducts: relatedResult.rows
  });
});

/**
 * Create product (Admin)
 */
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    shortDescription,
    price,
    originalPrice,
    costPrice,
    categoryId,
    stock = 0,
    features,
    specifications,
    isNew = false,
    isFeatured = false,
    isLargeItem = false,
    metaTitle,
    metaDescription
  } = req.body;

  const slug = slugify(name, { lower: true, strict: true, locale: 'de' });

  // Check if slug exists
  const existingProduct = await query('SELECT id FROM products WHERE slug = $1', [slug]);
  if (existingProduct.rows.length > 0) {
    throw new AppError('Ein Produkt mit diesem Namen existiert bereits', 409);
  }

  // Handle uploaded images
  const images = req.files?.map(file => `/uploads/products/${file.filename}`) || [];

  const result = await query(
    `INSERT INTO products (
      name, slug, description, short_description, price, original_price, cost_price,
      category_id, stock, images, features, specifications,
      is_new, is_featured, is_large_item, meta_title, meta_description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *`,
    [
      name,
      slug,
      description,
      shortDescription,
      price,
      originalPrice || null,
      costPrice || null,
      categoryId || null,
      stock,
      JSON.stringify(images),
      JSON.stringify(features || []),
      JSON.stringify(specifications || {}),
      isNew,
      isFeatured,
      isLargeItem,
      metaTitle || name,
      metaDescription || shortDescription
    ]
  );

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user.id, 'product_created', 'product', result.rows[0].id, JSON.stringify({ name, price })]
  );

  res.status(201).json({
    message: 'Produkt erstellt',
    product: result.rows[0]
  });
});

/**
 * Update product (Admin)
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    shortDescription,
    price,
    originalPrice,
    costPrice,
    categoryId,
    stock,
    features,
    specifications,
    isActive,
    isNew,
    isFeatured,
    isLargeItem,
    existingImages
  } = req.body;

  // Check product exists
  const existingProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
  if (existingProduct.rows.length === 0) {
    throw new AppError('Produkt nicht gefunden', 404);
  }

  // Generate new slug if name changed
  let slug = existingProduct.rows[0].slug;
  if (name && name !== existingProduct.rows[0].name) {
    slug = slugify(name, { lower: true, strict: true, locale: 'de' });
    
    // Check if new slug exists
    const slugCheck = await query('SELECT id FROM products WHERE slug = $1 AND id != $2', [slug, id]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }
  }

  // Handle images - combine existing with new uploads
  let images = existingImages ? JSON.parse(existingImages) : existingProduct.rows[0].images;
  if (req.files?.length > 0) {
    const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
    images = [...images, ...newImages];
  }

  const result = await query(
    `UPDATE products SET
      name = COALESCE($1, name),
      slug = $2,
      description = COALESCE($3, description),
      short_description = COALESCE($4, short_description),
      price = COALESCE($5, price),
      original_price = $6,
      cost_price = $7,
      category_id = $8,
      stock = COALESCE($9, stock),
      images = $10,
      features = COALESCE($11, features),
      specifications = COALESCE($12, specifications),
      is_active = COALESCE($13, is_active),
      is_new = COALESCE($14, is_new),
      is_featured = COALESCE($15, is_featured),
      is_large_item = COALESCE($16, is_large_item),
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $17
     RETURNING *`,
    [
      name,
      slug,
      description,
      shortDescription,
      price,
      originalPrice || null,
      costPrice || null,
      categoryId || null,
      stock,
      JSON.stringify(images),
      features ? JSON.stringify(features) : null,
      specifications ? JSON.stringify(specifications) : null,
      isActive,
      isNew,
      isFeatured,
      isLargeItem,
      id
    ]
  );

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user.id, 'product_updated', 'product', id, JSON.stringify({ name: result.rows[0].name })]
  );

  res.json({
    message: 'Produkt aktualisiert',
    product: result.rows[0]
  });
});

/**
 * Delete product (Admin)
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingProduct = await query('SELECT * FROM products WHERE id = $1', [id]);
  if (existingProduct.rows.length === 0) {
    throw new AppError('Produkt nicht gefunden', 404);
  }

  // Soft delete - just deactivate
  await query('UPDATE products SET is_active = false WHERE id = $1', [id]);

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user.id, 'product_deleted', 'product', id, JSON.stringify({ name: existingProduct.rows[0].name })]
  );

  res.json({ message: 'Produkt gelöscht' });
});

/**
 * Update stock (Admin)
 */
export const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stock, adjustment } = req.body;

  const existingProduct = await query('SELECT stock FROM products WHERE id = $1', [id]);
  if (existingProduct.rows.length === 0) {
    throw new AppError('Produkt nicht gefunden', 404);
  }

  let newStock;
  if (stock !== undefined) {
    newStock = parseInt(stock);
  } else if (adjustment !== undefined) {
    newStock = existingProduct.rows[0].stock + parseInt(adjustment);
  } else {
    throw new AppError('Stock oder Adjustment erforderlich', 400);
  }

  if (newStock < 0) {
    throw new AppError('Bestand kann nicht negativ sein', 400);
  }

  const result = await query(
    'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, stock',
    [newStock, id]
  );

  res.json({
    message: 'Bestand aktualisiert',
    product: result.rows[0]
  });
});