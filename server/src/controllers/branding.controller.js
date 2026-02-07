// server/src/controllers/branding.controller.js
import pool from '../config/database.js';

// Get branding settings
export const getBranding = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM branding WHERE id = 1');
    
    if (result.rows.length === 0) {
      const insertResult = await pool.query('INSERT INTO branding (id) VALUES (1) RETURNING *');
      return res.json(insertResult.rows[0]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get branding error:', error);
    res.status(500).json({ error: 'Failed to fetch branding settings' });
  }
};

// Update branding settings
export const updateBranding = async (req, res) => {
  try {
    const { primary_color, secondary_color, accent_color, font_heading, font_body, facebook_url, instagram_url, linkedin_url, twitter_url } = req.body;

    const result = await pool.query(`
      UPDATE branding
      SET primary_color = COALESCE($1, primary_color),
          secondary_color = COALESCE($2, secondary_color),
          accent_color = COALESCE($3, accent_color),
          font_heading = COALESCE($4, font_heading),
          font_body = COALESCE($5, font_body),
          facebook_url = $6,
          instagram_url = $7,
          linkedin_url = $8,
          twitter_url = $9,
          updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `, [primary_color, secondary_color, accent_color, font_heading, font_body, facebook_url, instagram_url, linkedin_url, twitter_url]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update branding error:', error);
    res.status(500).json({ error: 'Failed to update branding settings' });
  }
};

// Upload logo (light)
export const uploadLogoLight = async (req, res) => {
  try {
    if (!req.uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await pool.query(`
      UPDATE branding SET logo_light_url = $1, updated_at = NOW() WHERE id = 1 RETURNING *
    `, [req.uploadedFile]);

    res.json({ logo_url: req.uploadedFile, branding: result.rows[0] });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
};

// Upload logo (dark)
export const uploadLogoDark = async (req, res) => {
  try {
    if (!req.uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await pool.query(`
      UPDATE branding SET logo_dark_url = $1, updated_at = NOW() WHERE id = 1 RETURNING *
    `, [req.uploadedFile]);

    res.json({ logo_url: req.uploadedFile, branding: result.rows[0] });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
};

// Upload favicon
export const uploadFavicon = async (req, res) => {
  try {
    if (!req.uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await pool.query(`
      UPDATE branding SET favicon_url = $1, updated_at = NOW() WHERE id = 1 RETURNING *
    `, [req.uploadedFile]);

    res.json({ favicon_url: req.uploadedFile, branding: result.rows[0] });
  } catch (error) {
    console.error('Upload favicon error:', error);
    res.status(500).json({ error: 'Failed to upload favicon' });
  }
};