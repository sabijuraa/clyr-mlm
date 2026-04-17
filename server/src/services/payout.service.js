import { query, transaction } from '../config/database.js';
import { generateCommissionStatement } from './invoice.service.js';

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
 * - German affiliates: Net commission (they always need VAT ID)
 * - Austrian with VAT ID: Net commission, Reverse Charge (0%)
 * - Austrian without VAT ID: Commission with VAT included (not separately declared)
 */

/**
 * Generate statement number
 */
const generateStatementNumber = async () => {
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
  // German affiliates: They always need VAT ID, no VAT on our side
  if (partner.country === 'DE') {
    return {
      vatRate: 0,
      vatAmount: 0,
      grossAmount: netAmount,
      vatType: 'reverse_charge',
      vatNote: 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfängers gem. §13b UStG'
    };
  }

  // Austrian with VAT ID: Reverse Charge
  if (partner.country === 'AT' && partner.vat_id) {
    return {
      vatRate: 0,
      vatAmount: 0,
      grossAmount: netAmount,
      vatType: 'reverse_charge',
      vatNote: 'Reverse Charge - Steuerschuldnerschaft des Leistungsempfängers'
    };
  }

  // Austrian without VAT ID (Kleinunternehmer): VAT exempt
  if (partner.country === 'AT' && !partner.vat_id) {
    if (partner.is_kleinunternehmer) {
      return {
        vatRate: 0,
        vatAmount: 0,
        grossAmount: netAmount,
        vatType: 'exempt',
        vatNote: 'Umsatzsteuerfrei gem. §6 Abs.1 Z 27 UStG (Kleinunternehmerregelung)'
      };
    } else {
      // Regular Austrian without VAT ID: Commission includes VAT (20%) but not separately declared
      // The commission amount is already the gross amount
      return {
        vatRate: 20,
        vatAmount: Math.round(netAmount * (20/120) * 100) / 100, // Extract VAT from gross
        grossAmount: netAmount,
        vatType: 'included',
        vatNote: 'Umsatzsteuer in der Provision enthalten'
      };
    }
  }

  // Swiss: No VAT
  if (partner.country === 'CH') {
    return {
      vatRate: 0,
      vatAmount: 0,
      grossAmount: netAmount,
      vatType: 'zero_rated',
      vatNote: 'Keine Umsatzsteuer (Schweiz)'
    };
  }

  // Default: No VAT
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
     WHERE u.role = 'partner'
     AND u.status = 'active'
     AND u.wallet_balance >= $1
     AND u.iban IS NOT NULL
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
       WHERE id = $1`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      throw new Error('Partner not found');
    }

    const partner = partnerResult.rows[0];

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
      `SELECT c.*, o.order_number
       FROM commissions c
       LEFT JOIN orders o ON c.order_id = o.id
       WHERE c.user_id = $1 
       AND c.status = 'released'
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
    `SELECT c.*, o.order_number
     FROM commissions c
     LEFT JOIN orders o ON c.order_id = o.id
     WHERE c.payout_id = $1
     ORDER BY c.created_at ASC`,
    [payoutId]
  );

  const period = `${payout.period_start.toLocaleDateString('de-DE')} - ${payout.period_end.toLocaleDateString('de-DE')}`;

  // Calculate VAT info
  const vatInfo = calculateCommissionVAT(payout, payout.net_amount);

  // Generate PDF
  const pdfBuffer = await generateCommissionStatement(
    payout, 
    commissionsResult.rows, 
    period,
    vatInfo
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

    // Unlink commissions
    await client.query(
      `UPDATE commissions 
       SET payout_id = NULL
       WHERE payout_id = $1`,
      [payoutId]
    );

    // Restore wallet balance
    await client.query(
      `UPDATE users 
       SET wallet_balance = wallet_balance + $1
       WHERE id = $2`,
      [payout.gross_amount, payout.user_id]
    );

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
