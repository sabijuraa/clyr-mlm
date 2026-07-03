import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { releaseHeldCommissions, getCommissionSummary as getCommSummary, distributeBonusPool, checkRankDecay, isCommissionBlockedUser, cleanupDuplicateOrderCommissions } from '../services/commission.service.js';
import { generateCommissionStatement } from '../services/invoice.service.js';
import { isVatIdFormatValid } from '../services/tax.service.js';

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

  // Always exclude bonus_pool — these are internal accounting entries not shown to partners
  whereClause += " AND c.type <> 'bonus_pool'";

  if (status) {
    whereClause += ` AND c.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  } else {
    whereClause += " AND c.status NOT IN ('cancelled', 'reversed')";
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
            NULLIF(TRIM(CONCAT(COALESCE(o.customer_first_name, ''), ' ', COALESCE(o.customer_last_name, ''))), '') as customer_name,
            o.created_at as order_date,
            su.first_name as source_first_name, su.last_name as source_last_name
     FROM commissions c
     LEFT JOIN orders o ON c.order_id = o.id
     LEFT JOIN users su ON c.source_user_id = su.id
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), offset]
  );

  // Get partner's VAT info for commission display (#26, #27)
  const userResult = await query(
    'SELECT country, vat_id FROM users WHERE id = $1',
    [userId]
  );
  const partnerCountry = userResult.rows[0]?.country || 'AT';
  const partnerVatId = userResult.rows[0]?.vat_id;
  const partnerHasValidVatId = partnerVatId && isVatIdFormatValid(partnerVatId, partnerCountry);

  // Commission VAT rules:
  // AT affiliate WITH UID → VAT shown separately (20% on top of commission)
  // AT affiliate WITHOUT UID → commission amount is gross (VAT included)
  // DE affiliate → always has VAT UID, reverse charge applies
  // CH affiliate → no VAT
  let commissionVatInfo = {
    country: partnerCountry,
    hasVatId: !!partnerVatId,
    vatRate: 0,
    vatDisplay: 'none', // 'separate', 'included', 'none'
    vatNote: ''
  };

  if (partnerCountry === 'AT') {
    commissionVatInfo.vatRate = 20;
    commissionVatInfo.vatDisplay = 'separate';
    commissionVatInfo.vatNote = '20% USt. wird separat ausgewiesen';
  } else if (partnerCountry === 'DE' && partnerHasValidVatId) {
    commissionVatInfo.vatDisplay = 'none';
    commissionVatInfo.vatNote = 'Steuerschuldnerschaft des Leistungsempfaengers';
  } else if (partnerCountry === 'DE') {
    commissionVatInfo.vatRate = 19;
    commissionVatInfo.vatDisplay = 'separate';
    commissionVatInfo.vatNote = '19% USt. wird separat ausgewiesen';
  } else if (partnerCountry === 'CH') {
    commissionVatInfo.vatDisplay = 'none';
    commissionVatInfo.vatNote = 'Nicht steuerbar (Drittland)';
  }

  res.json({
    commissions: commissionsResult.rows,
    commissionVatInfo,
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
     WHERE user_id = $1
       AND status NOT IN ('cancelled', 'reversed')
       AND type <> 'bonus_pool'
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

  // First: look for a completed payout for this period.
  // A completed payout was triggered on the 1st of the FOLLOWING month,
  // so we search by created_at in (month+1) as well as period_start/end fields.
  const payoutRes2 = await query(
    `SELECT *
     FROM payouts
     WHERE user_id = $1
       AND status = 'completed'
       AND (
         (period_start <= $3 AND period_end >= $2)
         OR (period_start IS NULL AND period_end IS NULL
             AND created_at >= $4 AND created_at <= $5)
       )
     ORDER BY created_at DESC
     LIMIT 1`,
    [
      userId,
      startDate,
      endDate,
      new Date(year, month, 1),          // 1st of following month
      new Date(year, month + 1, 0, 23, 59, 59) // end of following month
    ]
  );

  const completedPayout = payoutRes2.rows[0] || null;

  let commissionsResult;
  if (completedPayout) {
    // CORRECT PATH: pull exactly the commissions that were paid in this payout.
    // This avoids including future held/released commissions whose orders
    // happen to fall in the same calendar month.
    console.log('[STATEMENT] Found completed payout', completedPayout.id, '— using payout_id filter');
    commissionsResult = await query(
      `SELECT c.*, o.order_number, o.subtotal as order_total, o.created_at as order_date,
              NULLIF(TRIM(CONCAT(COALESCE(o.customer_first_name, ''), ' ', COALESCE(o.customer_last_name, ''))), '') as customer_name
       FROM commissions c
       LEFT JOIN orders o ON c.order_id = o.id
       WHERE c.payout_id = $1
         AND c.type <> 'bonus_pool'
       ORDER BY COALESCE(o.created_at, c.created_at) ASC`,
      [completedPayout.id]
    );
  } else {
    // FALLBACK: no completed payout yet — show all commissions in the period
    // (useful for the current/future month preview).
    console.log('[STATEMENT] No completed payout found — using order-date range filter');
    commissionsResult = await query(
      `SELECT c.*, o.order_number, o.subtotal as order_total, o.created_at as order_date,
              NULLIF(TRIM(CONCAT(COALESCE(o.customer_first_name, ''), ' ', COALESCE(o.customer_last_name, ''))), '') as customer_name
       FROM commissions c
       LEFT JOIN orders o ON c.order_id = o.id
       WHERE c.user_id = $1
         AND c.status IN ('held', 'released', 'paid', 'pending')
         AND c.type <> 'bonus_pool'
         AND (
           (o.created_at >= $2 AND o.created_at <= $3)
           OR (o.created_at IS NULL AND c.created_at >= $2 AND c.created_at <= $3)
         )
       ORDER BY COALESCE(o.created_at, c.created_at) ASC`,
      [userId, startDate, endDate]
    );
  }

  console.log('[STATEMENT] Found', commissionsResult.rows.length, 'commissions for statement');

  const finalCommissions = commissionsResult.rows;

  if (finalCommissions.length === 0) {
    throw new AppError('Keine Provisionen gefunden', 404);
  }

  // Get user details
  const userResult = await query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );

  const periodFormatted = new Date(year, month - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  console.log('[STATEMENT] Generating PDF for', userResult.rows[0].email, 'period:', periodFormatted, 'commissions:', finalCommissions.length);
  let pdfBuffer;
  try {
    pdfBuffer = await generateCommissionStatement(
      userResult.rows[0],
      finalCommissions,
      periodFormatted,
      payoutRes2.rows[0] || null
    );
    console.log('[STATEMENT] PDF generated, size:', pdfBuffer?.length);
  } catch (pdfErr) {
    console.error('[STATEMENT] PDF generation error:', pdfErr.message, pdfErr.stack);
    throw new AppError(`PDF Fehler: ${pdfErr.message}`, 500);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Provisionsabrechnung-${period}.pdf"`);
  res.send(pdfBuffer);
});

/**
 * Get all commissions (Admin)
 */
export const getAllCommissions = asyncHandler(async (req, res) => {
  await cleanupDuplicateOrderCommissions().catch((error) => {
    console.error('Commission duplicate cleanup failed:', error.message);
  });

  const { page = 1, limit = 50, userId, type, status, startDate, endDate } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = "WHERE LOWER(u.email) <> 'technik@clyr.shop'";
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
  } else {
    whereClause += " AND c.type <> 'bonus_pool'";
  }

  if (status) {
    whereClause += ` AND c.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  } else {
    whereClause += " AND c.status NOT IN ('cancelled', 'reversed')";
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
    `SELECT COUNT(*)
     FROM commissions c
     JOIN users u ON c.user_id = u.id
     ${whereClause}`,
    params
  );

  const commissionsResult = await query(
    `SELECT c.*, 
            u.first_name, u.last_name, u.email,
            o.order_number,
            o.created_at as order_date,
            NULLIF(TRIM(CONCAT(COALESCE(o.customer_first_name, ''), ' ', COALESCE(o.customer_last_name, ''))), '') as customer_name
     FROM commissions c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN orders o ON c.order_id = o.id
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), offset]
  );

  // Get totals (exclude reversed commissions)
  const totalsResult = await query(
    `SELECT 
       SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END) as total_pending,
       SUM(CASE WHEN c.status = 'held' THEN c.amount ELSE 0 END) as total_held,
       SUM(CASE WHEN c.status = 'released' THEN c.amount ELSE 0 END) as total_released,
       SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_paid
     FROM commissions c
     JOIN users u ON c.user_id = u.id
     WHERE c.status NOT IN ('cancelled', 'reversed')
       AND c.type <> 'bonus_pool'
       AND LOWER(u.email) <> 'technik@clyr.shop'`
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
    `SELECT c.*, u.first_name, u.last_name, u.email, o.order_number,
            NULLIF(TRIM(CONCAT(COALESCE(o.customer_first_name, ''), ' ', COALESCE(o.customer_last_name, ''))), '') as customer_name
     FROM commissions c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN orders o ON c.order_id = o.id
     WHERE c.status = 'held' AND c.held_until <= CURRENT_TIMESTAMP
       AND c.type <> 'bonus_pool'
       AND LOWER(u.email) <> 'technik@clyr.shop'
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
  await cleanupDuplicateOrderCommissions().catch((error) => {
    console.error('Commission duplicate cleanup failed:', error.message);
  });
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
  await cleanupDuplicateOrderCommissions().catch((error) => {
    console.error('Commission duplicate cleanup failed:', error.message);
  });

  // Get all partners with released commissions
  const partnersResult = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.iban, u.bic, u.country, u.vat_id,
            u.wallet_balance,
            (SELECT COALESCE(SUM(amount), 0) FROM commissions 
             WHERE user_id = u.id AND status = 'released' AND type <> 'bonus_pool') as pending_amount
     FROM users u
     WHERE u.role IN ('partner', 'admin') AND u.status = 'active' AND u.wallet_balance > 0
     ORDER BY u.wallet_balance DESC`
  );

  // Get minimum payout threshold
  const settingsResult = await query("SELECT value FROM settings WHERE key = 'min_payout_amount'");
  const minPayoutAmount = settingsResult.rows[0]?.value?.amount || 50;

  // Use actual released commissions sum (not cached wallet_balance which may be stale)
  // Note: IBAN not required - admin can process manually even without IBAN on file
  const eligiblePartners = partnersResult.rows.filter(p =>
    !isCommissionBlockedUser(p) && parseFloat(p.pending_amount) >= minPayoutAmount
  );
  const missingIban = partnersResult.rows.filter(p =>
    !isCommissionBlockedUser(p) && parseFloat(p.pending_amount) >= minPayoutAmount && !p.iban
  );

  if (dryRun) {
    return res.json({
      dryRun: true,
      eligiblePartners: eligiblePartners.length,
      totalAmount: eligiblePartners.reduce((sum, p) => sum + parseFloat(p.pending_amount), 0),
      partners: eligiblePartners.map(p => ({
        name: `${p.first_name} ${p.last_name}`,
        email: p.email,
        amount: parseFloat(p.pending_amount),
        iban: p.iban ? `${p.iban.substring(0, 4)}****${p.iban.slice(-4)}` : 'Nicht hinterlegt'
      })),
      missingIban: missingIban.map(p => ({
        name: `${p.first_name} ${p.last_name}`,
        email: p.email,
        amount: parseFloat(p.pending_amount)
      }))
    });
  }

  // Process payouts
  const processed = [];
  const failed = [];

  for (const partner of eligiblePartners) {
    try {
      await transaction(async (client) => {
        // Calculate VAT on the net commission amount
        const netAmount = parseFloat(partner.pending_amount);
        const country = String(partner.country || 'AT').toUpperCase();
        const hasValidVatId = partner.vat_id && isVatIdFormatValid
          ? (() => { try { return isVatIdFormatValid(partner.vat_id, country); } catch { return false; } })()
          : false;
        let vatRate = 0;
        if (country === 'AT') vatRate = 20;
        else if (country === 'DE' && !hasValidVatId) vatRate = 19;
        const vatAmount = Math.round(netAmount * vatRate / 100 * 100) / 100;
        const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100;

        // Create payout record — net_amount and gross_amount are NOT NULL in schema
        const payoutResult = await client.query(
          `INSERT INTO payouts (user_id, net_amount, vat_amount, gross_amount, method, iban, bic, status, reference)
           VALUES ($1, $2, $3, $4, 'sepa', $5, $6, 'processing', $7)
           RETURNING id`,
          [partner.id, netAmount, vatAmount, grossAmount, partner.iban || '', partner.bic || '', `PAYOUT-${Date.now()}`]
        );

        // Update commissions to paid
        await client.query(
          `UPDATE commissions SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payout_id = $1
           WHERE user_id = $2 AND status = 'released' AND type <> 'bonus_pool'`,
          [payoutResult.rows[0].id, partner.id]
        );

        // Mark payout as completed so commissions are correctly shown as paid
        await client.query(
          `UPDATE payouts SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [payoutResult.rows[0].id]
        );

        // Reset wallet balance — use pending_amount (actual released sum), not cached wallet_balance
        await client.query(
          'UPDATE users SET wallet_balance = GREATEST(0, wallet_balance - $2) WHERE id = $1',
          [partner.id, parseFloat(partner.pending_amount)]
        );

        processed.push({
          partnerId: partner.id,
          name: `${partner.first_name} ${partner.last_name}`,
          amount: parseFloat(partner.pending_amount),
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

/**
 * Generate commission statement for specific partner (Admin)
 */
export const generateStatementForPartner = asyncHandler(async (req, res) => {
  const { partnerId, period } = req.body; // period format: YYYY-MM

  if (!partnerId || !period) {
    throw new AppError('Partner-ID und Zeitraum erforderlich', 400);
  }

  const [year, month] = period.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const commissionsResult = await query(
    `SELECT c.*, o.order_number, o.subtotal as order_total, o.created_at as order_date,
            NULLIF(TRIM(CONCAT(COALESCE(o.customer_first_name, ''), ' ', COALESCE(o.customer_last_name, ''))), '') as customer_name
     FROM commissions c
     LEFT JOIN orders o ON c.order_id = o.id
     WHERE c.user_id = $1 
       AND c.status IN ('released', 'paid')
       AND c.type <> 'bonus_pool'
       AND (
         (o.created_at >= $2 AND o.created_at <= $3)
         OR (o.created_at IS NULL AND c.created_at >= $2 AND c.created_at <= $3)
       )
     ORDER BY COALESCE(o.created_at, c.created_at) ASC`,
    [partnerId, startDate, endDate]
  );
  
  console.log(`[ADMIN STATEMENT] Found ${commissionsResult.rows.length} commissions for partner ${partnerId} in period ${period}`);

  if (commissionsResult.rows.length === 0) {
    throw new AppError('Keine Provisionen für diesen Zeitraum', 404);
  }

  // Get user details
  const userResult = await query(
    'SELECT * FROM users WHERE id = $1',
    [partnerId]
  );

  if (userResult.rows.length === 0) {
    throw new AppError('Partner nicht gefunden', 404);
  }

  const periodFormatted = new Date(year, month - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  console.log('[ADMIN STATEMENT] Period resolved from request param:', periodFormatted);

  // Get payout record for this period
  const payoutResult = await query(
    `SELECT *
     FROM payouts
     WHERE user_id = $1
       AND status <> 'cancelled'
       AND (
         (period_start <= $3 AND period_end >= $2)
         OR (period_start IS NULL AND period_end IS NULL AND created_at >= $4 AND created_at <= $5)
       )
     ORDER BY created_at DESC
     LIMIT 1`,
    [
      partnerId,
      startDate,
      endDate,
      new Date(year, month, 1),
      new Date(year, month + 1, 0, 23, 59, 59)
    ]
  );

  const pdfBuffer = await generateCommissionStatement(
    userResult.rows[0],
    commissionsResult.rows,
    periodFormatted,
    payoutResult.rows[0] || null
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Provisionsabrechnung-${userResult.rows[0].last_name}-${period}.pdf"`);
  res.send(pdfBuffer);
});

/**
 * Distribute monthly bonus pool (Admin)
 * 2% of total monthly revenue shared among active leaders (rank ≥ Teamleiter)
 */
export const distributeBonusPoolHandler = asyncHandler(async (req, res) => {
  const result = await distributeBonusPool(req.user.id);

  if (result.error) {
    return res.status(400).json({ message: result.error, ...result });
  }

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, details)
     VALUES ($1, $2, $3, $4)`,
    [req.user.id, 'bonus_pool_distributed', 'commission', JSON.stringify(result)]
  );

  res.json({
    message: `Bonus Pool verteilt: €${result.poolAmount} an ${result.eligibleLeaders} Leader`,
    ...result
  });
});

/**
 * Run rank decay check (Admin)
 * Partners with no sales for 12+ months get reset to Berater (R2)
 */
export const runRankDecay = asyncHandler(async (req, res) => {
  const decayed = await checkRankDecay();

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, details)
     VALUES ($1, $2, $3, $4)`,
    [req.user.id, 'rank_decay_check', 'user', JSON.stringify({ decayedCount: decayed.length, partners: decayed })]
  );

  res.json({
    message: `${decayed.length} Partner auf Berater zurückgestuft`,
    decayed
  });
});

/**
 * Download monthly commission statements as a ZIP (Admin only)
 * GET /api/commissions/admin-zip?year=2026&month=6
 * Returns: ZIP_Juni_2026.zip containing DDMMYYYY_Commission_Lastname.pdf per affiliate
 */
export const downloadCommissionZip = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  const now = new Date();
  const y = parseInt(year) || now.getFullYear();
  const m = parseInt(month) || now.getMonth() + 1;

  // German month names
  const MONTH_NAMES_DE = [
    '', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const period = `${y}-${String(m).padStart(2, '0')}`;
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59);

  // Get all active affiliates who had commissions in this period
  const affiliatesResult = await query(
    `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email,
            u.company, u.street, u.zip, u.city, u.country,
            u.vat_id, u.iban, u.bic, u.bank_name, u.account_holder,
            u.is_kleinunternehmer, u.rank_id
     FROM users u
     INNER JOIN commissions c ON c.user_id = u.id
     WHERE TO_CHAR(c.created_at, 'YYYY-MM') = $1
       AND c.type <> 'bonus_pool'
       AND c.status NOT IN ('cancelled', 'reversed')
     ORDER BY u.last_name, u.first_name`,
    [period]
  );

  if (affiliatesResult.rows.length === 0) {
    return res.status(404).json({ message: `Keine Provisionsabrechnungen für ${MONTH_NAMES_DE[m]} ${y} gefunden.` });
  }

  // Dynamically import archiver
  let archiver;
  try {
    const archiverModule = await import('archiver');
    archiver = archiverModule.default;
  } catch {
    return res.status(500).json({ message: 'ZIP-Bibliothek nicht installiert. Bitte "npm install archiver" ausführen.' });
  }

  const { generateCommissionStatement } = await import('../services/invoice.service.js');

  const zipName = `ZIP_${MONTH_NAMES_DE[m]}_${y}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(res);

  // Date string for filenames: 01062026 (first of the requested month)
  const dateStr = `01${String(m).padStart(2, '0')}${y}`;
  const periodFormatted = new Date(y, m - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  for (const affiliate of affiliatesResult.rows) {
    try {
      // Fetch this affiliate's commissions for the period
      const commissionsResult = await query(
        `SELECT c.*, o.order_number, o.subtotal as order_total, o.created_at as order_date,
                NULLIF(TRIM(CONCAT(COALESCE(o.customer_first_name, ''), ' ', COALESCE(o.customer_last_name, ''))), '') as customer_name
         FROM commissions c
         LEFT JOIN orders o ON c.order_id = o.id
         WHERE c.user_id = $1
           AND c.type <> 'bonus_pool'
           AND c.status NOT IN ('cancelled', 'reversed')
           AND (
             (o.created_at >= $2 AND o.created_at <= $3)
             OR (o.created_at IS NULL AND c.created_at >= $2 AND c.created_at <= $3)
           )
         ORDER BY COALESCE(o.created_at, c.created_at) ASC`,
        [affiliate.id, startDate, endDate]
      );

      if (commissionsResult.rows.length === 0) {
        console.log(`[ZIP] Skipping ${affiliate.last_name} — no commissions in period`);
        continue;
      }

      // Get payout record for this period if one exists
      const payoutResult = await query(
        `SELECT * FROM payouts
         WHERE user_id = $1
           AND status <> 'cancelled'
           AND (
             (period_start <= $3 AND period_end >= $2)
             OR (period_start IS NULL AND period_end IS NULL
                 AND created_at >= $4 AND created_at <= $5)
           )
         ORDER BY created_at DESC LIMIT 1`,
        [
          affiliate.id,
          startDate,
          endDate,
          new Date(y, m, 1),
          new Date(y, m + 1, 0, 23, 59, 59)
        ]
      );

      // generateCommissionStatement expects (partnerObject, commissionsArray, periodLabel, payoutRecord)
      const pdfBuffer = await generateCommissionStatement(
        affiliate,
        commissionsResult.rows,
        periodFormatted,
        payoutResult.rows[0] || null
      );

      const lastName = (affiliate.last_name || affiliate.email || String(affiliate.id))
        .replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${dateStr}_Commission_${lastName}.pdf`;
      archive.append(pdfBuffer, { name: filename });
      console.log(`[ZIP] Added: ${filename}`);
    } catch (err) {
      console.error(`[ZIP] Statement for affiliate ${affiliate.id} (${affiliate.last_name}) failed:`, err.message);
    }
  }

  await archive.finalize();
});
