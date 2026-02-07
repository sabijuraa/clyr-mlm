// server/src/controllers/partner-subscription.controller.js
// GROUP 5: #37 Affiliate subscription, #54 Prospect protection, #53 Crossline prohibition
import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';

// ==========================================
// #37: AFFILIATE SUBSCRIPTION (Intranet-Gebuehr)
// ==========================================

/**
 * Get partner's subscription status
 */
export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const userResult = await query(
    `SELECT subscription_status, subscription_amount, subscription_prorated,
            annual_fee_paid_at, annual_fee_expires_at, status, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('Partner nicht gefunden', 404);
  }

  const user = userResult.rows[0];

  // Get payment history
  const paymentsResult = await query(
    `SELECT * FROM subscription_payments 
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );

  // Calculate prorated fee for current year
  const now = new Date();
  const monthsRemaining = 12 - now.getMonth(); // Jan=0, so 12-0=12 for Jan
  const annualFee = 100.00;
  const proratedFee = Math.round((annualFee / 12) * monthsRemaining * 100) / 100;

  res.json({
    status: user.subscription_status || 'unpaid',
    annualFee,
    proratedFee: user.subscription_prorated || proratedFee,
    paidAt: user.annual_fee_paid_at,
    expiresAt: user.annual_fee_expires_at,
    partnerStatus: user.status,
    isActive: user.status === 'active' && (user.subscription_status === 'active' || user.subscription_status === 'grace'),
    payments: paymentsResult.rows
  });
});

/**
 * Record subscription payment (Admin)
 */
export const recordSubscriptionPayment = asyncHandler(async (req, res) => {
  const { partnerId, amount, paymentMethod, paymentReference } = req.body;

  if (!partnerId) throw new AppError('Partner-ID erforderlich', 400);

  const now = new Date();
  const periodStart = now;
  const periodEnd = new Date(now.getFullYear() + 1, 0, 1); // Jan 1 next year

  await transaction(async (client) => {
    // Record payment
    await client.query(
      `INSERT INTO subscription_payments (user_id, amount, payment_method, payment_reference, period_start, period_end, status, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'paid', CURRENT_TIMESTAMP)`,
      [partnerId, amount || 100.00, paymentMethod || 'transfer', paymentReference || '', periodStart, periodEnd]
    );

    // Update user subscription status
    await client.query(
      `UPDATE users SET 
        subscription_status = 'active',
        annual_fee_paid_at = CURRENT_TIMESTAMP,
        annual_fee_expires_at = $2,
        status = CASE WHEN status = 'pending' THEN 'active' ELSE status END
       WHERE id = $1`,
      [partnerId, periodEnd]
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'subscription_payment', 'user', $2, $3)`,
      [req.user.id, partnerId, JSON.stringify({ amount, paymentMethod })]
    );
  });

  res.json({ message: 'Zahlung erfasst. Partner-Abonnement aktiviert.' });
});

/**
 * Check for expired subscriptions (Cron job)
 * Partners with expired subscription become passive/inactive (#37)
 */
export const checkExpiredSubscriptions = async () => {
  try {
    const result = await query(
      `UPDATE users SET 
        subscription_status = 'expired',
        status = 'inactive'
       WHERE role = 'partner'
       AND annual_fee_expires_at IS NOT NULL 
       AND annual_fee_expires_at < CURRENT_TIMESTAMP
       AND subscription_status = 'active'
       RETURNING id, email, first_name, last_name`
    );

    if (result.rows.length > 0) {
      console.log(`Subscription expired for ${result.rows.length} partners:`, result.rows.map(r => r.email));
    }

    return result.rows;
  } catch (error) {
    console.error('Check expired subscriptions error:', error);
    return [];
  }
};

// ==========================================
// #54: PROSPECT PROTECTION (6-month)
// ==========================================

/**
 * Add a prospect (Open House attendance, demo, etc.)
 */
export const addProspect = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { email, name, phone, eventType, eventDate, notes } = req.body;

  if (!name && !email) {
    throw new AppError('Name oder E-Mail erforderlich', 400);
  }

  // Check if prospect already protected by another partner
  if (email) {
    const existingProtection = await query(
      `SELECT pp.*, u.first_name, u.last_name 
       FROM prospect_protection pp
       JOIN users u ON pp.partner_id = u.id
       WHERE pp.prospect_email = $1 
       AND pp.protection_expires_at > CURRENT_TIMESTAMP
       AND pp.partner_id != $2`,
      [email.toLowerCase(), userId]
    );

    if (existingProtection.rows.length > 0) {
      const protector = existingProtection.rows[0];
      throw new AppError(
        `Dieser Interessent ist bereits bis ${new Date(protector.protection_expires_at).toLocaleDateString('de-DE')} durch ${protector.first_name} ${protector.last_name.charAt(0)}. geschuetzt.`,
        409
      );
    }
  }

  // Calculate protection expiry (6 months from event date)
  const eventDateParsed = eventDate ? new Date(eventDate) : new Date();
  const expiresAt = new Date(eventDateParsed);
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  const result = await query(
    `INSERT INTO prospect_protection (partner_id, prospect_email, prospect_name, prospect_phone, event_type, event_date, notes, protection_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [userId, email?.toLowerCase() || null, name, phone || null, eventType || 'open_house', eventDateParsed, notes || null, expiresAt]
  );

  res.status(201).json({
    message: 'Interessent registriert. 6-Monats-Schutz aktiv.',
    prospect: result.rows[0]
  });
});

/**
 * Get partner's protected prospects
 */
export const getMyProspects = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await query(
    `SELECT *, 
       CASE WHEN protection_expires_at > CURRENT_TIMESTAMP THEN true ELSE false END as is_active
     FROM prospect_protection 
     WHERE partner_id = $1 
     ORDER BY created_at DESC`,
    [userId]
  );

  const active = result.rows.filter(r => r.is_active);
  const expired = result.rows.filter(r => !r.is_active);

  res.json({
    prospects: result.rows,
    activeCount: active.length,
    expiredCount: expired.length
  });
});

/**
 * Check prospect protection for an order (internal)
 * Returns the partner who has protection, if any
 */
export const checkProspectProtection = async (customerEmail) => {
  if (!customerEmail) return null;

  try {
    const result = await query(
      `SELECT pp.partner_id, u.referral_code, u.first_name, u.last_name
       FROM prospect_protection pp
       JOIN users u ON pp.partner_id = u.id
       WHERE pp.prospect_email = $1
       AND pp.protection_expires_at > CURRENT_TIMESTAMP
       AND pp.is_converted = false
       ORDER BY pp.event_date ASC
       LIMIT 1`,
      [customerEmail.toLowerCase()]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Check prospect protection error:', error);
    return null;
  }
};

// ==========================================
// #53: CROSSLINE SPONSORING PROHIBITION
// ==========================================

/**
 * Check if a partner can be sponsored by a given upline
 * Prevents switching sponsor lines
 */
export const checkCrosslineAllowed = asyncHandler(async (req, res) => {
  const { email, referralCode } = req.body;

  if (!email) {
    return res.json({ allowed: true });
  }

  // Check if this email was already registered as a partner
  const existingPartner = await query(
    'SELECT id, upline_id, status FROM users WHERE email = $1 AND role = $2',
    [email.toLowerCase(), 'partner']
  );

  if (existingPartner.rows.length === 0) {
    // New partner, no crossline issue
    return res.json({ allowed: true });
  }

  const existing = existingPartner.rows[0];

  // If they have an upline and try to register under a different one
  if (existing.upline_id && referralCode) {
    const newUpline = await query(
      'SELECT id FROM users WHERE referral_code = $1',
      [referralCode.toUpperCase()]
    );

    if (newUpline.rows.length > 0 && newUpline.rows[0].id !== existing.upline_id) {
      return res.json({
        allowed: false,
        error: 'Crossline-Sponsoring ist nicht erlaubt. Dieser Partner ist bereits einer anderen Linie zugeordnet.'
      });
    }
  }

  res.json({ allowed: true });
});
