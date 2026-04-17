import { query } from '../config/database.js';

/**
 * CMS Controller
 * Manages editable content for homepage, shop, and other pages
 */

// ============================================
// GET ALL CONTENT SECTIONS
// ============================================
export const getAllContent = async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM cms_content 
      ORDER BY section, sort_order
    `);
    
    // Group by section
    const grouped = result.rows.reduce((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    }, {});
    
    res.json({ content: grouped, items: result.rows });
  } catch (error) {
    console.error('Get CMS content error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Inhalte' });
  }
};

// ============================================
// GET CONTENT BY SECTION
// ============================================
export const getContentBySection = async (req, res) => {
  try {
    const { section } = req.params;
    
    const result = await query(`
      SELECT * FROM cms_content 
      WHERE section = $1 AND is_active = true
      ORDER BY sort_order
    `, [section]);
    
    res.json({ content: result.rows });
  } catch (error) {
    console.error('Get section content error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Sektion' });
  }
};

// ============================================
// GET SINGLE CONTENT ITEM
// ============================================
export const getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT * FROM cms_content WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inhalt nicht gefunden' });
    }
    
    res.json({ content: result.rows[0] });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
};

// ============================================
// CREATE CONTENT
// ============================================
export const createContent = async (req, res) => {
  try {
    const {
      section,
      key,
      title,
      title_en,
      subtitle,
      subtitle_en,
      content,
      content_en,
      image_url,
      link_url,
      link_text,
      link_text_en,
      metadata,
      sort_order
    } = req.body;
    
    const result = await query(`
      INSERT INTO cms_content (
        section, key, title, title_en, subtitle, subtitle_en,
        content, content_en, image_url, link_url, link_text, link_text_en,
        metadata, sort_order, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      section, key, title, title_en, subtitle, subtitle_en,
      content, content_en, image_url, link_url, link_text, link_text_en,
      JSON.stringify(metadata || {}), sort_order || 0, req.user.id
    ]);
    
    res.status(201).json({ content: result.rows[0] });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen' });
  }
};

// ============================================
// UPDATE CONTENT
// ============================================
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      title_en,
      subtitle,
      subtitle_en,
      content,
      content_en,
      image_url,
      link_url,
      link_text,
      link_text_en,
      metadata,
      sort_order,
      is_active
    } = req.body;
    
    const result = await query(`
      UPDATE cms_content SET
        title = COALESCE($1, title),
        title_en = COALESCE($2, title_en),
        subtitle = COALESCE($3, subtitle),
        subtitle_en = COALESCE($4, subtitle_en),
        content = COALESCE($5, content),
        content_en = COALESCE($6, content_en),
        image_url = COALESCE($7, image_url),
        link_url = COALESCE($8, link_url),
        link_text = COALESCE($9, link_text),
        link_text_en = COALESCE($10, link_text_en),
        metadata = COALESCE($11, metadata),
        sort_order = COALESCE($12, sort_order),
        is_active = COALESCE($13, is_active),
        updated_by = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
    `, [
      title, title_en, subtitle, subtitle_en, content, content_en,
      image_url, link_url, link_text, link_text_en,
      metadata ? JSON.stringify(metadata) : null,
      sort_order, is_active, req.user.id, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inhalt nicht gefunden' });
    }
    
    res.json({ content: result.rows[0] });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
};

// ============================================
// DELETE CONTENT
// ============================================
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM cms_content WHERE id = $1', [id]);
    
    res.json({ message: 'Inhalt gelöscht' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
};

// ============================================
// BULK UPDATE CONTENT
// ============================================
export const bulkUpdateContent = async (req, res) => {
  try {
    const { items } = req.body;
    
    for (const item of items) {
      await query(`
        UPDATE cms_content SET
          title = COALESCE($1, title),
          title_en = COALESCE($2, title_en),
          content = COALESCE($3, content),
          content_en = COALESCE($4, content_en),
          image_url = COALESCE($5, image_url),
          sort_order = COALESCE($6, sort_order),
          is_active = COALESCE($7, is_active),
          updated_by = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
      `, [
        item.title, item.title_en, item.content, item.content_en,
        item.image_url, item.sort_order, item.is_active, req.user.id, item.id
      ]);
    }
    
    res.json({ message: 'Inhalte aktualisiert', count: items.length });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
};

// ============================================
// GET HOMEPAGE CONTENT (PUBLIC)
// ============================================
export const getHomepageContent = async (req, res) => {
  try {
    const sections = ['hero', 'features', 'products', 'testimonials', 'stats', 'cta'];
    
    const result = await query(`
      SELECT * FROM cms_content 
      WHERE section = ANY($1) AND is_active = true
      ORDER BY section, sort_order
    `, [sections]);
    
    const content = {};
    for (const section of sections) {
      content[section] = result.rows.filter(r => r.section === section);
    }
    
    res.json({ content });
  } catch (error) {
    console.error('Get homepage error:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
};

// ============================================
// UPLOAD IMAGE
// ============================================
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
    
    const imageUrl = `/uploads/cms/${req.file.filename}`;
    
    res.json({ 
      url: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Fehler beim Hochladen' });
  }
};
