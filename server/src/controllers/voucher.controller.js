// server/src/controllers/voucher.controller.js
// Voucher/Discount Code System
// Affiliates create codes → customers use at checkout → discount deducted from affiliate commission
import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';

// ==========================================
// PARTNER: Manage own vouchers
// ==========================================

/**
 * Get partner's vouchers
 */
export const getMyVouchers = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT dc.*, 
       (SELECT COUNT(*) FROM orders WHERE discount_code = dc.code AND payment_status = 'paid') as orders_used,
       (SELECT COALESCE(SUM(discount_amount), 0) FROM orders WHERE discount_code = dc.code AND payment_status = 'paid') as total_discount_given
     FROM discount_codes dc
     WHERE dc.partner_id = $1
     ORDER BY dc.created_at DESC`,
    [req.user.id]
  );

  res.json({ vouchers: result.rows });
});

/**
 * Create a new voucher
 */
export const createVoucher = asyncHandler(async (req, res) => {
  const { code, type, value, maxUses, minOrderAmount, expiresAt } = req.body;

  if (!code || !value) {
    throw new AppError('Code und Wert sind erforderlich', 400);
  }

  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
  if (cleanCode.length < 3 || cleanCode.length > 30) {
    throw new AppError('Code muss 3-30 Zeichen haben', 400);
  }

  // Check uniqueness
  const existing = await query('SELECT id FROM discount_codes WHERE code = $1', [cleanCode]);
  if (existing.rows.length > 0) {
    throw new AppError('Dieser Code ist bereits vergeben', 409);
  }

  // Validate value
  const numValue = parseFloat(value);
  if (type === 'percentage' && (numValue < 1 || numValue > 50)) {
    throw new AppError('Prozent-Rabatt muss zwischen 1% und 50% sein', 400);
  }
  if (type === 'fixed' && (numValue < 1 || numValue > 500)) {
    throw new AppError('Fester Rabatt muss zwischen 1€ und 500€ sein', 400);
  }

  const result = await query(
    `INSERT INTO discount_codes (code, type, value, partner_id, max_uses, min_order_amount, expires_at, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [
      cleanCode,
      type || 'fixed',
      numValue,
      req.user.id,
      maxUses || null,
      minOrderAmount || 0,
      expiresAt || null
    ]
  );

  res.status(201).json({
    message: 'Gutscheincode erstellt',
    voucher: result.rows[0]
  });
});

/**
 * Toggle voucher active/inactive
 */
export const toggleVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `UPDATE discount_codes SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND partner_id = $2
     RETURNING *`,
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Gutschein nicht gefunden', 404);
  }

  res.json({
    message: result.rows[0].is_active ? 'Gutschein aktiviert' : 'Gutschein deaktiviert',
    voucher: result.rows[0]
  });
});

/**
 * Delete voucher
 */
export const deleteVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM discount_codes WHERE id = $1 AND partner_id = $2 RETURNING id',
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Gutschein nicht gefunden', 404);
  }

  res.json({ message: 'Gutschein geloescht' });
});

// ==========================================
// PUBLIC: Validate voucher at checkout
// ==========================================

/**
 * Validate a discount code at checkout
 */
export const validateVoucher = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;

  if (!code) {
    throw new AppError('Code erforderlich', 400);
  }

  const result = await query(
    `SELECT dc.*, u.first_name as partner_first_name, u.last_name as partner_last_name, u.referral_code
     FROM discount_codes dc
     LEFT JOIN users u ON dc.partner_id = u.id
     WHERE dc.code = $1`,
    [code.toUpperCase().trim()]
  );

  if (result.rows.length === 0) {
    throw new AppError('Ungueltiger Gutscheincode', 404);
  }

  const voucher = result.rows[0];

  // Check if active
  if (!voucher.is_active) {
    throw new AppError('Dieser Gutschein ist nicht mehr aktiv', 400);
  }

  // Check expiry
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    throw new AppError('Dieser Gutschein ist abgelaufen', 400);
  }

  // Check max uses
  if (voucher.max_uses && voucher.current_uses >= voucher.max_uses) {
    throw new AppError('Dieser Gutschein wurde bereits maximal eingeloest', 400);
  }

  // Check minimum order
  if (subtotal && voucher.min_order_amount > 0 && subtotal < voucher.min_order_amount) {
    throw new AppError(`Mindestbestellwert: EUR ${voucher.min_order_amount.toFixed(2)}`, 400);
  }

  // Calculate discount
  let discountAmount = 0;
  if (voucher.type === 'fixed') {
    discountAmount = voucher.value;
  } else if (voucher.type === 'percentage') {
    discountAmount = subtotal ? Math.round(subtotal * (voucher.value / 100) * 100) / 100 : 0;
  }

  // Cap discount at subtotal
  if (subtotal && discountAmount > subtotal) {
    discountAmount = subtotal;
  }

  res.json({
    valid: true,
    code: voucher.code,
    type: voucher.type,
    value: parseFloat(voucher.value),
    discountAmount,
    partnerId: voucher.partner_id,
    partnerReferralCode: voucher.referral_code,
    message: voucher.type === 'fixed'
      ? `EUR ${parseFloat(voucher.value).toFixed(2)} Rabatt`
      : `${parseFloat(voucher.value)}% Rabatt`
  });
});

// ==========================================
// ADMIN: Manage all vouchers
// ==========================================

/**
 * Get all vouchers (admin)
 */
export const getAllVouchers = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT dc.*, 
       u.first_name || ' ' || u.last_name as partner_name, u.email as partner_email,
       (SELECT COUNT(*) FROM orders WHERE discount_code = dc.code AND payment_status = 'paid') as orders_used,
       (SELECT COALESCE(SUM(discount_amount), 0) FROM orders WHERE discount_code = dc.code AND payment_status = 'paid') as total_discount_given
     FROM discount_codes dc
     LEFT JOIN users u ON dc.partner_id = u.id
     ORDER BY dc.created_at DESC`
  );

  res.json({ vouchers: result.rows });
});

/**
 * Admin delete any voucher
 */
export const adminDeleteVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await query('DELETE FROM discount_codes WHERE id = $1', [id]);
  res.json({ message: 'Gutschein geloescht' });
});
