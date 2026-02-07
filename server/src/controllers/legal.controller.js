// server/src/controllers/legal.controller.js
// GROUP 8 #41: Admin edits Privacy/Imprint/T&C
import { query } from '../config/database.js';

// Public: Get a legal page by key
export const getLegalPage = async (req, res) => {
  try {
    const { pageKey } = req.params;
    const result = await query(
      'SELECT page_key, title, content, title_en, content_en, updated_at FROM legal_pages WHERE page_key = $1 AND is_active = true',
      [pageKey]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Seite nicht gefunden' });
    }
    res.json({ page: result.rows[0] });
  } catch (error) {
    console.error('Get legal page error:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
};

// Admin: Get all legal pages
export const getAllLegalPages = async (req, res) => {
  try {
    const result = await query('SELECT * FROM legal_pages ORDER BY id');
    res.json({ pages: result.rows });
  } catch (error) {
    console.error('Get all legal pages error:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
};

// Admin: Update a legal page
export const updateLegalPage = async (req, res) => {
  try {
    const { pageKey } = req.params;
    const { title, content, title_en, content_en } = req.body;

    if (!content) return res.status(400).json({ error: 'Inhalt erforderlich' });

    const result = await query(`
      UPDATE legal_pages SET
        title = COALESCE($1, title), content = $2,
        title_en = $3, content_en = $4,
        last_updated_by = $5, updated_at = NOW()
      WHERE page_key = $6 RETURNING *
    `, [title, content, title_en || null, content_en || null, req.user?.id || null, pageKey]);

    if (result.rows.length === 0) {
      // Create if not exists
      const insertResult = await query(`
        INSERT INTO legal_pages (page_key, title, content, title_en, content_en, last_updated_by)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `, [pageKey, title || pageKey, content, title_en, content_en, req.user?.id]);
      return res.json({ page: insertResult.rows[0] });
    }

    res.json({ page: result.rows[0] });
  } catch (error) {
    console.error('Update legal page error:', error);
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
};

// Public: Get cookie consent settings
export const getCookieSettings = async (req, res) => {
  try {
    const enabled = await query("SELECT value FROM settings WHERE key = 'cookie_banner_enabled'");
    const text = await query("SELECT value FROM settings WHERE key = 'cookie_banner_text'");
    res.json({
      enabled: enabled.rows[0]?.value === 'true',
      text: text.rows[0]?.value || 'Diese Website verwendet Cookies.'
    });
  } catch (error) {
    res.json({ enabled: true, text: 'Diese Website verwendet Cookies.' });
  }
};

// Public: Save cookie consent
export const saveCookieConsent = async (req, res) => {
  try {
    const { visitorId, necessary, analytics, marketing, preferences } = req.body;
    await query(`
      INSERT INTO cookie_consents (visitor_id, necessary, analytics, marketing, preferences, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (visitor_id) DO UPDATE SET
        analytics = $3, marketing = $4, preferences = $5, updated_at = NOW()
    `, [
      visitorId || 'anonymous',
      necessary !== false,
      analytics === true,
      marketing === true,
      preferences === true,
      req.ip,
      req.headers['user-agent']
    ]);
    res.json({ message: 'Einstellungen gespeichert' });
  } catch (error) {
    console.error('Save cookie consent error:', error);
    res.json({ message: 'OK' });
  }
};
