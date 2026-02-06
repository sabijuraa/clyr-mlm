const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const slugify = require('slugify');

// MUST be before /:id to avoid matching "categories" as an ID
router.get('/categories/all', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM product_categories ORDER BY sort_order, name_de');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Public: List products
router.get('/', async (req, res) => {
  try {
    const { category, featured, limit = 50 } = req.query;
    let where = 'WHERE p.is_active = true';
    const params = [];
    if (category) { params.push(category); where += ` AND c.slug = $${params.length}`; }
    if (featured === 'true') { where += ' AND p.is_featured = true'; }
    params.push(parseInt(limit));
    const result = await db.query(`
      SELECT p.*, c.name_de as category_name, c.slug as category_slug,
        (SELECT json_agg(json_build_object('id', pi.id, 'url', pi.url, 'alt_text', pi.alt_text, 'is_primary', pi.is_primary)
         ORDER BY pi.is_primary DESC, pi.sort_order) FROM product_images pi WHERE pi.product_id = p.id) as images,
        (SELECT json_agg(json_build_object('id', pv.id, 'name', pv.name, 'sku', pv.sku, 'price_at', pv.price_at, 'price_de', pv.price_de, 'price_ch', pv.price_ch, 'image_url', pv.image_url)
         ORDER BY pv.sort_order) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) as variants
      FROM products p LEFT JOIN product_categories c ON p.category_id = c.id ${where}
      ORDER BY p.is_featured DESC, p.created_at DESC LIMIT $${params.length}`, params);
    res.json({ products: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Public: Product by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, c.name_de as category_name,
        (SELECT json_agg(json_build_object('id', pi.id, 'url', pi.url, 'alt_text', pi.alt_text, 'is_primary', pi.is_primary)
         ORDER BY pi.is_primary DESC, pi.sort_order) FROM product_images pi WHERE pi.product_id = p.id) as images,
        (SELECT json_agg(json_build_object('id', pv.id, 'name', pv.name, 'sku', pv.sku, 'price_at', pv.price_at, 'price_de', pv.price_de, 'price_ch', pv.price_ch, 'image_url', pv.image_url)
         ORDER BY pv.sort_order) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) as variants
      FROM products p LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE p.slug = $1 AND p.is_active = true`, [req.params.slug]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Produkt nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Product by ID
router.get('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, 
        (SELECT json_agg(json_build_object('id', pi.id, 'url', pi.url, 'alt_text', pi.alt_text, 'is_primary', pi.is_primary, 'sort_order', pi.sort_order)
         ORDER BY pi.sort_order) FROM product_images pi WHERE pi.product_id = p.id) as images,
        (SELECT json_agg(json_build_object('id', pv.id, 'name', pv.name, 'sku', pv.sku, 'price_at', pv.price_at, 'price_de', pv.price_de, 'price_ch', pv.price_ch, 'image_url', pv.image_url, 'is_active', pv.is_active)
         ORDER BY pv.sort_order) FROM product_variants pv WHERE pv.product_id = p.id) as variants
      FROM products p WHERE p.id = $1`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Produkt nicht gefunden' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Create product
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, sku, category_id, description_short, description_long, features, specifications,
      price_at, price_de, price_ch, weight_kg, dimensions, warranty_info, is_active, is_featured, has_variants, set_includes } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const result = await db.query(`
      INSERT INTO products (name, slug, sku, category_id, description_short, description_long, features, specifications,
        price_at, price_de, price_ch, weight_kg, dimensions, warranty_info, is_active, is_featured, has_variants, set_includes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [name, slug, sku, category_id || null, description_short, description_long,
       JSON.stringify(features || []), JSON.stringify(specifications || {}),
       price_at || 0, price_de || 0, price_ch || 0, weight_kg || null, dimensions,
       warranty_info, is_active !== false, is_featured || false, has_variants || false, JSON.stringify(set_includes || [])]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Update product
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, sku, category_id, description_short, description_long, features, specifications,
      price_at, price_de, price_ch, weight_kg, dimensions, warranty_info, is_active, is_featured, has_variants, set_includes } = req.body;
    const slug = name ? slugify(name, { lower: true, strict: true }) : undefined;
    const result = await db.query(`
      UPDATE products SET name=COALESCE($1,name), slug=COALESCE($2,slug), sku=COALESCE($3,sku),
        category_id=$4, description_short=COALESCE($5,description_short), description_long=COALESCE($6,description_long),
        features=$7, specifications=$8, price_at=COALESCE($9,price_at), price_de=COALESCE($10,price_de),
        price_ch=COALESCE($11,price_ch), weight_kg=$12, dimensions=COALESCE($13,dimensions),
        warranty_info=COALESCE($14,warranty_info), is_active=$15, is_featured=$16, has_variants=$17,
        set_includes=$18, updated_at=NOW()
      WHERE id=$19 RETURNING *`,
      [name, slug, sku, category_id || null, description_short, description_long,
       JSON.stringify(features || []), JSON.stringify(specifications || {}),
       price_at, price_de, price_ch, weight_kg || null, dimensions, warranty_info,
       is_active !== false, is_featured || false, has_variants || false, JSON.stringify(set_includes || []), req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Delete product
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('UPDATE products SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Produkt deaktiviert' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Upload images
router.post('/:id/images', authenticate, requireRole('admin'), upload.array('images', 10), async (req, res) => {
  try {
    const images = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const url = `/uploads/${file.filename}`;
      const existing = await db.query('SELECT COUNT(*) FROM product_images WHERE product_id = $1', [req.params.id]);
      const sortOrder = parseInt(existing.rows[0].count) + i;
      const result = await db.query(
        'INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [req.params.id, url, file.originalname, sortOrder, sortOrder === 0]
      );
      images.push(result.rows[0]);
    }
    res.status(201).json(images);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Delete image
router.delete('/images/:imageId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM product_images WHERE id = $1', [req.params.imageId]);
    res.json({ message: 'Bild gelöscht' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Create variant
router.post('/:id/variants', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, sku, price_at, price_de, price_ch, image_url } = req.body;
    const result = await db.query(
      `INSERT INTO product_variants (product_id, name, sku, price_at, price_de, price_ch, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, name, sku, price_at || 0, price_de || 0, price_ch || 0, image_url || null]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: Update variant
router.put('/variants/:variantId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, sku, price_at, price_de, price_ch, image_url, is_active } = req.body;
    const result = await db.query(
      `UPDATE product_variants SET name=COALESCE($1,name), sku=COALESCE($2,sku),
       price_at=COALESCE($3,price_at), price_de=COALESCE($4,price_de), price_ch=COALESCE($5,price_ch),
       image_url=COALESCE($6,image_url), is_active=COALESCE($7,is_active), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name, sku, price_at, price_de, price_ch, image_url, is_active, req.params.variantId]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
