// server/src/controllers/compliance.controller.js
// GROUP 10: Legal Compliance & Contract Rules
import { query } from '../config/database.js';

// ========================================
// #50: TERMINATION (3-month notice)
// ========================================

// Partner: Request termination
export const requestTermination = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    // Check for existing pending request
    const existing = await query(
      "SELECT id FROM termination_requests WHERE user_id = $1 AND status = 'pending'",
      [userId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Es liegt bereits eine Kuendigungsanfrage vor.' });
    }

    // 3-month notice period
    const now = new Date();
    const effectiveDate = new Date(now);
    effectiveDate.setMonth(effectiveDate.getMonth() + 3);

    await query(`
      INSERT INTO termination_requests (user_id, effective_date, reason, requested_by)
      VALUES ($1, $2, $3, 'partner')
    `, [userId, effectiveDate, reason || null]);

    await query(`
      UPDATE users SET termination_requested_at = NOW(), termination_effective_at = $1, termination_reason = $2
      WHERE id = $3
    `, [effectiveDate, reason, userId]);

    res.json({
      message: `Kuendigung eingereicht. Wirksam ab ${effectiveDate.toLocaleDateString('de-DE')} (3 Monate Kuendigungsfrist).`,
      effectiveDate
    });
  } catch (error) {
    console.error('Request termination error:', error);
    res.status(500).json({ error: 'Kuendigung konnte nicht eingereicht werden' });
  }
};

// Partner: Get termination status
export const getTerminationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(`
      SELECT tr.*, u.termination_requested_at, u.termination_effective_at
      FROM termination_requests tr
      JOIN users u ON u.id = tr.user_id
      WHERE tr.user_id = $1
      ORDER BY tr.created_at DESC LIMIT 1
    `, [userId]);

    res.json({ termination: result.rows[0] || null });
  } catch (error) {
    console.error('Get termination status error:', error);
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
};

// Admin: Process termination
export const processTermination = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const result = await query(`
      UPDATE termination_requests SET status = $1, notes = $2, processed_by = $3, processed_at = NOW()
      WHERE id = $4 RETURNING *
    `, [status, notes, req.user.id, id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });

    // If completed, set user to inactive
    if (status === 'completed') {
      await query("UPDATE users SET status = 'inactive' WHERE id = $1", [result.rows[0].user_id]);
    }

    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Process termination error:', error);
    res.status(500).json({ error: 'Fehler' });
  }
};

// Admin: Get all termination requests
export const getTerminationRequests = async (req, res) => {
  try {
    const result = await query(`
      SELECT tr.*, u.first_name, u.last_name, u.email
      FROM termination_requests tr
      JOIN users u ON u.id = tr.user_id
      ORDER BY tr.created_at DESC
    `);
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get terminations error:', error);
    res.status(500).json({ error: 'Fehler' });
  }
};

// ========================================
// #55: INTRANET FEE TRACKING (EUR 100/year)
// ========================================

// Partner: Get fee status
export const getIntranetFeeStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await query(
      'SELECT intranet_fee_paid_until, intranet_fee_last_payment, intranet_fee_amount FROM users WHERE id = $1',
      [userId]
    );
    const payments = await query(
      'SELECT * FROM intranet_fee_payments WHERE user_id = $1 ORDER BY period_end DESC LIMIT 5',
      [userId]
    );

    const paidUntil = user.rows[0]?.intranet_fee_paid_until;
    const isActive = paidUntil && new Date(paidUntil) > new Date();

    res.json({
      feeAmount: user.rows[0]?.intranet_fee_amount || 100,
      paidUntil,
      isActive,
      lastPayment: user.rows[0]?.intranet_fee_last_payment,
      payments: payments.rows
    });
  } catch (error) {
    console.error('Get intranet fee error:', error);
    res.status(500).json({ error: 'Fehler' });
  }
};

// Admin: Record fee payment
export const recordFeePayment = async (req, res) => {
  try {
    const { userId, amount, periodStart, periodEnd, paymentMethod, notes } = req.body;

    await query(`
      INSERT INTO intranet_fee_payments (user_id, amount, period_start, period_end, payment_method, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, amount || 100, periodStart, periodEnd, paymentMethod || 'manual', notes]);

    await query(`
      UPDATE users SET 
        intranet_fee_paid_until = $1, 
        intranet_fee_last_payment = CURRENT_DATE,
        status = CASE WHEN status = 'inactive' THEN 'active' ELSE status END
      WHERE id = $2
    `, [periodEnd, userId]);

    res.json({ message: 'Zahlung erfasst' });
  } catch (error) {
    console.error('Record fee payment error:', error);
    res.status(500).json({ error: 'Fehler' });
  }
};

// Admin: Get overdue partners
export const getOverduePartners = async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.status,
             u.intranet_fee_paid_until, u.intranet_fee_last_payment
      FROM users u
      WHERE u.role = 'partner' AND u.status != 'inactive'
        AND (u.intranet_fee_paid_until IS NULL OR u.intranet_fee_paid_until < CURRENT_DATE)
      ORDER BY u.intranet_fee_paid_until ASC NULLS FIRST
    `);
    res.json({ partners: result.rows });
  } catch (error) {
    console.error('Get overdue partners error:', error);
    res.status(500).json({ error: 'Fehler' });
  }
};

// ========================================
// #57: INACTIVITY TERMINATION (12 months)
// ========================================

// Cron-callable: Flag inactive partners
export const flagInactivePartners = async () => {
  try {
    // Partners with no sales for 12 months
    const result = await query(`
      UPDATE users SET 
        status = 'inactive',
        auto_terminated_at = NOW(),
        inactivity_warning_sent_at = COALESCE(inactivity_warning_sent_at, NOW())
      WHERE role = 'partner' 
        AND status = 'active'
        AND auto_terminated_at IS NULL
        AND (
          (last_sale_at IS NOT NULL AND last_sale_at < NOW() - INTERVAL '12 months')
          OR (last_sale_at IS NULL AND created_at < NOW() - INTERVAL '12 months')
        )
      RETURNING id, first_name, last_name, email
    `);

    if (result.rows.length > 0) {
      console.log(`Inactivity termination: ${result.rows.length} partners flagged inactive after 12 months`);
    }
    return result.rows;
  } catch (error) {
    console.error('Flag inactive partners error:', error);
    return [];
  }
};

// Send warnings to partners approaching inactivity (at 10 months)
export const sendInactivityWarnings = async () => {
  try {
    const result = await query(`
      SELECT id, first_name, last_name, email, last_sale_at
      FROM users
      WHERE role = 'partner' AND status = 'active'
        AND inactivity_warning_sent_at IS NULL
        AND auto_terminated_at IS NULL
        AND (
          (last_sale_at IS NOT NULL AND last_sale_at < NOW() - INTERVAL '10 months')
          OR (last_sale_at IS NULL AND created_at < NOW() - INTERVAL '10 months')
        )
    `);

    // Mark warnings as sent
    for (const partner of result.rows) {
      await query('UPDATE users SET inactivity_warning_sent_at = NOW() WHERE id = $1', [partner.id]);
    }

    if (result.rows.length > 0) {
      console.log(`Inactivity warnings sent to ${result.rows.length} partners (10 months without sales)`);
    }
    return result.rows;
  } catch (error) {
    console.error('Send inactivity warnings error:', error);
    return [];
  }
};

// Admin: Get inactivity report
export const getInactivityReport = async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.status,
             u.last_sale_at, u.inactivity_warning_sent_at, u.auto_terminated_at,
             u.created_at,
             EXTRACT(DAYS FROM (NOW() - COALESCE(u.last_sale_at, u.created_at))) as days_inactive
      FROM users u
      WHERE u.role = 'partner'
        AND (
          u.auto_terminated_at IS NOT NULL
          OR u.inactivity_warning_sent_at IS NOT NULL  
          OR (u.last_sale_at IS NOT NULL AND u.last_sale_at < NOW() - INTERVAL '6 months')
          OR (u.last_sale_at IS NULL AND u.created_at < NOW() - INTERVAL '6 months')
        )
      ORDER BY days_inactive DESC
    `);
    res.json({ partners: result.rows });
  } catch (error) {
    console.error('Get inactivity report error:', error);
    res.status(500).json({ error: 'Fehler' });
  }
};
