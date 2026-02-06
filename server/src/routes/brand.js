const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT key, value, type FROM brand_config');
    const config = {};
    result.rows.forEach(r => { config[r.key] = r.type === 'json' ? JSON.parse(r.value) : r.type === 'boolean' ? r.value === 'true' : r.value; });
    res.json(config);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await db.query(`INSERT INTO brand_config (key, value, updated_at) VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`, [key, val]);
    }
    res.json({ message: 'Konfiguration aktualisiert' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
