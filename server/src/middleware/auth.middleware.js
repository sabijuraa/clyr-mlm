import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Nicht autorisiert',
        message: 'Kein Token vorhanden' 
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await query(
      `SELECT u.*, r.name as rank_name, r.commission_rate, r.color as rank_color
       FROM users u
       LEFT JOIN ranks r ON u.rank_id = r.id
       WHERE u.id = $1 AND u.status != 'suspended'`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Nicht autorisiert',
        message: 'Benutzer nicht gefunden' 
      });
    }

    // Attach user to request (without password)
    const user = result.rows[0];
    delete user.password_hash;
    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token abgelaufen',
        message: 'Bitte erneut anmelden' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Ungültiger Token',
        message: 'Bitte erneut anmelden' 
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Server-Fehler' });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      `SELECT u.*, r.name as rank_name, r.commission_rate
       FROM users u
       LEFT JOIN ranks r ON u.rank_id = r.id
       WHERE u.id = $1 AND u.status != 'suspended'`,
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      delete user.password_hash;
      req.user = user;
    }

    next();
  } catch (error) {
    // Token invalid but that's okay for optional auth
    next();
  }
};

/**
 * Require specific role(s)
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Nicht autorisiert',
        message: 'Bitte anmelden' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Zugriff verweigert',
        message: 'Keine Berechtigung für diese Aktion' 
      });
    }

    next();
  };
};

/**
 * Require active partner status
 */
export const requireActivePartner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Nicht autorisiert',
      message: 'Bitte anmelden' 
    });
  }

  if (req.user.status !== 'active') {
    return res.status(403).json({ 
      error: 'Konto nicht aktiv',
      message: 'Ihr Partnerkonto ist nicht aktiv' 
    });
  }

  next();
};

/**
 * Check if user is admin
 */
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Zugriff verweigert',
      message: 'Admin-Rechte erforderlich' 
    });
  }
  next();
};

/**
 * Authenticate customer (separate from partner/admin auth)
 */
export const authenticateCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Nicht autorisiert',
        message: 'Kein Token vorhanden' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if it's a customer token
    if (decoded.type !== 'customer') {
      return res.status(401).json({ 
        error: 'Nicht autorisiert',
        message: 'Ungültiger Kundentoken' 
      });
    }

    // Get customer from database
    const result = await query(
      `SELECT * FROM customers WHERE id = $1`,
      [decoded.customerId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Nicht autorisiert',
        message: 'Kunde nicht gefunden' 
      });
    }

    req.customer = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token abgelaufen',
        message: 'Bitte erneut anmelden' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Ungültiger Token',
        message: 'Bitte erneut anmelden' 
      });
    }

    console.error('Customer auth error:', error);
    return res.status(500).json({ error: 'Server-Fehler' });
  }
};