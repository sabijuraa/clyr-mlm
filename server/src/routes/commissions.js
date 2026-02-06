const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const RANK_PERCENTAGES = { 1: 8, 2: 19, 3: 21, 4: 25, 5: 28, 6: 31, 7: 36 };

// Calculate and create commissions for an order
async function calculateCommissions(orderId) {
  const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!order.rows[0] || !order.rows[0].partner_id) return;
  
  const o = order.rows[0];
  const netAmount = parseFloat(o.subtotal) / (1 + parseFloat(o.tax_rate) / 100);

  const sellingPartner = await db.query('SELECT * FROM partners WHERE id = $1', [o.partner_id]);
  if (!sellingPartner.rows[0]) return;

  const sp = sellingPartner.rows[0];
  const directPercent = RANK_PERCENTAGES[sp.rank_id] || 8;
  const directAmount = netAmount * (directPercent / 100);
  
  // Direct sale commission — ALWAYS paid
  await db.query(`
    INSERT INTO commission_transactions (partner_id, order_id, type, amount, percentage, description, status)
    VALUES ($1, $2, 'direct_sale', $3, $4, $5, 'pending')`,
    [sp.id, orderId, directAmount, directPercent, `Direktprovision Bestellung ${o.order_number}`]
  );
  // Update partner earnings + sales count
  await db.query(
    'UPDATE partners SET personal_sales_count = personal_sales_count + 1, total_commission_earned = total_commission_earned + $1, last_sale_at = NOW() WHERE id = $2',
    [directAmount, sp.id]
  );

  // Difference commissions up the chain (NO 50% admin override!)
  let currentPartnerId = sp.sponsor_id;
  let lastPercent = directPercent;
  let depth = 0;

  while (currentPartnerId && depth < 7) {
    const upline = await db.query('SELECT * FROM partners WHERE id = $1 AND is_active = true', [currentPartnerId]);
    if (!upline.rows[0]) break;

    const up = upline.rows[0];
    const upPercent = RANK_PERCENTAGES[up.rank_id] || 8;
    
    // Check activity: 2+ sales per quarter for team commission
    const quarterSales = await db.query(
      `SELECT COUNT(*) FROM orders WHERE partner_id = $1 AND payment_status = 'paid' AND created_at > NOW() - INTERVAL '3 months'`,
      [up.id]
    );
    const isActive = parseInt(quarterSales.rows[0].count) >= 2 || up.rank_id >= 7;

    if (isActive && upPercent > lastPercent) {
      const diffPercent = upPercent - lastPercent;
      const diffAmount = netAmount * (diffPercent / 100);
      
      await db.query(`
        INSERT INTO commission_transactions (partner_id, order_id, type, amount, percentage, description, status)
        VALUES ($1, $2, 'difference', $3, $4, $5, 'pending')`,
        [up.id, orderId, diffAmount, diffPercent, `Differenzprovision Bestellung ${o.order_number} (Stufe ${depth + 1})`]
      );
      // Update earnings
      await db.query(
        'UPDATE partners SET total_commission_earned = total_commission_earned + $1 WHERE id = $2',
        [diffAmount, up.id]
      );
      lastPercent = upPercent; // Only update lastPercent when commission is paid
    }
    // If inactive: do NOT update lastPercent — difference passes through to next active upline
    // But do NOT increment team_sales_count for inactive uplines

    if (isActive) {
      await db.query('UPDATE partners SET team_sales_count = team_sales_count + 1 WHERE id = $1', [up.id]);
    }
    
    currentPartnerId = up.sponsor_id;
    depth++;
  }

  // Leadership bonus: 1% of net to highest-rank active upline in chain
  // Team volume bonus: 1% of net split among R4+ uplines
  await calculateBonuses(orderId, netAmount, sp.sponsor_id);

  // Check for automatic rank promotions
  await checkRankPromotions(sp.id);
}

// Leadership bonus (1%) + Team volume bonus (1%)
async function calculateBonuses(orderId, netAmount, startSponsorId) {
  const leadershipAmount = netAmount * 0.01;
  const teamVolumeAmount = netAmount * 0.01;
  
  // Find R4+ partners in upline for leadership/team bonus
  let currentId = startSponsorId;
  let highestRankPartnerId = null;
  let highestRank = 0;
  const r4PlusPartners = [];
  let depth = 0;

  while (currentId && depth < 7) {
    const p = await db.query('SELECT * FROM partners WHERE id = $1 AND is_active = true', [currentId]);
    if (!p.rows[0]) break;
    const partner = p.rows[0];
    
    if (partner.rank_id >= 4) {
      r4PlusPartners.push(partner);
      if (partner.rank_id > highestRank) {
        highestRank = partner.rank_id;
        highestRankPartnerId = partner.id;
      }
    }
    currentId = partner.sponsor_id;
    depth++;
  }

  // Leadership bonus to highest-rank upline
  if (highestRankPartnerId) {
    const order = await db.query('SELECT order_number FROM orders WHERE id=$1', [orderId]);
    await db.query(`
      INSERT INTO commission_transactions (partner_id, order_id, type, amount, percentage, description, status)
      VALUES ($1, $2, 'leadership_bonus', $3, 1, $4, 'pending')`,
      [highestRankPartnerId, orderId, leadershipAmount, `Leadership Bonus Bestellung ${order.rows[0]?.order_number}`]
    );
    await db.query('UPDATE partners SET total_commission_earned = total_commission_earned + $1 WHERE id = $2', [leadershipAmount, highestRankPartnerId]);
  }

  // Team volume bonus split among R4+ uplines
  if (r4PlusPartners.length > 0) {
    const share = teamVolumeAmount / r4PlusPartners.length;
    const order = await db.query('SELECT order_number FROM orders WHERE id=$1', [orderId]);
    for (const partner of r4PlusPartners) {
      await db.query(`
        INSERT INTO commission_transactions (partner_id, order_id, type, amount, percentage, description, status)
        VALUES ($1, $2, 'team_volume_bonus', $3, 1, $4, 'pending')`,
        [partner.id, orderId, share, `Team Volume Bonus Bestellung ${order.rows[0]?.order_number}`]
      );
      await db.query('UPDATE partners SET total_commission_earned = total_commission_earned + $1 WHERE id = $2', [share, partner.id]);
    }
  }
}

// Automatic rank promotion
async function checkRankPromotions(partnerId) {
  const partner = await db.query('SELECT * FROM partners WHERE id = $1', [partnerId]);
  if (!partner.rows[0]) return;
  const p = partner.rows[0];
  const currentRank = p.rank_id;

  // R1→R2: 1+ personal sales
  // R2→R3: 11+ personal sales
  // R3→R4: 5+ personal AND 15 team/month x 3 months
  // R4→R5: 30 team/month x 3 months
  // R5→R6: 50 team/month x 3 months
  // R7: Theresa only — no auto promotion
  let newRank = currentRank;

  if (currentRank < 2 && p.personal_sales_count >= 1) newRank = 2;
  if (currentRank < 3 && p.personal_sales_count >= 11) newRank = 3;

  if (currentRank < 4 && p.personal_sales_count >= 5) {
    // Check 15 team sales/month for 3 consecutive months
    const monthlyTeam = await db.query(`
      SELECT DATE_TRUNC('month', o.created_at) as month, COUNT(*) as cnt
      FROM orders o JOIN partners tp ON o.partner_id = tp.id
      WHERE tp.sponsor_id = $1 AND o.payment_status = 'paid' AND o.created_at > NOW() - INTERVAL '3 months'
      GROUP BY month ORDER BY month DESC LIMIT 3`, [partnerId]);
    if (monthlyTeam.rows.length >= 3 && monthlyTeam.rows.every(r => parseInt(r.cnt) >= 15)) newRank = 4;
  }

  if (currentRank < 5) {
    const monthlyTeam = await db.query(`
      SELECT DATE_TRUNC('month', o.created_at) as month, COUNT(*) as cnt
      FROM orders o JOIN partners tp ON o.partner_id = tp.id
      WHERE tp.sponsor_id = $1 AND o.payment_status = 'paid' AND o.created_at > NOW() - INTERVAL '3 months'
      GROUP BY month ORDER BY month DESC LIMIT 3`, [partnerId]);
    if (monthlyTeam.rows.length >= 3 && monthlyTeam.rows.every(r => parseInt(r.cnt) >= 30)) newRank = 5;
  }

  if (currentRank < 6) {
    const monthlyTeam = await db.query(`
      SELECT DATE_TRUNC('month', o.created_at) as month, COUNT(*) as cnt
      FROM orders o JOIN partners tp ON o.partner_id = tp.id
      WHERE tp.sponsor_id = $1 AND o.payment_status = 'paid' AND o.created_at > NOW() - INTERVAL '3 months'
      GROUP BY month ORDER BY month DESC LIMIT 3`, [partnerId]);
    if (monthlyTeam.rows.length >= 3 && monthlyTeam.rows.every(r => parseInt(r.cnt) >= 50)) newRank = 6;
  }

  // Apply promotion
  if (newRank > currentRank && newRank < 7) {
    await db.query('UPDATE partners SET rank_id = $1, rank_achieved_at = NOW() WHERE id = $2', [newRank, partnerId]);
    await db.query(
      'INSERT INTO rank_history (partner_id, old_rank_id, new_rank_id, reason) VALUES ($1,$2,$3,$4)',
      [partnerId, currentRank, newRank, 'Automatische Beförderung']
    );
    // One-time rank bonus
    const rank = await db.query('SELECT one_time_bonus FROM ranks WHERE id = $1', [newRank]);
    const bonus = parseFloat(rank.rows[0]?.one_time_bonus || 0);
    if (bonus > 0) {
      await db.query(`
        INSERT INTO commission_transactions (partner_id, type, amount, percentage, description, status)
        VALUES ($1, 'rank_bonus', $2, 0, $3, 'pending')`,
        [partnerId, bonus, `Rang-Bonus: Aufstieg zu ${newRank === 4 ? 'Teamleiter' : newRank === 5 ? 'Manager' : 'Sales Manager'}`]
      );
      await db.query('UPDATE partners SET total_commission_earned = total_commission_earned + $1 WHERE id = $2', [bonus, partnerId]);
    }
  }
}

// GET my commissions
router.get('/my', authenticate, requireRole('partner', 'admin'), async (req, res) => {
  try {
    const partnerId = req.partner?.id;
    if (!partnerId) return res.status(400).json({ error: 'Partner nicht gefunden' });
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE ct.partner_id = $1';
    const params = [partnerId];
    if (status) { params.push(status); where += ` AND ct.status = $${params.length}`; }

    const countResult = await db.query(`SELECT COUNT(*) FROM commission_transactions ct ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await db.query(`
      SELECT ct.*, o.order_number FROM commission_transactions ct
      LEFT JOIN orders o ON ct.order_id = o.id ${where}
      ORDER BY ct.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);

    const summary = await db.query(`
      SELECT COALESCE(SUM(amount),0) as total_earned,
        COALESCE(SUM(CASE WHEN status='pending' THEN amount END),0) as total_pending,
        COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) as total_paid
      FROM commission_transactions WHERE partner_id = $1`, [partnerId]);

    res.json({
      commissions: result.rows,
      summary: summary.rows[0],
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: update commission status
router.put('/:id/status', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const paidAt = status === 'paid' ? 'NOW()' : 'NULL';
    const result = await db.query(
      `UPDATE commission_transactions SET status = $1, paid_at = ${paidAt}, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: bulk approve
router.post('/bulk-approve', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await db.query("UPDATE commission_transactions SET status = 'approved' WHERE status = 'pending' RETURNING id");
    res.json({ approved: result.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.calculateCommissions = calculateCommissions;
