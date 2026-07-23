import { query, transaction } from '../config/database.js';
import { generateCommissionStatement } from './invoice.service.js';
import { isVatIdFormatValid } from './tax.service.js';

/**
 * CLYR Payout Service
 * 
 * Handles partner payouts via SEPA transfer
 * 
 * Payout Rules:
 * - Minimum payout: €50
 * - Payout cycle: 1st of each month
 * - Commission statements generated per payout
 * 
 * VAT Handling for Commission Statements:
 * - Austrian affiliates: 20% VAT, with or without UID
 * - German affiliates with UID: Reverse Charge (0%)
 * - German affiliates without UID: 19% VAT
 */

/**
 * Generate statement number
 */
export const generateStatementNumber = async () => {
  const date = new Date();
  const prefix = `CS${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const result = await query(
    `SELECT statement_number FROM payouts 
     WHERE statement_number LIKE $1 
     ORDER BY created_at DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].statement_number;
    sequence = parseInt(lastNumber.slice(-4)) + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

/**
 * Calculate VAT for commission based on partner's country and VAT status
 */
const calculateCommissionVAT = (partner, netAmount) => {
  const country = String(partner.country || '').toUpperCase();
  const hasValidVatId = partner.vat_id && isVatIdFormatValid(partner.vat_id, country);

  if (country === 'DE' && hasValidVatId) {
    return {
      vatRate: 0,
      vatAmount: 0,
      grossAmount: netAmount,
      vatType: 'reverse_charge',
      vatNote: 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfaengers gem. Par. 13b UStG'
    };
  }

  if (country === 'DE') {
    const vatAmount = Math.round(netAmount * 0.19 * 100) / 100;
    return {
      vatRate: 19,
      vatAmount,
      grossAmount: Math.round((netAmount + vatAmount) * 100) / 100,
      vatType: 'standard',
      vatNote: 'Umsatzsteuer 19 % gemaess deutschem UStG.'
    };
  }

  if (country === 'AT') {
    const vatAmount = Math.round(netAmount * 0.20 * 100) / 100;
    return {
      vatRate: 20,
      vatAmount,
      grossAmount: Math.round((netAmount + vatAmount) * 100) / 100,
      vatType: 'standard',
      vatNote: 'Umsatzsteuer 20 % gemaess oesterreichischem UStG.'
    };
  }

  if (country === 'CH') {
    return {
      vatRate: 0,
      vatAmount: 0,
      grossAmount: netAmount,
      vatType: 'zero_rated',
      vatNote: 'Keine Umsatzsteuer (Schweiz)'
    };
  }

  return {
    vatRate: 0,
    vatAmount: 0,
    grossAmount: netAmount,
    vatType: 'standard',
    vatNote: ''
  };
};

/**
 * Get partners eligible for payout
 */
export const getEligiblePayouts = async () => {
  const settingsResult = await query("SELECT value FROM settings WHERE key = 'min_payout_amount'");
  const minPayout = settingsResult.rows[0]?.value?.amount || 50;

  const result = await query(
    `SELECT 
       u.id, u.email, u.first_name, u.last_name, u.company,
       u.country, u.vat_id, u.is_kleinunternehmer,
       u.iban, u.bic, u.bank_name, u.account_holder,
       u.wallet_balance,
       u.street, u.zip, u.city
     FROM users u
     WHERE u.role IN ('partner', 'admin')
     AND u.status = 'active'
     AND u.wallet_balance >= $1
     AND u.iban IS NOT NULL
     AND LOWER(u.email) <> 'technik@clyr.shop'
     ORDER BY u.wallet_balance DESC`,
    [minPayout]
  );

  return result.rows;
};

/**
 * Create payout request
 */
export const createPayoutRequest = async (userId, amount = null) => {
  return await transaction(async (client) => {
    // Get partner info
    const partnerResult = await client.query(
      `SELECT 
         id, email, first_name, last_name, company,
         country, vat_id, is_kleinunternehmer,
         iban, bic, bank_name, account_holder,
         wallet_balance, street, zip, city
       FROM users
       WHERE id = $1 AND role IN ('partner', 'admin')`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      throw new Error('Partner not found');
    }

    const partner = partnerResult.rows[0];
    if (String(partner.email || '').trim().toLowerCase() === 'technik@clyr.shop') {
      throw new Error('This admin account is not eligible for commission payout');
    }

    // Check minimum payout
    const settingsResult = await client.query("SELECT value FROM settings WHERE key = 'min_payout_amount'");
    const minPayout = settingsResult.rows[0]?.value?.amount || 50;

    if (partner.wallet_balance < minPayout) {
      throw new Error(`Minimum payout amount is €${minPayout}`);
    }

    // Check bank details
    if (!partner.iban) {
      throw new Error('Bank details (IBAN) required for payout');
    }

    // Determine payout amount
    const payoutAmount = amount ? Math.min(amount, partner.wallet_balance) : partner.wallet_balance;

    // Calculate VAT
    const vatInfo = calculateCommissionVAT(partner, payoutAmount);

    // Generate statement number
    const statementNumber = await generateStatementNumber();

    // Get period dates (previous month)
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

    // Create payout record
    const payoutResult = await client.query(
      `INSERT INTO payouts (
         user_id, net_amount, vat_amount, gross_amount, method,
         iban, bic, account_holder,
         statement_number, period_start, period_end,
         status
       ) VALUES ($1, $2, $3, $4, 'sepa', $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        userId, 
        payoutAmount, 
        vatInfo.vatAmount, 
        vatInfo.grossAmount,
        partner.iban, 
        partner.bic, 
        partner.account_holder || `${partner.first_name} ${partner.last_name}`,
        statementNumber,
        periodStart,
        periodEnd
      ]
    );

    const payout = payoutResult.rows[0];

    // Get commissions for this period
    const commissionsResult = await client.query(
      `SELECT c.*, o.order_number,
              NULLIF(TRIM(CONCAT(COALESCE(o.customer_first_name, ''), ' ', COALESCE(o.customer_last_name, ''))), '') as customer_name
       FROM commissions c
       LEFT JOIN orders o ON c.order_id = o.id
       WHERE c.user_id = $1 
       AND c.status = 'released'
       AND c.type <> 'bonus_pool'
       AND c.payout_id IS NULL
       ORDER BY c.created_at ASC`,
      [userId]
    );

    // Link commissions to payout
    const commissionIds = commissionsResult.rows.map(c => c.id);
    if (commissionIds.length > 0) {
      await client.query(
        `UPDATE commissions SET payout_id = $1 WHERE id = ANY($2)`,
        [payout.id, commissionIds]
      );
    }

    // Deduct from wallet
    await client.query(
      `UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2`,
      [payoutAmount, userId]
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'payout_requested', 'payout', $2, $3)`,
      [userId, payout.id, JSON.stringify({ amount: payoutAmount, statementNumber })]
    );

    return {
      payout,
      commissions: commissionsResult.rows,
      vatInfo
    };
  });
};

/**
 * Approve payout (admin only)
 */
export const approvePayout = async (payoutId, approvedBy) => {
  return await transaction(async (client) => {
    const payoutResult = await client.query(
      `UPDATE payouts 
       SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = $1
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [approvedBy, payoutId]
    );

    if (payoutResult.rows.length === 0) {
      throw new Error('Payout not found or already processed');
    }

    const payout = payoutResult.rows[0];

    // Log activity
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'payout_approved', 'payout', $2, $3)`,
      [approvedBy, payoutId, JSON.stringify({ amount: payout.gross_amount })]
    );

    return payout;
  });
};

/**
 * Process approved payouts (batch SEPA)
 */
export const processPayouts = async () => {
  const result = await query(
    `SELECT p.*, u.email, u.first_name, u.last_name, u.company,
            u.country, u.vat_id, u.street, u.zip, u.city
     FROM payouts p
     JOIN users u ON p.user_id = u.id
     WHERE p.status = 'approved'
     ORDER BY p.approved_at ASC`
  );

  const payouts = result.rows;
  const processedPayouts = [];
  const sepaTransactions = [];

  for (const payout of payouts) {
    try {
      // Generate SEPA reference
      const sepaReference = `CLYR-${payout.statement_number}`;

      // Add to SEPA batch
      sepaTransactions.push({
        id: payout.id,
        name: payout.account_holder || `${payout.first_name} ${payout.last_name}`,
        iban: payout.iban,
        bic: payout.bic,
        amount: payout.gross_amount,
        reference: sepaReference,
        description: `CLYR Provision ${payout.statement_number}`
      });

      // Update payout status
      await query(
        `UPDATE payouts 
         SET status = 'processing', 
             processed_at = CURRENT_TIMESTAMP,
             sepa_reference = $1
         WHERE id = $2`,
        [sepaReference, payout.id]
      );

      processedPayouts.push(payout);
    } catch (error) {
      console.error(`Error processing payout ${payout.id}:`, error);
      
      await query(
        `UPDATE payouts 
         SET status = 'failed', 
             failure_reason = $1
         WHERE id = $2`,
        [error.message, payout.id]
      );
    }
  }

  return {
    processedCount: processedPayouts.length,
    sepaTransactions,
    // In production, you would generate actual SEPA XML here
    // and send it to your bank
  };
};

/**
 * Mark payout as completed
 */
export const completePayout = async (payoutId, transactionId = null) => {
  return await transaction(async (client) => {
    const payoutResult = await client.query(
      `UPDATE payouts 
       SET status = 'completed', 
           completed_at = CURRENT_TIMESTAMP,
           transaction_id = $1
       WHERE id = $2 AND status = 'processing'
       RETURNING *`,
      [transactionId, payoutId]
    );

    if (payoutResult.rows.length === 0) {
      throw new Error('Payout not found or not in processing status');
    }

    const payout = payoutResult.rows[0];

    // Update all linked commissions to paid
    await client.query(
      `UPDATE commissions 
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP
       WHERE payout_id = $1`,
      [payoutId]
    );

    // Update user's total paid out
    await client.query(
      `UPDATE users 
       SET total_paid_out = total_paid_out + $1
       WHERE id = $2`,
      [payout.gross_amount, payout.user_id]
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'payout_completed', 'payout', $2, $3)`,
      [payout.user_id, payoutId, JSON.stringify({ 
        amount: payout.gross_amount,
        transactionId 
      })]
    );

    return payout;
  });
};

/**
 * Record a payout that an administrator has paid outside Stripe (for example
 * by bank transfer or PayPal). Auto-created manual payouts are intentionally
 * left as `pending` until this action; no commission is marked paid merely
 * because an affiliate does not have Stripe Connect.
 */
export const completeManualPayout = async (payoutId, transactionReference, completedBy) => {
  const reference = String(transactionReference || '').trim();
  if (reference.length < 3) {
    throw new Error('A bank or PayPal transaction reference is required');
  }

  return transaction(async (client) => {
    const payoutResult = await client.query(
      `SELECT p.*, u.wallet_balance
       FROM payouts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1
       FOR UPDATE`,
      [payoutId]
    );
    if (payoutResult.rows.length === 0) throw new Error('Payout not found');

    const payout = payoutResult.rows[0];
    if (payout.status !== 'pending') {
      throw new Error('Only a pending manual payout can be completed here');
    }
    if (payout.stripe_transfer_id) {
      throw new Error('This payout has a Stripe transfer and cannot be completed manually');
    }

    // A manual payout must be prepared first. Preparing locks the precise
    // commission set to this payout, so newly earned commissions can never be
    // accidentally included when the administrator records the bank transfer.
    const commissionsResult = await client.query(
      `SELECT id, amount
       FROM commissions
       WHERE user_id = $1
         AND status = 'released'
         AND payout_id = $2
         AND type <> 'bonus_pool'
       ORDER BY created_at ASC
       FOR UPDATE`,
      [payout.user_id, payoutId]
    );
    const netAmount = commissionsResult.rows.reduce((total, commission) => total + Number(commission.amount), 0);
    if (Math.abs(netAmount - Number(payout.net_amount)) > 0.01) {
      throw new Error('The released commission total has changed. Create a new manual payout before recording payment.');
    }
    if (commissionsResult.rows.length === 0) {
      throw new Error('No released commissions are available for this payout');
    }

    const commissionIds = commissionsResult.rows.map((commission) => commission.id);
    await client.query(
      `UPDATE commissions
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payout_id = $1
       WHERE id = ANY($2)`,
      [payoutId, commissionIds]
    );
    await client.query(
      `UPDATE payouts
       SET status = 'completed', method = 'manual', transaction_id = $1,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [reference, payoutId]
    );
    await client.query(
      `UPDATE users
       SET wallet_balance = GREATEST(0, wallet_balance - $1),
           total_paid_out = COALESCE(total_paid_out, 0) + $2
       WHERE id = $3`,
      [payout.net_amount, payout.gross_amount, payout.user_id]
    );
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'manual_payout_completed', 'payout', $2, $3)`,
      [completedBy, payoutId, JSON.stringify({
        netAmount: payout.net_amount,
        grossAmount: payout.gross_amount,
        transactionReference: reference,
        commissionCount: commissionIds.length,
      })]
    );

    return { ...payout, status: 'completed', method: 'manual', transaction_id: reference };
  });
};

/**
 * Consolidate stale automatic pending rows into one manual payout and reserve
 * the exact released commissions. No money is sent by this operation.
 */
export const prepareManualPayout = async (payoutId, preparedBy) => {
  const statementNumber = await generateStatementNumber();
  return transaction(async (client) => {
    const sourceResult = await client.query(
      `SELECT p.*, u.country, u.vat_id, u.first_name, u.last_name, u.iban, u.bic, u.account_holder
       FROM payouts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1
       FOR UPDATE`,
      [payoutId]
    );
    if (sourceResult.rows.length === 0) throw new Error('Payout not found');
    const source = sourceResult.rows[0];
    if (source.status !== 'pending' || source.stripe_transfer_id) {
      throw new Error('Only a pending payout without a Stripe transfer can be prepared manually');
    }

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`manual-payout-${source.user_id}`]);

    const existingManual = await client.query(
      `SELECT * FROM payouts
       WHERE user_id = $1 AND status = 'pending' AND method = 'manual'
       LIMIT 1
       FOR UPDATE`,
      [source.user_id]
    );
    if (existingManual.rows.length > 0) return existingManual.rows[0];

    const commissionsResult = await client.query(
      `SELECT id, amount, created_at
       FROM commissions
       WHERE user_id = $1 AND status = 'released' AND payout_id IS NULL
         AND type <> 'bonus_pool'
       ORDER BY created_at ASC
       FOR UPDATE`,
      [source.user_id]
    );
    if (commissionsResult.rows.length === 0) {
      throw new Error('No released commissions are available for a manual payout');
    }

    const netAmount = commissionsResult.rows.reduce((total, commission) => total + Number(commission.amount), 0);
    const vatInfo = calculateCommissionVAT(source, netAmount);
    const firstCommission = commissionsResult.rows[0].created_at;
    const lastCommission = commissionsResult.rows[commissionsResult.rows.length - 1].created_at;
    const reference = `MANUAL-${new Date().toISOString().slice(0, 10)}-${source.user_id.slice(0, 8)}`;
    const payoutResult = await client.query(
      `INSERT INTO payouts (
         user_id, net_amount, vat_amount, gross_amount, method, status,
         iban, bic, account_holder, reference, statement_number, period_start, period_end
       ) VALUES ($1, $2, $3, $4, 'manual', 'pending', $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        source.user_id, netAmount, vatInfo.vatAmount, vatInfo.grossAmount,
        source.iban, source.bic, source.account_holder,
        reference, statementNumber,
        new Date(firstCommission).toISOString().slice(0, 10),
        new Date(lastCommission).toISOString().slice(0, 10),
      ]
    );
    const payout = payoutResult.rows[0];
    await client.query(
      `UPDATE commissions SET payout_id = $1 WHERE id = ANY($2)`,
      [payout.id, commissionsResult.rows.map((commission) => commission.id)]
    );
    // These rows never moved money and never reserved a wallet balance. They
    // are superseded only to keep the audit trail and avoid showing duplicates.
    await client.query(
      `UPDATE payouts
       SET status = 'cancelled', failure_reason = 'Superseded by consolidated manual payout ' || $2
       WHERE user_id = $1 AND status = 'pending' AND method = 'sepa'
         AND stripe_transfer_id IS NULL`,
      [source.user_id, payout.reference]
    );
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'manual_payout_prepared', 'payout', $2, $3)`,
      [preparedBy, payout.id, JSON.stringify({
        netAmount,
        grossAmount: vatInfo.grossAmount,
        commissionCount: commissionsResult.rows.length,
        sourcePayoutId: source.id,
      })]
    );
    return payout;
  });
};

/**
 * Get payout history for partner
 */
export const getPartnerPayoutHistory = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) FROM payouts WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countResult.rows[0].count);

  const payoutsResult = await query(
    `SELECT * FROM payouts 
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    payouts: payoutsResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get pending payouts for admin
 */
export const getPendingPayouts = async () => {
  const result = await query(
    `SELECT p.*, 
            u.email, u.first_name, u.last_name, u.company,
            u.country, u.vat_id
     FROM payouts p
     JOIN users u ON p.user_id = u.id
     WHERE p.status IN ('pending', 'approved')
     ORDER BY p.created_at ASC`
  );

  return result.rows;
};

/**
 * Generate commission statement PDF for a payout
 */
export const generatePayoutStatement = async (payoutId) => {
  const payoutResult = await query(
    `SELECT p.*, 
            u.email, u.first_name, u.last_name, u.company,
            u.country, u.vat_id, u.is_kleinunternehmer,
            u.street, u.zip, u.city, u.iban
     FROM payouts p
     JOIN users u ON p.user_id = u.id
     WHERE p.id = $1`,
    [payoutId]
  );

  if (payoutResult.rows.length === 0) {
    throw new Error('Payout not found');
  }

  const payout = payoutResult.rows[0];

  // Get commissions for this payout
  const commissionsResult = await query(
    `SELECT c.*, o.order_number,
            NULLIF(TRIM(CONCAT(COALESCE(o.customer_first_name, ''), ' ', COALESCE(o.customer_last_name, ''))), '') as customer_name
     FROM commissions c
     LEFT JOIN orders o ON c.order_id = o.id
     WHERE c.payout_id = $1
       AND c.type <> 'bonus_pool'
     ORDER BY c.created_at ASC`,
    [payoutId]
  );

  const parseDateSafe = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };
  const hasPlausibleYear = (d) => d && d.getFullYear() >= 2020;

  const periodStart = parseDateSafe(payout.period_start);
  const periodEnd = parseDateSafe(payout.period_end);
  const createdAt = parseDateSafe(payout.created_at);
  const periodBaseDate = hasPlausibleYear(periodStart)
    ? periodStart
    : hasPlausibleYear(periodEnd)
      ? periodEnd
      : createdAt || new Date();
  const periodLabel = periodBaseDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  // Generate PDF
  const pdfBuffer = await generateCommissionStatement(
    payout, 
    commissionsResult.rows, 
    periodLabel,
    payout
  );

  return {
    pdfBuffer,
    filename: `Provisionsabrechnung-${payout.statement_number}.pdf`
  };
};

/**
 * Cancel payout request
 */
export const cancelPayout = async (payoutId, reason, cancelledBy) => {
  return await transaction(async (client) => {
    const payoutResult = await client.query(
      `SELECT * FROM payouts WHERE id = $1 AND status IN ('pending', 'approved')`,
      [payoutId]
    );

    if (payoutResult.rows.length === 0) {
      throw new Error('Payout not found or cannot be cancelled');
    }

    const payout = payoutResult.rows[0];

    // Update payout status
    await client.query(
      `UPDATE payouts 
       SET status = 'cancelled', 
           failure_reason = $1
       WHERE id = $2`,
      [reason, payoutId]
    );

    // A partner-requested payout reserves commissions and removes the wallet
    // balance. Auto-created manual pending payouts do neither, so restoring
    // the balance unconditionally would inflate it when an admin cancels one.
    const linkedCommissionsResult = await client.query(
      `SELECT COUNT(*)::int AS count FROM commissions WHERE payout_id = $1`,
      [payoutId]
    );
    const hasLinkedCommissions = linkedCommissionsResult.rows[0].count > 0;

    // Unlink commissions
    await client.query(
      `UPDATE commissions 
       SET payout_id = NULL
       WHERE payout_id = $1`,
      [payoutId]
    );

    // Restore wallet balance
    if (hasLinkedCommissions) {
      await client.query(
        `UPDATE users
         SET wallet_balance = wallet_balance + $1
         WHERE id = $2`,
        [payout.net_amount, payout.user_id]
      );
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'payout_cancelled', 'payout', $2, $3)`,
      [cancelledBy, payoutId, JSON.stringify({ reason, amount: payout.gross_amount })]
    );

    return payout;
  });
};

/**
 * Run monthly payout cycle (cron job)
 */
export const runMonthlyPayoutCycle = async () => {
  console.log('Starting monthly payout cycle...');

  // Get all eligible partners
  const eligiblePartners = await getEligiblePayouts();
  console.log(`Found ${eligiblePartners.length} eligible partners`);

  const results = {
    requested: 0,
    errors: []
  };

  for (const partner of eligiblePartners) {
    try {
      await createPayoutRequest(partner.id);
      results.requested++;
    } catch (error) {
      results.errors.push({
        partnerId: partner.id,
        email: partner.email,
        error: error.message
      });
    }
  }

  console.log(`Payout cycle complete: ${results.requested} payouts requested, ${results.errors.length} errors`);
  return results;
};
