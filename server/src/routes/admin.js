const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

// Dashboard stats
router.get('/dashboard', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='customer') as total_customers,
        (SELECT COUNT(*) FROM users WHERE role='partner') as total_partners,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM orders WHERE status='pending') as pending_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status='paid') as total_revenue,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status='paid' AND created_at > NOW() - INTERVAL '30 days') as monthly_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM commission_transactions WHERE status='pending') as pending_commissions,
        (SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '7 days') as weekly_orders
    `);
    const recentOrders = await db.query(`
      SELECT o.order_number, o.total, o.status, o.payment_status, o.created_at, u.first_name, u.last_name
      FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 10`);
    const topPartners = await db.query(`
      SELECT p.referral_code, u.first_name, u.last_name, r.name_de as rank_name, p.personal_sales_count, p.total_commission_earned
      FROM partners p JOIN users u ON p.user_id = u.id JOIN ranks r ON p.rank_id = r.id
      ORDER BY p.personal_sales_count DESC LIMIT 5`);
    res.json({ stats: stats.rows[0], recentOrders: recentOrders.rows, topPartners: topPartners.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manage users
router.get('/users', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    let query = 'SELECT id, email, first_name, last_name, phone, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    if (role) { params.push(role); query += ` AND role = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`; }
    query += ' ORDER BY created_at DESC';
    params.push(parseInt(limit)); query += ` LIMIT $${params.length}`;
    params.push((parseInt(page)-1) * parseInt(limit)); query += ` OFFSET $${params.length}`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle user active status
router.put('/users/:id/toggle', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query('UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, is_active', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update partner rank
router.put('/partners/:partnerId/rank', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { rankId } = req.body;
    const partner = await db.query('SELECT rank_id FROM partners WHERE id = $1', [req.params.partnerId]);
    if (!partner.rows[0]) return res.status(404).json({ error: 'Partner nicht gefunden' });
    
    await db.query('INSERT INTO rank_history (partner_id, old_rank_id, new_rank_id, reason) VALUES ($1,$2,$3,$4)',
      [req.params.partnerId, partner.rows[0].rank_id, rankId, 'Admin-Änderung']);
    const result = await db.query('UPDATE partners SET rank_id = $1, rank_achieved_at = NOW() WHERE id = $2 RETURNING *', [rankId, req.params.partnerId]);
    
    // Check for one-time bonus
    const rank = await db.query('SELECT * FROM ranks WHERE id = $1', [rankId]);
    if (rank.rows[0]?.one_time_bonus > 0) {
      const existingBonus = await db.query(
        "SELECT id FROM commission_transactions WHERE partner_id = $1 AND type = 'rank_bonus' AND description LIKE $2",
        [req.params.partnerId, `%${rank.rows[0].name_de}%`]
      );
      if (!existingBonus.rows.length) {
        await db.query(
          "INSERT INTO commission_transactions (partner_id, type, amount, description, status) VALUES ($1, 'rank_bonus', $2, $3, 'pending')",
          [req.params.partnerId, rank.rows[0].one_time_bonus, `Rangbonus: ${rank.rows[0].name_de}`]
        );
      }
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all partners with details
router.get('/partners', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, u.first_name, u.last_name, u.email, u.phone, r.name_de as rank_name, r.commission_percent,
        (SELECT COUNT(*) FROM partners sub WHERE sub.sponsor_id = p.id) as direct_recruits,
        (SELECT u2.first_name || ' ' || u2.last_name FROM partners sp JOIN users u2 ON sp.user_id = u2.id WHERE sp.id = p.sponsor_id) as sponsor_name
      FROM partners p JOIN users u ON p.user_id = u.id JOIN ranks r ON p.rank_id = r.id
      ORDER BY p.created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all commissions (admin view)
router.get('/commissions', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ct.*, u.first_name, u.last_name, p.referral_code
      FROM commission_transactions ct JOIN partners p ON ct.partner_id = p.id JOIN users u ON p.user_id = u.id`;
    const params = [];
    if (status) { params.push(status); query += ` WHERE ct.status = $${params.length}`; }
    query += ' ORDER BY ct.created_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
