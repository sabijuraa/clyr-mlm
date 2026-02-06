const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/subscribe', async (req, res) => {
  try {
    const { email, firstName } = req.body;
    if (!email) return res.status(400).json({ error: 'E-Mail erforderlich' });
    await db.query(`INSERT INTO newsletter_subscribers (email, first_name) VALUES ($1, $2)
      ON CONFLICT (email) DO UPDATE SET is_active = true, unsubscribed_at = NULL`, [email.toLowerCase(), firstName]);
    res.json({ message: 'Erfolgreich angemeldet' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/unsubscribe', async (req, res) => {
  try {
    await db.query('UPDATE newsletter_subscribers SET is_active = false, unsubscribed_at = NOW() WHERE email = $1', [req.body.email?.toLowerCase()]);
    res.json({ message: 'Erfolgreich abgemeldet' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/subscribers', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM newsletter_subscribers WHERE is_active = true ORDER BY subscribed_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
