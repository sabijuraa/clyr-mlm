import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { releaseHeldCommissions, getCommissionSummary as getCommSummary } from '../services/commission.service.js';
import { generateCommissionStatement } from '../services/invoice.service.js';

/**
 * Get my commissions
 */
export const getMyCommissions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  let whereClause = 'WHERE c.user_id = $1';
  const params = [userId];
  let paramIndex = 2;

  if (type) {
    whereClause += ` AND c.type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND c.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND c.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND c.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM commissions c ${whereClause}`,
    params
  );

  const commissionsResult = await query(
    `SELECT c.*, o.order_number, o.customer_first_name, o.customer_last_name,
            su.first_name as source_first_name, su.last_name as source_last_name
     FROM commissions c
     LEFT JOIN orders o ON c.order_id = o.id
     LEFT JOIN users su ON c.source_user_id = su.id
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    commissions: commissionsResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

/**
 * Get commission summary
 */
export const getCommissionSummary = asyncHandler(async (req, res) => {
  const summary = await getCommSummary(req.user.id);

  // Get monthly breakdown (last 6 months)
  const monthlyResult = await query(
    `SELECT 
       DATE_TRUNC('month', created_at) as month,
       SUM(CASE WHEN type = 'direct' THEN amount ELSE 0 END) as direct,
       SUM(CASE WHEN type = 'difference' THEN amount ELSE 0 END) as difference,
       SUM(CASE WHEN type IN ('leadership_bonus', 'team_volume_bonus', 'rank_bonus') THEN amount ELSE 0 END) as bonuses,
       SUM(amount) as total
     FROM commissions
     WHERE user_id = $1 AND status != 'reversed'
     AND created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY month DESC`,
    [req.user.id]
  );

  // Get by type
  const byTypeResult = await query(
    `SELECT type, SUM(amount) as total, COUNT(*) as count
     FROM commissions
     WHERE user_id = $1 AND status != 'reversed'
     GROUP BY type`,
    [req.user.id]
  );

  res.json({
    summary,
    monthly: monthlyResult.rows,
    byType: byTypeResult.rows
  });
});

/**
 * Get commission statement PDF
 */
export const getStatement = asyncHandler(async (req, res) => {
  const { period } = req.params; // Format: YYYY-MM
  const userId = req.user.id;

  const [year, month] = period.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get commissions for period
  const commissionsResult = await query(
    `SELECT c.*, o.order_number
     FROM commissions c
     LEFT JOIN orders o ON c.order_id = o.id
     WHERE c.user_id = $1 
     AND c.created_at >= $2 
     AND c.created_at <= $3
     AND c.status IN ('released', 'paid')
     ORDER BY c.created_at ASC`,
    [userId, startDate, endDate]
  );

  if (commissionsResult.rows.length === 0) {
    throw new AppError('Keine Provisionen für diesen Zeitraum', 404);
  }

  // Get user details
  const userResult = await query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );

  const periodFormatted = new Date(year, month - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const pdfBuffer = await generateCommissionStatement(
    userResult.rows[0],
    commissionsResult.rows,
    periodFormatted
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Provisionsabrechnung-${period}.pdf"`);
  res.send(pdfBuffer);
});

/**
 * Get all commissions (Admin)
 */
export const getAllCommissions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, userId, type, status, startDate, endDate } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (userId) {
    whereClause += ` AND c.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (type) {
    whereClause += ` AND c.type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND c.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND c.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND c.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM commissions c ${whereClause}`,
    params
  );

  const commissionsResult = await query(
    `SELECT c.*, 
            u.first_name, u.last_name, u.email,
            o.order_number
     FROM commissions c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN orders o ON c.order_id = o.id
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), offset]
  );

  // Get totals
  const totalsResult = await query(
    `SELECT 
       SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
       SUM(CASE WHEN status = 'held' THEN amount ELSE 0 END) as total_held,
       SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) as total_released,
       SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid
     FROM commissions`
  );

  res.json({
    commissions: commissionsResult.rows,
    totals: totalsResult.rows[0],
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

/**
 * Get pending commissions ready for release (Admin)
 */
export const getPendingCommissions = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT c.*, u.first_name, u.last_name, u.email, o.order_number
     FROM commissions c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN orders o ON c.order_id = o.id
     WHERE c.status = 'held' AND c.held_until <= CURRENT_TIMESTAMP
     ORDER BY c.held_until ASC`
  );

  const totalAmount = result.rows.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  res.json({
    commissions: result.rows,
    count: result.rows.length,
    totalAmount
  });
});

/**
 * Release held commissions (Admin)
 */
export const releaseCommissions = asyncHandler(async (req, res) => {
  const released = await releaseHeldCommissions();

  res.json({
    message: `${released.length} Provisionen freigegeben`,
    released
  });
});

/**
 * Process monthly payouts (Admin)
 */
export const processPayouts = asyncHandler(async (req, res) => {
  const { dryRun = false } = req.body;

  // Get all partners with released commissions
  const partnersResult = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.iban, u.bic, u.country, u.vat_id,
            u.wallet_balance,
            (SELECT COALESCE(SUM(amount), 0) FROM commissions 
             WHERE user_id = u.id AND status = 'released') as pending_amount
     FROM users u
     WHERE u.role = 'partner' AND u.status = 'active' AND u.wallet_balance > 0
     ORDER BY u.wallet_balance DESC`
  );

  // Get minimum payout threshold
  const settingsResult = await query("SELECT value FROM settings WHERE key = 'min_payout_amount'");
  const minPayoutAmount = settingsResult.rows[0]?.value?.amount || 50;

  const eligiblePartners = partnersResult.rows.filter(p => p.wallet_balance >= minPayoutAmount && p.iban);

  if (dryRun) {
    return res.json({
      dryRun: true,
      eligiblePartners: eligiblePartners.length,
      totalAmount: eligiblePartners.reduce((sum, p) => sum + parseFloat(p.wallet_balance), 0),
      partners: eligiblePartners.map(p => ({
        name: `${p.first_name} ${p.last_name}`,
        email: p.email,
        amount: p.wallet_balance,
        iban: p.iban ? `${p.iban.substring(0, 4)}****${p.iban.slice(-4)}` : 'Missing'
      }))
    });
  }

  // Process payouts
  const processed = [];
  const failed = [];

  for (const partner of eligiblePartners) {
    try {
      await transaction(async (client) => {
        // Create payout record
        const payoutResult = await client.query(
          `INSERT INTO payouts (user_id, amount, method, iban, bic, status, reference)
           VALUES ($1, $2, 'sepa', $3, $4, 'processing', $5)
           RETURNING id`,
          [partner.id, partner.wallet_balance, partner.iban, partner.bic, `PAYOUT-${Date.now()}`]
        );

        // Update commissions to paid
        await client.query(
          `UPDATE commissions SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payout_id = $1
           WHERE user_id = $2 AND status = 'released'`,
          [payoutResult.rows[0].id, partner.id]
        );

        // Reset wallet balance
        await client.query(
          'UPDATE users SET wallet_balance = 0 WHERE id = $1',
          [partner.id]
        );

        processed.push({
          partnerId: partner.id,
          name: `${partner.first_name} ${partner.last_name}`,
          amount: partner.wallet_balance,
          payoutId: payoutResult.rows[0].id
        });
      });
    } catch (error) {
      failed.push({
        partnerId: partner.id,
        name: `${partner.first_name} ${partner.last_name}`,
        error: error.message
      });
    }
  }

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, details)
     VALUES ($1, $2, $3, $4)`,
    [req.user.id, 'payouts_processed', 'payout', JSON.stringify({ processed: processed.length, failed: failed.length })]
  );

  res.json({
    message: `${processed.length} Auszahlungen verarbeitet`,
    processed,
    failed
  });
});