import { query, transaction } from '../config/database.js';

/**
 * CLYR Commission Service
 * 
 * Commission Structure:
 * - Admin (Theresa) gets 50% of all sales (paid from partner margin)
 * - Partners get 8-36% based on rank (direct commission)
 * - Uplines get difference commission (their rate - downline rate)
 * - Leadership Bonus: 1% if 3+ active direct partners
 * - Team Volume Bonus: 1% if team has 10+ sales/month
 * - Rank Bonuses: One-time bonuses for rank upgrades
 * 
 * Commission Statements:
 * - German affiliates: Net commission (they always need VAT ID)
 * - Austrian with VAT ID: Net commission, Reverse Charge
 * - Austrian without VAT ID: Commission includes VAT (not separately declared)
 */

/**
 * Calculate and create all commissions for an order
 */
export const calculateCommissions = async (client, orderId, partnerId, orderSubtotal) => {
  // Get settings
  const settingsResult = await client.query(
    "SELECT key, value FROM settings WHERE key IN ('admin_commission_rate', 'commission_hold_days')"
  );
  
  const settings = {};
  settingsResult.rows.forEach(row => {
    settings[row.key] = row.value;
  });

  const adminCommissionRate = settings.admin_commission_rate?.rate || 50;
  const holdDays = settings.commission_hold_days?.days || 14;

  const heldUntil = new Date();
  heldUntil.setDate(heldUntil.getDate() + holdDays);

  // Get partner with rank info
  const partnerResult = await client.query(
    `SELECT u.*, r.commission_rate, r.level as rank_level
     FROM users u
     JOIN ranks r ON u.rank_id = r.id
     WHERE u.id = $1`,
    [partnerId]
  );

  if (partnerResult.rows.length === 0) return;

  const partner = partnerResult.rows[0];
  const partnerCommissionRate = partner.commission_rate;

  const commissions = [];

  // 1. ADMIN COMMISSION (50% of all sales - paid from partner's perspective)
  const adminResult = await client.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );

  if (adminResult.rows.length > 0) {
    const adminId = adminResult.rows[0].id;
    const adminCommission = Math.round(orderSubtotal * (adminCommissionRate / 100) * 100) / 100;

    const adminCommissionResult = await client.query(
      `INSERT INTO commissions (user_id, order_id, type, amount, rate, base_amount, status, held_until, description)
       VALUES ($1, $2, 'admin', $3, $4, $5, 'held', $6, $7)
       RETURNING *`,
      [adminId, orderId, adminCommission, adminCommissionRate, orderSubtotal, heldUntil, 'Admin-Provision (50%)']
    );
    commissions.push(adminCommissionResult.rows[0]);
  }

  // 2. DIRECT COMMISSION for selling partner
  const directCommission = Math.round(orderSubtotal * (partnerCommissionRate / 100) * 100) / 100;

  const directCommissionResult = await client.query(
    `INSERT INTO commissions (user_id, order_id, type, amount, rate, base_amount, status, held_until, description)
     VALUES ($1, $2, 'direct', $3, $4, $5, 'held', $6, $7)
     RETURNING *`,
    [partnerId, orderId, directCommission, partnerCommissionRate, orderSubtotal, heldUntil, `Direkt-Provision (${partnerCommissionRate}%)`]
  );
  commissions.push(directCommissionResult.rows[0]);

  // 3. DIFFERENCE COMMISSION for uplines
  const differenceCommissions = await calculateDifferenceCommissions(
    client, orderId, partnerId, partnerCommissionRate, orderSubtotal, heldUntil
  );
  commissions.push(...differenceCommissions);

  // 4. Update partner's stats
  await client.query(
    `UPDATE users SET 
      own_sales_count = own_sales_count + 1,
      own_sales_volume = own_sales_volume + $1,
      quarterly_sales_count = quarterly_sales_count + 1
     WHERE id = $2`,
    [orderSubtotal, partnerId]
  );

  // 5. Update team stats for upline chain
  await updateTeamStats(client, partnerId, orderSubtotal);

  // 6. Check for rank upgrade
  await checkAndUpdateRank(partnerId);

  // 7. Check for leadership bonus
  await checkLeadershipBonus(client, partnerId);

  return commissions;
};

/**
 * Calculate difference commissions for upline chain
 * If upline is inactive, commission passes through to next active upline
 */
const calculateDifferenceCommissions = async (client, orderId, partnerId, sellerRate, orderSubtotal, heldUntil) => {
  let currentUserId = partnerId;
  let previousRate = sellerRate;
  let depth = 0;
  const maxDepth = 10;
  const commissions = [];

  while (depth < maxDepth) {
    // Get upline
    const uplineResult = await client.query(
      `SELECT u.id, u.upline_id, u.status, u.first_name, u.last_name, r.commission_rate, r.level
       FROM users u
       JOIN ranks r ON u.rank_id = r.id
       WHERE u.id = (SELECT upline_id FROM users WHERE id = $1)`,
      [currentUserId]
    );

    if (uplineResult.rows.length === 0) break;

    const upline = uplineResult.rows[0];

    // Check if upline is active (2+ sales per quarter)
    const isActive = await checkPartnerIsActive(client, upline.id);

    if (isActive && upline.commission_rate > previousRate) {
      // Calculate difference
      const differenceRate = upline.commission_rate - previousRate;
      const differenceCommission = Math.round(orderSubtotal * (differenceRate / 100) * 100) / 100;

      if (differenceCommission > 0) {
        const result = await client.query(
          `INSERT INTO commissions (user_id, order_id, type, amount, rate, base_amount, source_user_id, status, held_until, description)
           VALUES ($1, $2, 'difference', $3, $4, $5, $6, 'held', $7, $8)
           RETURNING *`,
          [
            upline.id, 
            orderId, 
            differenceCommission, 
            differenceRate, 
            orderSubtotal,
            partnerId, 
            heldUntil, 
            `Differenz-Provision (${differenceRate}%)`
          ]
        );
        commissions.push(result.rows[0]);

        // Update previousRate to this upline's rate
        previousRate = upline.commission_rate;
      }
    }

    // If upline is inactive, commission passes through - don't update previousRate
    // This means the next active upline gets the full difference from the original seller

    currentUserId = upline.id;
    depth++;

    // If we've reached the top rate (36%), no more difference possible
    if (upline.commission_rate >= 36) break;
  }

  return commissions;
};

/**
 * Update team sales stats for entire upline chain
 */
const updateTeamStats = async (client, partnerId, orderSubtotal) => {
  let currentUserId = partnerId;
  let depth = 0;
  const maxDepth = 20;

  while (depth < maxDepth) {
    const uplineResult = await client.query(
      'SELECT upline_id FROM users WHERE id = $1',
      [currentUserId]
    );

    if (!uplineResult.rows[0]?.upline_id) break;

    const uplineId = uplineResult.rows[0].upline_id;

    await client.query(
      `UPDATE users SET 
        team_sales_count = team_sales_count + 1,
        team_sales_volume = team_sales_volume + $1
       WHERE id = $2`,
      [orderSubtotal, uplineId]
    );

    currentUserId = uplineId;
    depth++;
  }
};

/**
 * Check if partner is active (2+ sales in current quarter)
 */
export const checkPartnerIsActive = async (client, userId) => {
  // Get current quarter start date
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

  const result = await client.query(
    `SELECT COUNT(*) as sales_count
     FROM orders o
     WHERE o.partner_id = $1
     AND o.created_at >= $2
     AND o.payment_status = 'paid'
     AND o.status NOT IN ('cancelled', 'refunded')`,
    [userId, quarterStart]
  );

  return parseInt(result.rows[0].sales_count) >= 2;
};

/**
 * Release held commissions (run daily via cron)
 */
export const releaseHeldCommissions = async () => {
  const result = await query(
    `UPDATE commissions
     SET status = 'released', released_at = CURRENT_TIMESTAMP
     WHERE status = 'held' AND held_until <= CURRENT_TIMESTAMP
     RETURNING *`
  );

  console.log(`Released ${result.rows.length} commissions`);

  // Update wallet balances
  for (const commission of result.rows) {
    await query(
      `UPDATE users SET 
        wallet_balance = wallet_balance + $1,
        total_earned = total_earned + $1
       WHERE id = $2`,
      [commission.amount, commission.user_id]
    );
  }

  return result.rows;
};

/**
 * Check for leadership bonus (1% if 3+ active direct partners)
 */
const checkLeadershipBonus = async (client, userId) => {
  // Count active direct partners
  const activeDirectResult = await client.query(
    `SELECT COUNT(*) as count FROM users 
     WHERE upline_id = $1 AND status = 'active'`,
    [userId]
  );

  const activeDirectCount = parseInt(activeDirectResult.rows[0].count);

  if (activeDirectCount >= 3) {
    // Calculate monthly team sales
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const teamSalesResult = await client.query(
      `SELECT SUM(o.subtotal) as total
       FROM orders o
       WHERE o.partner_id IN (
         SELECT id FROM users WHERE upline_id = $1
       )
       AND o.created_at >= $2
       AND o.payment_status = 'paid'`,
      [userId, monthStart]
    );

    const teamSales = parseFloat(teamSalesResult.rows[0].total) || 0;

    if (teamSales > 0) {
      const leadershipBonus = Math.round(teamSales * 0.01 * 100) / 100; // 1%

      // Check if already awarded this month
      const existingBonus = await client.query(
        `SELECT id FROM commissions 
         WHERE user_id = $1 AND type = 'leadership_bonus' 
         AND created_at >= $2`,
        [userId, monthStart]
      );

      if (existingBonus.rows.length === 0 && leadershipBonus > 0) {
        await client.query(
          `INSERT INTO commissions (user_id, type, amount, rate, status, description)
           VALUES ($1, 'leadership_bonus', $2, 1, 'released', $3)`,
          [userId, leadershipBonus, 'Leadership Bonus (1% Team-Umsatz)']
        );

        await client.query(
          'UPDATE users SET wallet_balance = wallet_balance + $1, total_earned = total_earned + $1 WHERE id = $2',
          [leadershipBonus, userId]
        );
      }
    }
  }
};

/**
 * Check for team volume bonus (1% if team has 10+ sales/month)
 */
export const checkTeamVolumeBonus = async (userId) => {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Count team sales this month
  const teamSalesCountResult = await query(
    `WITH RECURSIVE team AS (
       SELECT id FROM users WHERE upline_id = $1
       UNION ALL
       SELECT u.id FROM users u JOIN team t ON u.upline_id = t.id
     )
     SELECT COUNT(*) as count, SUM(o.subtotal) as total
     FROM orders o
     WHERE o.partner_id IN (SELECT id FROM team)
     AND o.created_at >= $2
     AND o.payment_status = 'paid'`,
    [userId, monthStart]
  );

  const teamSalesCount = parseInt(teamSalesCountResult.rows[0].count);
  const teamSalesTotal = parseFloat(teamSalesCountResult.rows[0].total) || 0;

  if (teamSalesCount >= 10 && teamSalesTotal > 0) {
    const bonus = Math.round(teamSalesTotal * 0.01 * 100) / 100; // 1%

    // Check if already awarded this month
    const existingBonus = await query(
      `SELECT id FROM commissions 
       WHERE user_id = $1 AND type = 'team_volume_bonus' 
       AND created_at >= $2`,
      [userId, monthStart]
    );

    if (existingBonus.rows.length === 0 && bonus > 0) {
      await query(
        `INSERT INTO commissions (user_id, type, amount, rate, status, description)
         VALUES ($1, 'team_volume_bonus', $2, 1, 'released', $3)`,
        [userId, bonus, `Team-Volumen Bonus (1% bei ${teamSalesCount} Verkäufen)`]
      );

      await query(
        'UPDATE users SET wallet_balance = wallet_balance + $1, total_earned = total_earned + $1 WHERE id = $2',
        [bonus, userId]
      );

      return bonus;
    }
  }

  return 0;
};

/**
 * Check and update partner rank
 */
export const checkAndUpdateRank = async (userId) => {
  const userResult = await query(
    `SELECT u.*, r.level as current_level, r.name as current_rank_name
     FROM users u
     JOIN ranks r ON u.rank_id = r.id
     WHERE u.id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) return null;

  const user = userResult.rows[0];

  // Get all ranks
  const ranksResult = await query('SELECT * FROM ranks ORDER BY level ASC');
  const ranks = ranksResult.rows;

  // Get direct partners count
  const directResult = await query(
    'SELECT COUNT(*) as count FROM users WHERE upline_id = $1',
    [userId]
  );
  const directPartners = parseInt(directResult.rows[0].count);

  // Special case: Machine owner auto-upgrade to Berater (Rank 2)
  if (user.has_own_machine && user.current_level < 2) {
    const beraterRank = ranks.find(r => r.level === 2);
    if (beraterRank) {
      await query('UPDATE users SET rank_id = $1 WHERE id = $2', [beraterRank.id, userId]);
      
      await query(
        `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 'rank_upgraded', 'user', userId, JSON.stringify({ 
          oldRank: user.current_level, 
          newRank: 2,
          reason: 'machine_owner' 
        })]
      );

      return { newRankId: beraterRank.id, newRankLevel: 2, reason: 'machine_owner' };
    }
  }

  // Find highest qualifying rank
  let newRankId = user.rank_id;
  let newRankLevel = user.current_level;
  let rankBonusAwarded = false;

  for (const rank of ranks) {
    if (
      user.own_sales_count >= rank.min_own_sales &&
      user.team_sales_count >= rank.min_team_sales &&
      directPartners >= rank.min_direct_partners
    ) {
      if (rank.level > newRankLevel) {
        newRankId = rank.id;
        newRankLevel = rank.level;

        // Award one-time rank bonus if upgrading
        if (rank.one_time_bonus > 0 && rank.level > user.current_level) {
          // Check if bonus already awarded
          const bonusCheck = await query(
            `SELECT id FROM commissions 
             WHERE user_id = $1 AND type = 'rank_bonus' 
             AND description LIKE $2`,
            [userId, `%${rank.name}%`]
          );

          if (bonusCheck.rows.length === 0) {
            await query(
              `INSERT INTO commissions (user_id, type, amount, status, description)
               VALUES ($1, 'rank_bonus', $2, 'released', $3)`,
              [userId, rank.one_time_bonus, `Rang-Bonus: ${rank.name}`]
            );

            await query(
              'UPDATE users SET wallet_balance = wallet_balance + $1, total_earned = total_earned + $1 WHERE id = $2',
              [rank.one_time_bonus, userId]
            );

            rankBonusAwarded = true;
          }
        }
      }
    }
  }

  // Update rank if changed
  if (newRankId !== user.rank_id) {
    await query('UPDATE users SET rank_id = $1 WHERE id = $2', [newRankId, userId]);

    // Log activity
    await query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        newRankLevel > user.current_level ? 'rank_upgraded' : 'rank_downgraded',
        'user',
        userId,
        JSON.stringify({ 
          oldRank: user.current_level, 
          oldRankName: user.current_rank_name,
          newRank: newRankLevel,
          newRankName: ranks.find(r => r.id === newRankId)?.name
        })
      ]
    );
  }

  return { newRankId, newRankLevel, rankBonusAwarded };
};

/**
 * Reset quarterly sales counts (run quarterly via cron)
 */
export const resetQuarterlySales = async () => {
  const result = await query(
    `UPDATE users 
     SET quarterly_sales_count = 0, 
         last_quarter_reset = CURRENT_TIMESTAMP
     WHERE role = 'partner'
     RETURNING id`
  );

  console.log(`Reset quarterly sales for ${result.rows.length} partners`);
  return result.rows;
};

/**
 * Reverse commissions for a cancelled/refunded order
 */
export const reverseCommissions = async (orderId) => {
  return await transaction(async (client) => {
    // Get all commissions for this order that haven't been paid out
    const commissionsResult = await client.query(
      `SELECT * FROM commissions 
       WHERE order_id = $1 AND status IN ('pending', 'held', 'released')`,
      [orderId]
    );

    const commissions = commissionsResult.rows;

    for (const commission of commissions) {
      // Update commission status
      await client.query(
        `UPDATE commissions 
         SET status = 'reversed', cancelled_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [commission.id]
      );

      // If already released, deduct from wallet
      if (commission.status === 'released') {
        await client.query(
          `UPDATE users 
           SET wallet_balance = wallet_balance - $1,
               total_earned = total_earned - $1
           WHERE id = $2`,
          [commission.amount, commission.user_id]
        );
      }
    }

    return commissions;
  });
};

/**
 * Get commission summary for user
 */
export const getCommissionSummary = async (userId) => {
  const result = await query(
    `SELECT 
       SUM(CASE WHEN status IN ('released', 'paid') THEN amount ELSE 0 END) as total_earned,
       SUM(CASE WHEN status = 'held' THEN amount ELSE 0 END) as pending,
       SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) as available,
       SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_out,
       SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) AND status NOT IN ('reversed', 'cancelled') THEN amount ELSE 0 END) as this_month,
       COUNT(CASE WHEN type = 'direct' AND status NOT IN ('reversed', 'cancelled') THEN 1 END) as direct_count,
       COUNT(CASE WHEN type = 'difference' AND status NOT IN ('reversed', 'cancelled') THEN 1 END) as difference_count,
       COUNT(CASE WHEN type LIKE '%bonus' AND status NOT IN ('reversed', 'cancelled') THEN 1 END) as bonus_count
     FROM commissions
     WHERE user_id = $1`,
    [userId]
  );

  return {
    totalEarned: parseFloat(result.rows[0].total_earned) || 0,
    pending: parseFloat(result.rows[0].pending) || 0,
    available: parseFloat(result.rows[0].available) || 0,
    paidOut: parseFloat(result.rows[0].paid_out) || 0,
    thisMonth: parseFloat(result.rows[0].this_month) || 0,
    directCount: parseInt(result.rows[0].direct_count) || 0,
    differenceCount: parseInt(result.rows[0].difference_count) || 0,
    bonusCount: parseInt(result.rows[0].bonus_count) || 0
  };
};

/**
 * Get detailed commission breakdown
 */
export const getCommissionBreakdown = async (userId, startDate, endDate) => {
  const result = await query(
    `SELECT 
       type,
       COUNT(*) as count,
       SUM(amount) as total,
       AVG(amount) as average
     FROM commissions
     WHERE user_id = $1
     AND created_at >= $2
     AND created_at <= $3
     AND status NOT IN ('reversed', 'cancelled')
     GROUP BY type`,
    [userId, startDate, endDate]
  );

  return result.rows.reduce((acc, row) => {
    acc[row.type] = {
      count: parseInt(row.count),
      total: parseFloat(row.total) || 0,
      average: parseFloat(row.average) || 0
    };
    return acc;
  }, {});
};
