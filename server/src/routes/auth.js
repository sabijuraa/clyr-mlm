const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuid } = require('uuid');
const { sendPartnerWelcome, sendPasswordReset } = require('../services/email');

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
}
function generateRefreshToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
}
function generateReferralCode(name) {
  return (name.substring(0, 4).toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase()).substring(0, 8);
}

// Register customer
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    if (!email || !password || !firstName || !lastName) return res.status(400).json({ error: 'Alle Pflichtfelder ausfüllen' });
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'E-Mail bereits registriert' });
    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role) VALUES ($1,$2,$3,$4,$5,'customer') RETURNING id, email, first_name, last_name, role`,
      [email.toLowerCase(), hash, firstName, lastName, phone || null]
    );
    const user = result.rows[0];
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')", [user.id, refreshToken]);
    res.status(201).json({ user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role }, token, refreshToken });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Register partner
router.post('/register/partner', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, sponsorCode, taxId, companyName, iban, bic, tcAccepted } = req.body;
    if (!email || !password || !firstName || !lastName) return res.status(400).json({ error: 'Alle Pflichtfelder ausfüllen' });
    if (!tcAccepted) return res.status(400).json({ error: 'AGB müssen akzeptiert werden' });

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'E-Mail bereits registriert' });

    let sponsorId = null;
    if (sponsorCode) {
      const sponsor = await db.query('SELECT id FROM partners WHERE referral_code = $1', [sponsorCode.toUpperCase()]);
      if (sponsor.rows.length) sponsorId = sponsor.rows[0].id;
    }

    const hash = await bcrypt.hash(password, 12);
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'partner') RETURNING id, email, first_name, last_name, role`,
      [email.toLowerCase(), hash, firstName, lastName, phone || null]
    );
    const user = userResult.rows[0];
    const referralCode = generateReferralCode(lastName);

    await db.query(
      `INSERT INTO partners (user_id, referral_code, sponsor_id, rank_id, tc_accepted, tc_accepted_at, tax_id, company_name, iban, bic)
       VALUES ($1, $2, $3, 1, $4, NOW(), $5, $6, $7, $8)`,
      [user.id, referralCode, sponsorId, tcAccepted, taxId || null, companyName || null, iban || null, bic || null]
    );

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')", [user.id, refreshToken]);

    // Send welcome email (non-blocking)
    sendPartnerWelcome(user, referralCode).catch(e => console.error('Partner welcome email failed:', e.message));

    res.status(201).json({ user: { ...user, firstName: user.first_name, lastName: user.last_name, referralCode }, token, refreshToken });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });

    const result = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')", [user.id, refreshToken]);

    let partner = null;
    if (user.role === 'partner' || user.role === 'admin') {
      const pResult = await db.query(
        `SELECT p.*, r.name_de as rank_name, r.commission_percent
         FROM partners p JOIN ranks r ON p.rank_id = r.id WHERE p.user_id = $1`, [user.id]
      );
      partner = pResult.rows[0] || null;
    }

    res.json({
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, phone: user.phone },
      partner, token, refreshToken
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token fehlt' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const stored = await db.query('SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()', [refreshToken]);
    if (!stored.rows[0]) return res.status(401).json({ error: 'Token ungültig' });
    // Rotate
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    const newToken = generateToken(decoded.userId);
    const newRefresh = generateRefreshToken(decoded.userId);
    await db.query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '7 days')", [decoded.userId, newRefresh]);
    res.json({ token: newToken, refreshToken: newRefresh });
  } catch (err) { res.status(401).json({ error: 'Token ungültig' }); }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    let partner = null;
    if (req.user.role === 'partner' || req.user.role === 'admin') {
      const pResult = await db.query(
        `SELECT p.*, r.name_de as rank_name, r.commission_percent
         FROM partners p JOIN ranks r ON p.rank_id = r.id WHERE p.user_id = $1`, [req.user.id]
      );
      partner = pResult.rows[0] || null;
    }
    const u = req.user;
    res.json({ user: { id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, phone: u.phone, role: u.role }, partner });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  res.json({ message: 'Abgemeldet' });
});

// Change password (logged in)
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!(await bcrypt.compare(currentPassword, user.rows[0].password_hash))) {
      return res.status(400).json({ error: 'Aktuelles Passwort falsch' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Passwort geändert' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update profile (logged in)
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const result = await db.query(
      'UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), phone = COALESCE($3, phone), updated_at = NOW() WHERE id = $4 RETURNING id, email, first_name, last_name, phone, role',
      [firstName, lastName, phone, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await db.query('SELECT id, email FROM users WHERE email = $1 AND is_active = true', [email?.toLowerCase()]);
    // Always return success to avoid email enumeration
    if (!user.rows[0]) return res.json({ message: 'Falls ein Konto existiert, wurde eine E-Mail gesendet.' });

    const token = crypto.randomBytes(32).toString('hex');
    await db.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
      [user.rows[0].id, token]
    );
    sendPasswordReset(user.rows[0].email, token).catch(e => console.error('Password reset email failed:', e.message));
    res.json({ message: 'Falls ein Konto existiert, wurde eine E-Mail gesendet.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token und neues Passwort erforderlich' });
    const stored = await db.query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used = false', [token]
    );
    if (!stored.rows[0]) return res.status(400).json({ error: 'Token ungültig oder abgelaufen' });
    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, stored.rows[0].user_id]);
    await db.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [stored.rows[0].id]);
    res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
