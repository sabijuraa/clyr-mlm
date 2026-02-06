const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get page content (public)
router.get('/pages/:slug', async (req, res) => {
  try {
    const page = await db.query('SELECT * FROM cms_pages WHERE slug = $1 AND is_published = true', [req.params.slug]);
    const sections = await db.query('SELECT * FROM cms_sections WHERE page_slug = $1 AND is_active = true ORDER BY sort_order', [req.params.slug]);
    res.json({ page: page.rows[0] || null, sections: sections.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all sections for a page (admin)
router.get('/sections/:pageSlug', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM cms_sections WHERE page_slug = $1 ORDER BY sort_order', [req.params.pageSlug]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update section (admin - WYSIWYG CMS)
router.put('/sections/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { title, subtitle, content, imageUrl, buttonText, buttonUrl, sortOrder, isActive, settings } = req.body;
    const result = await db.query(`
      UPDATE cms_sections SET title=COALESCE($1,title), subtitle=COALESCE($2,subtitle), content=COALESCE($3,content),
        image_url=COALESCE($4,image_url), button_text=COALESCE($5,button_text), button_url=COALESCE($6,button_url),
        sort_order=COALESCE($7,sort_order), is_active=COALESCE($8,is_active), settings=COALESCE($9,settings),
        updated_at=NOW() WHERE id=$10 RETURNING *`,
      [title, subtitle, content, imageUrl, buttonText, buttonUrl, sortOrder, isActive, settings ? JSON.stringify(settings) : null, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create section (admin)
router.post('/sections', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { pageSlug, sectionKey, title, subtitle, content, imageUrl, buttonText, buttonUrl, sortOrder } = req.body;
    const result = await db.query(`
      INSERT INTO cms_sections (page_slug, section_key, title, subtitle, content, image_url, button_text, button_url, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [pageSlug, sectionKey, title, subtitle, content, imageUrl, buttonText, buttonUrl, sortOrder || 0]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete section (admin)
router.delete('/sections/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM cms_sections WHERE id = $1', [req.params.id]);
    res.json({ message: 'Sektion gelöscht' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update/create page (admin)
router.put('/pages/:slug', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { title, content, metaTitle, metaDescription, isPublished } = req.body;
    const existing = await db.query('SELECT id FROM cms_pages WHERE slug = $1', [req.params.slug]);
    let result;
    if (existing.rows.length) {
      result = await db.query(`
        UPDATE cms_pages SET title=COALESCE($1,title), content=COALESCE($2,content), meta_title=COALESCE($3,meta_title),
          meta_description=COALESCE($4,meta_description), is_published=COALESCE($5,is_published), updated_by=$6, updated_at=NOW()
        WHERE slug=$7 RETURNING *`, [title, content, metaTitle, metaDescription, isPublished, req.user.id, req.params.slug]);
    } else {
      result = await db.query(`
        INSERT INTO cms_pages (slug, title, content, meta_title, meta_description, is_published, updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.params.slug, title || req.params.slug, content, metaTitle, metaDescription, isPublished !== false, req.user.id]);
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload CMS image
router.post('/upload', authenticate, requireRole('admin'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// FAQ CRUD
router.get('/faq', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM cms_faq WHERE is_active = true ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/faq', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { question, answer, category, sortOrder } = req.body;
    const result = await db.query('INSERT INTO cms_faq (question, answer, category, sort_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [question, answer, category, sortOrder || 0]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/faq/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { question, answer, category, sortOrder, isActive } = req.body;
    const result = await db.query(`
      UPDATE cms_faq SET question=COALESCE($1,question), answer=COALESCE($2,answer), category=COALESCE($3,category),
        sort_order=COALESCE($4,sort_order), is_active=COALESCE($5,is_active) WHERE id=$6 RETURNING *`,
      [question, answer, category, sortOrder, isActive, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/faq/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM cms_faq WHERE id = $1', [req.params.id]);
    res.json({ message: 'FAQ gelöscht' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
