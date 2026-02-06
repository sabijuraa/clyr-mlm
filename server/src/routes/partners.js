const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

// Get partner dashboard data
router.get('/dashboard', authenticate, requireRole('partner', 'admin'), async (req, res) => {
  try {
    const partner = await db.query(`
      SELECT p.*, r.name_de as rank_name, r.commission_percent, u.first_name, u.last_name, u.email
      FROM partners p JOIN ranks r ON p.rank_id = r.id JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1`, [req.user.id]);
    if (!partner.rows[0]) return res.status(404).json({ error: 'Partner nicht gefunden' });

    const pid = partner.rows[0].id;
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE partner_id = $1 AND payment_status = 'paid') as total_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE partner_id = $1 AND payment_status = 'paid') as total_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM commission_transactions WHERE partner_id = $1 AND status != 'cancelled') as total_commission,
        (SELECT COALESCE(SUM(amount), 0) FROM commission_transactions WHERE partner_id = $1 AND status = 'pending') as pending_commission,
        (SELECT COUNT(*) FROM partners WHERE sponsor_id = $1) as direct_recruits
    `, [pid]);

    const recentOrders = await db.query(`
      SELECT o.order_number, o.total, o.status, o.created_at, u.first_name, u.last_name
      FROM orders o JOIN users u ON o.user_id = u.id
      WHERE o.partner_id = $1 ORDER BY o.created_at DESC LIMIT 5`, [pid]);

    const recentCommissions = await db.query(`
      SELECT * FROM commission_transactions WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 10`, [pid]);

    // Add quarterly activity check
    const quarterlySales = await db.query(
      `SELECT COUNT(*) FROM orders WHERE partner_id = $1 AND payment_status = 'paid' AND created_at > NOW() - INTERVAL '3 months'`,
      [pid]
    );

    // Merge partner data with stats for client convenience
    const mergedStats = {
      ...stats.rows[0],
      personal_sales_count: partner.rows[0].personal_sales_count,
      team_sales_count: partner.rows[0].team_sales_count,
      total_commission_earned: partner.rows[0].total_commission_earned,
      rank_name: partner.rows[0].rank_name,
      rank_percentage: partner.rows[0].commission_percent,
      quarterly_sales_count: parseInt(quarterlySales.rows[0].count),
    };

    res.json({ partner: partner.rows[0], stats: mergedStats, recentOrders: recentOrders.rows, recentCommissions: recentCommissions.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get team tree
router.get('/team', authenticate, requireRole('partner', 'admin'), async (req, res) => {
  try {
    const partner = await db.query('SELECT id FROM partners WHERE user_id = $1', [req.user.id]);
    if (!partner.rows[0]) return res.status(404).json({ error: 'Partner nicht gefunden' });

    const team = await db.query(`
      WITH RECURSIVE team AS (
        SELECT p.id, p.user_id, p.sponsor_id, p.rank_id, p.personal_sales_count, p.referral_code, 0 as depth
        FROM partners p WHERE p.sponsor_id = $1
        UNION ALL
        SELECT p.id, p.user_id, p.sponsor_id, p.rank_id, p.personal_sales_count, p.referral_code, t.depth + 1
        FROM partners p JOIN team t ON p.sponsor_id = t.id WHERE t.depth < 7
      )
      SELECT t.*, u.first_name, u.last_name, u.email, r.name_de as rank_name
      FROM team t JOIN users u ON t.user_id = u.id JOIN ranks r ON t.rank_id = r.id
      ORDER BY t.depth, u.last_name`, [partner.rows[0].id]);

    res.json(team.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update partner profile
router.put('/profile', authenticate, requireRole('partner', 'admin'), async (req, res) => {
  try {
    const { taxId, companyName, iban, bic, phone } = req.body;
    if (phone) await db.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, req.user.id]);
    const result = await db.query(`
      UPDATE partners SET tax_id=COALESCE($1,tax_id), company_name=COALESCE($2,company_name),
        iban=COALESCE($3,iban), bic=COALESCE($4,bic), updated_at=NOW()
      WHERE user_id=$5 RETURNING *`, [taxId, companyName, iban, bic, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validate referral code (public)
router.get('/validate/:code', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.referral_code, u.first_name FROM partners p JOIN users u ON p.user_id = u.id
      WHERE p.referral_code = $1 AND p.is_active = true`, [req.params.code.toUpperCase()]);
    if (!result.rows[0]) return res.status(404).json({ valid: false });
    res.json({ valid: true, partnerName: result.rows[0].first_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all ranks (public)
router.get('/ranks/all', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ranks ORDER BY sort_order');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
