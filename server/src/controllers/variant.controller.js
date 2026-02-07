import { query } from '../config/database.js';

/**
 * Product Variants Controller
 * Manages product options like different faucet types
 */

// ============================================
// GET VARIANTS FOR PRODUCT
// ============================================
export const getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const result = await query(`
      SELECT * FROM product_variants 
      WHERE product_id = $1 AND is_active = true
      ORDER BY sort_order, name
    `, [productId]);
    
    res.json({ variants: result.rows });
  } catch (error) {
    console.error('Get variants error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Varianten' });
  }
};

// ============================================
// GET ALL VARIANT OPTIONS
// ============================================
export const getVariantOptions = async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM variant_options 
      WHERE is_active = true
      ORDER BY type, sort_order, name
    `);
    
    // Group by type
    const grouped = result.rows.reduce((acc, opt) => {
      if (!acc[opt.type]) acc[opt.type] = [];
      acc[opt.type].push(opt);
      return acc;
    }, {});
    
    res.json({ options: grouped, all: result.rows });
  } catch (error) {
    console.error('Get options error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Optionen' });
  }
};

// ============================================
// CREATE VARIANT OPTION
// ============================================
export const createVariantOption = async (req, res) => {
  try {
    const {
      type,
      name,
      name_en,
      description,
      price_modifier,
      image_url,
      sort_order
    } = req.body;
    
    const result = await query(`
      INSERT INTO variant_options (type, name, name_en, description, price_modifier, image_url, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [type, name, name_en, description, price_modifier || 0, image_url, sort_order || 0]);
    
    res.status(201).json({ option: result.rows[0] });
  } catch (error) {
    console.error('Create option error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
};

// ============================================
// UPDATE VARIANT OPTION
// ============================================
export const updateVariantOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_en, description, price_modifier, image_url, sort_order, is_active } = req.body;
    
    const result = await query(`
      UPDATE variant_options SET
        name = COALESCE($1, name),
        name_en = COALESCE($2, name_en),
        description = COALESCE($3, description),
        price_modifier = COALESCE($4, price_modifier),
        image_url = COALESCE($5, image_url),
        sort_order = COALESCE($6, sort_order),
        is_active = COALESCE($7, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, name_en, description, price_modifier, image_url, sort_order, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Option nicht gefunden' });
    }
    
    res.json({ option: result.rows[0] });
  } catch (error) {
    console.error('Update option error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
};

// ============================================
// ASSIGN VARIANT TO PRODUCT
// ============================================
export const assignVariantToProduct = async (req, res) => {
  try {
    const { productId, optionId, priceModifier, stockModifier, isDefault } = req.body;
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await query(`
        UPDATE product_variants 
        SET is_default = false 
        WHERE product_id = $1
      `, [productId]);
    }
    
    const result = await query(`
      INSERT INTO product_variants (product_id, option_id, price_modifier, stock_modifier, is_default)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (product_id, option_id) DO UPDATE SET
        price_modifier = EXCLUDED.price_modifier,
        stock_modifier = EXCLUDED.stock_modifier,
        is_default = EXCLUDED.is_default
      RETURNING *
    `, [productId, optionId, priceModifier || 0, stockModifier || 0, isDefault || false]);
    
    res.json({ variant: result.rows[0] });
  } catch (error) {
    console.error('Assign variant error:', error);
    res.status(500).json({ error: 'Fehler beim Zuweisen' });
  }
};

// ============================================
// REMOVE VARIANT FROM PRODUCT
// ============================================
export const removeVariantFromProduct = async (req, res) => {
  try {
    const { productId, optionId } = req.params;
    
    await query(`
      DELETE FROM product_variants 
      WHERE product_id = $1 AND option_id = $2
    `, [productId, optionId]);
    
    res.json({ message: 'Variante entfernt' });
  } catch (error) {
    console.error('Remove variant error:', error);
    res.status(500).json({ error: 'Fehler beim Entfernen' });
  }
};

// ============================================
// GET PRODUCT WITH VARIANTS (PUBLIC)
// ============================================
export const getProductWithVariants = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get product
    const productResult = await query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = $1 AND p.is_active = true
    `, [slug]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produkt nicht gefunden' });
    }
    
    const product = productResult.rows[0];
    
    // Get variants
    const variantsResult = await query(`
      SELECT pv.*, vo.type, vo.name, vo.name_en, vo.description, vo.image_url as option_image
      FROM product_variants pv
      JOIN variant_options vo ON pv.option_id = vo.id
      WHERE pv.product_id = $1 AND pv.is_active = true AND vo.is_active = true
      ORDER BY vo.type, pv.sort_order, vo.name
    `, [product.id]);
    
    // Group variants by type
    const variants = variantsResult.rows.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push({
        id: v.option_id,
        name: v.name,
        name_en: v.name_en,
        description: v.description,
        image: v.option_image,
        priceModifier: parseFloat(v.price_modifier) || 0,
        isDefault: v.is_default
      });
      return acc;
    }, {});
    
    res.json({ 
      product: {
        ...product,
        images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
        features: typeof product.features === 'string' ? JSON.parse(product.features) : product.features,
        variants
      }
    });
  } catch (error) {
    console.error('Get product with variants error:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
};
