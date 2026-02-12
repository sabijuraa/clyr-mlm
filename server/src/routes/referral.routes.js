// server/src/routes/referral.routes.js
// GROUP 5: Referral System
// #11: Referral code visible, #35: End-to-end flow
import { Router } from 'express';
import { query, transaction } from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.middleware.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';

const router = Router();

/**
 * POST /api/referral/verify
 * Verify a referral code and return partner info
 * Used by checkout page (#11)
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code || !code.trim()) {
    throw new AppError('Empfehlungscode erforderlich', 400);
  }

  const result = await query(
    `SELECT id, first_name, last_name, referral_code, status 
     FROM users 
     WHERE referral_code = $1 AND status = 'active' AND role = 'partner'`,
    [code.trim().toUpperCase()]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ 
      valid: false, 
      error: 'Ungueltiger Empfehlungscode' 
    });
  }

  const partner = result.rows[0];
  res.json({
    valid: true,
    partner: {
      first_name: partner.first_name,
      last_name: partner.last_name.charAt(0) + '.',
      referral_code: partner.referral_code
    }
  });
}));

/**
 * GET /api/referral/check/:code
 * Quick check if referral code exists (for shop page)
 */
router.get('/check/:code', asyncHandler(async (req, res) => {
  const { code } = req.params;

  const result = await query(
    `SELECT first_name, last_name, referral_code 
     FROM users 
     WHERE referral_code = $1 AND status = 'active'`,
    [code.toUpperCase()]
  );

  if (result.rows.length === 0) {
    return res.json({ valid: false });
  }

  res.json({
    valid: true,
    partnerName: `${result.rows[0].first_name} ${result.rows[0].last_name.charAt(0)}.`,
    code: result.rows[0].referral_code
  });
}));

/**
 * POST /api/referral/click
 * Track referral link click (#35)
 * Called when user lands on site via ?ref=CODE
 */
router.post('/click', asyncHandler(async (req, res) => {
  const { code, landingUrl, productId } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code erforderlich' });
  }

  // Verify code exists
  const partnerResult = await query(
    'SELECT id FROM users WHERE referral_code = $1 AND status = $2',
    [code.toUpperCase(), 'active']
  );

  if (partnerResult.rows.length === 0) {
    return res.status(404).json({ error: 'Ungueltiger Code' });
  }

  // Track the click
  await query(
    `INSERT INTO referral_clicks (referral_code, user_id, ip_address, user_agent, landing_url, product_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      code.toUpperCase(),
      partnerResult.rows[0].id,
      req.ip,
      req.headers['user-agent'] || '',
      landingUrl || req.headers.referer || '',
      productId || null
    ]
  );

  res.json({ tracked: true, code: code.toUpperCase() });
}));

/**
 * GET /api/referral/my-link
 * Get partner's own referral link and stats
 */
router.get('/my-link', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const userResult = await query(
    'SELECT referral_code FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0 || !userResult.rows[0].referral_code) {
    throw new AppError('Kein Empfehlungscode vorhanden', 404);
  }

  const code = userResult.rows[0].referral_code;

  // Get click stats
  const clicksResult = await query(
    `SELECT 
       COUNT(*) as total_clicks,
       COUNT(CASE WHEN converted = true THEN 1 END) as conversions,
       COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as clicks_30d
     FROM referral_clicks 
     WHERE referral_code = $1`,
    [code]
  );

  const stats = clicksResult.rows[0];

  res.json({
    referralCode: code,
    referralLink: `${req.protocol}://${req.get('host')}/shop?ref=${code}`,
    stats: {
      totalClicks: parseInt(stats.total_clicks) || 0,
      conversions: parseInt(stats.conversions) || 0,
      clicks30d: parseInt(stats.clicks_30d) || 0,
      conversionRate: stats.total_clicks > 0 
        ? ((stats.conversions / stats.total_clicks) * 100).toFixed(1) 
        : '0.0'
    }
  });
}));

/**
 * POST /api/referral/convert
 * Mark a referral click as converted (called internally after order)
 */
router.post('/convert', asyncHandler(async (req, res) => {
  const { code, orderId } = req.body;

  if (!code || !orderId) {
    return res.status(400).json({ error: 'Code and orderId required' });
  }

  // Mark the most recent unconverted click as converted
  await query(
    `UPDATE referral_clicks 
     SET converted = true, order_id = $1 
     WHERE id = (
       SELECT id FROM referral_clicks 
       WHERE referral_code = $2 AND converted = false 
       ORDER BY created_at DESC LIMIT 1
     )`,
    [orderId, code.toUpperCase()]
  );

  res.json({ converted: true });
}));

export default router;
