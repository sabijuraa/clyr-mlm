// server/src/controllers/branding.controller.js
import pool from '../config/database.js';

// Get branding settings
export const getBranding = async (req, res) => {
  try {
    console.log('[BRANDING] GET /settings/branding called');
    let row;
    const result = await pool.query('SELECT * FROM branding WHERE id = 1');
    if (result.rows.length === 0) {
      const ins = await pool.query('INSERT INTO branding (id) VALUES (1) RETURNING *');
      row = ins.rows[0];
    } else {
      row = result.rows[0];
    }
    // Return flat fields for BrandingPage + nested shape for BrandContext
    res.json({
      ...row,
      // BrandContext nested shape
      colors: {
        primary: row.primary_color || '#0ea5e9',
        primaryHover: row.primary_color ? row.primary_color + 'cc' : '#0284c7',
        primaryLight: '#e0f2fe',
        secondary: row.secondary_color || '#171717',
        secondaryHover: row.secondary_color || '#262626',
      },
      logo: row.logo_light_url || null,
      social: {
        facebook: row.facebook_url || '',
        instagram: row.instagram_url || '',
        linkedin: row.linkedin_url || '',
        twitter: row.twitter_url || '',
      },
    });
  } catch (error) {
    console.error('Get branding error:', error);
    res.status(500).json({ error: 'Failed to fetch branding settings' });
  }
};

// Update branding settings
export const updateBranding = async (req, res) => {
  try {
    console.log('[BRANDING] PUT /settings/branding called by user:', req.user?.id, req.user?.email);
    console.log('[BRANDING] Request body:', JSON.stringify(req.body));
    const { primary_color, secondary_color, accent_color, font_heading, font_body,
            facebook_url, instagram_url, linkedin_url, twitter_url,
            logo_light_url } = req.body;
    console.log('[BRANDING] Saving: primary=', primary_color, 'secondary=', secondary_color, 'logo=', logo_light_url);

    const result = await pool.query(`
      INSERT INTO branding (id, primary_color, secondary_color, accent_color, font_heading, font_body,
        facebook_url, instagram_url, linkedin_url, twitter_url, logo_light_url, updated_at)
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (id) DO UPDATE SET
        primary_color   = COALESCE(EXCLUDED.primary_color,   branding.primary_color),
        secondary_color = COALESCE(EXCLUDED.secondary_color, branding.secondary_color),
        accent_color    = COALESCE(EXCLUDED.accent_color,    branding.accent_color),
        font_heading    = COALESCE(EXCLUDED.font_heading,    branding.font_heading),
        font_body       = COALESCE(EXCLUDED.font_body,       branding.font_body),
        facebook_url    = EXCLUDED.facebook_url,
        instagram_url   = EXCLUDED.instagram_url,
        linkedin_url    = EXCLUDED.linkedin_url,
        twitter_url     = EXCLUDED.twitter_url,
        logo_light_url  = COALESCE(EXCLUDED.logo_light_url, branding.logo_light_url),
        updated_at      = NOW()
      RETURNING *
    `, [primary_color, secondary_color, accent_color, font_heading, font_body,
        facebook_url, instagram_url, linkedin_url, twitter_url, logo_light_url || null]);

    const row = result.rows[0];
    console.log('[BRANDING] Saved successfully. primary_color=', row.primary_color);
    res.json({
      ...row,
      colors: {
        primary: row.primary_color || '#0ea5e9',
        primaryHover: row.primary_color ? row.primary_color + 'cc' : '#0284c7',
        primaryLight: '#e0f2fe',
        secondary: row.secondary_color || '#171717',
        secondaryHover: row.secondary_color || '#262626',
      },
      logo: row.logo_light_url || null,
      social: {
        facebook: row.facebook_url || '',
        instagram: row.instagram_url || '',
        linkedin: row.linkedin_url || '',
        twitter: row.twitter_url || '',
      },
    });
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

// Upload brochure (PDF)
export const uploadBrochure = async (req, res) => {
  try {
    const url = req.uploadedFile || req.file?.path;
    if (!url) return res.status(400).json({ error: 'No file uploaded' });

    await pool.query(
      `UPDATE branding SET brochure_url = $1, updated_at = NOW() WHERE id = 1`,
      [url]
    );

    res.json({ url, message: 'Broschüre hochgeladen' });
  } catch (error) {
    console.error('Upload brochure error:', error);
    res.status(500).json({ error: 'Failed to upload brochure' });
  }
};
