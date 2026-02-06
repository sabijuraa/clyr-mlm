const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token fehlt' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query(
      'SELECT id, email, first_name, last_name, phone, role, is_active FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    if (!result.rows[0]) return res.status(401).json({ error: 'Benutzer nicht gefunden' });
    req.user = result.rows[0];

    // Attach partner data if user is partner/admin
    if (req.user.role === 'partner' || req.user.role === 'admin') {
      const pResult = await db.query(
        `SELECT p.*, r.name_de as rank_name, r.commission_percent
         FROM partners p JOIN ranks r ON p.rank_id = r.id WHERE p.user_id = $1`,
        [req.user.id]
      );
      if (pResult.rows[0]) req.partner = pResult.rows[0];
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token abgelaufen' });
    return res.status(401).json({ error: 'Ungültiges Token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Nicht authentifiziert' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Keine Berechtigung' });
  }
  next();
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await db.query(
        'SELECT id, email, first_name, last_name, phone, role, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (result.rows[0]) req.user = result.rows[0];
    }
  } catch (e) {}
  next();
};

module.exports = { authenticate, requireRole, optionalAuth };
