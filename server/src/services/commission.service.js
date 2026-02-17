import { query, transaction } from '../config/database.js';

/**
 * CLYR Commission Service — Correct Vergütungsplan Implementation
 * 
 * RANK STRUCTURE (per compensation plan):
 * R1 Starter:       8%  (€266 on €3,332.50)  — Registration
 * R2 Berater:       19% (€633)                — 1-10 cumulative personal sales
 * R3 Fachberater:   21% (€699)                — 11-20 cumulative personal sales
 * R4 Teamleiter:    25% (€833)                — ≥5 personal + 15 team/month × 3 consecutive months
 * R5 Manager:       28% (€933)                — 30 team/month × 3 consecutive months
 * R6 Sales Manager: 31% (€1,033)              — 50 team/month × 3 consecutive months
 * R7 Direktor:      34%                       — Admin only (Theresa), NOT achievable
 *
 * COMMISSION TYPES:
 * 1. Direct Commission:     Partner's rank % × order subtotal (ALWAYS paid, no activity check)
 * 2. Difference Commission: (Upline rate - downline rate) × subtotal (requires upline ACTIVE = 2 sales/quarter)
 * 3. Leadership Bonus:      1% of direct team sales if 3+ active direct partners
 * 4. Team Volume Bonus:     1% of team sales if team ≥10 sales/month
 * 5. Leadership Cash Bonus: One-time €500/€1000/€2000 after 3 stable months at rank
 * 6. Bonus Pool:            2% of total company revenue shared among active leaders (monthly)
 * 7. Admin Commission:      50% of all sales (Theresa)
 *
 * ACTIVITY RULES:
 * - Active = 2+ personal sales in current quarter
 * - Direct commission is ALWAYS paid regardless of activity
 * - Difference commission requires upline to be active
 * - Inactive upline gets €0; difference passes to next active upline above
 *
 * RANK DECAY:
 * - If no sales for 12 months → rank resets to Berater (R2, 19%)
 * - Rank is maintained for 12 months from last sale even if criteria no longer met
 */

// ============================================
// MAIN: Calculate all commissions for an order
// ============================================
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

  // Check if this order used a voucher from the partner (discount deducted from commission)
  const orderResult = await client.query(
    'SELECT discount_code, discount_amount FROM orders WHERE id = $1',
    [orderId]
  );
  const orderDiscount = parseFloat(orderResult.rows[0]?.discount_amount) || 0;
  const orderDiscountCode = orderResult.rows[0]?.discount_code;

  // Check if the voucher belongs to THIS partner
  let voucherDeduction = 0;
  if (orderDiscount > 0 && orderDiscountCode) {
    const voucherResult = await client.query(
      'SELECT partner_id FROM discount_codes WHERE code = $1',
      [orderDiscountCode]
    );
    if (voucherResult.rows.length > 0 && voucherResult.rows[0].partner_id === partnerId) {
      voucherDeduction = orderDiscount;
    }
  }

  // Get partner with rank info
  const partnerResult = await client.query(
    `SELECT u.*, r.commission_rate, r.level as rank_level, r.name as rank_name
     FROM users u
     JOIN ranks r ON u.rank_id = r.id
     WHERE u.id = $1`,
    [partnerId]
  );

  if (partnerResult.rows.length === 0) return [];

  const partner = partnerResult.rows[0];
  const partnerCommissionRate = partner.commission_rate;

  const commissions = [];

  // -----------------------------------------------
  // 1. ADMIN COMMISSION (50% of all sales)
  // -----------------------------------------------
  const adminResult = await client.query(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );

  if (adminResult.rows.length > 0) {
    const adminId = adminResult.rows[0].id;
    const adminCommission = roundCurrency(orderSubtotal * (adminCommissionRate / 100));

    const adminCommissionResult = await client.query(
      `INSERT INTO commissions (user_id, order_id, type, amount, rate, base_amount, status, held_until, description)
       VALUES ($1, $2, 'admin', $3, $4, $5, 'held', $6, $7)
       RETURNING *`,
      [adminId, orderId, adminCommission, adminCommissionRate, orderSubtotal, heldUntil, 'Admin-Provision (50%)']
    );
    commissions.push(adminCommissionResult.rows[0]);
  }

  // -----------------------------------------------
  // 2. DIRECT COMMISSION — ALWAYS PAID regardless of activity status
  // Partner's rank rate × order subtotal
  // If partner used own voucher: deduct voucher amount from commission
  // -----------------------------------------------
  let directCommission = roundCurrency(orderSubtotal * (partnerCommissionRate / 100));
  
  // Deduct voucher amount from affiliate's commission
  if (voucherDeduction > 0) {
    directCommission = Math.max(0, roundCurrency(directCommission - voucherDeduction));
  }

  const voucherNote = voucherDeduction > 0 ? ` (abzgl. EUR ${voucherDeduction.toFixed(2)} Gutschein)` : '';

  const directCommissionResult = await client.query(
    `INSERT INTO commissions (user_id, order_id, type, amount, rate, base_amount, status, held_until, description)
     VALUES ($1, $2, 'direct', $3, $4, $5, 'held', $6, $7)
     RETURNING *`,
    [partnerId, orderId, directCommission, partnerCommissionRate, orderSubtotal, heldUntil, `Direkt-Provision (${partnerCommissionRate}%)${voucherNote}`]
  );
  commissions.push(directCommissionResult.rows[0]);

  // -----------------------------------------------
  // 3. DIFFERENCE COMMISSION for upline chain
  // Requires upline to be ACTIVE (2+ sales/quarter)
  // Inactive upline → €0, passes to next active upline
  // -----------------------------------------------
  const differenceCommissions = await calculateDifferenceCommissions(
    client, orderId, partnerId, partnerCommissionRate, orderSubtotal, heldUntil
  );
  commissions.push(...differenceCommissions);

  // -----------------------------------------------
  // 4. UPDATE PARTNER STATS
  // -----------------------------------------------
  await client.query(
    `UPDATE users SET 
      own_sales_count = own_sales_count + 1,
      own_sales_volume = own_sales_volume + $1,
      quarterly_sales_count = quarterly_sales_count + 1,
      last_sale_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [orderSubtotal, partnerId]
  );

  // -----------------------------------------------
  // 5. UPDATE TEAM STATS for all uplines
  // -----------------------------------------------
  await updateTeamStats(client, partnerId, orderSubtotal);

  // -----------------------------------------------
  // 6. UPDATE MONTHLY SNAPSHOT for current month
  // -----------------------------------------------
  await updateMonthlySnapshot(client, partnerId, orderSubtotal);

  // -----------------------------------------------
  // 7. CHECK RANK UPGRADE (after stats update)
  // -----------------------------------------------
  await checkAndUpdateRank(partnerId);

  // -----------------------------------------------
  // 8. CHECK LEADERSHIP BONUS (1% if 3+ active directs)
  // -----------------------------------------------
  await checkLeadershipBonus(client, partnerId);

  return commissions;
};


// ============================================
// DIFFERENCE COMMISSION CALCULATION
// ============================================
const calculateDifferenceCommissions = async (client, orderId, partnerId, sellerRate, orderSubtotal, heldUntil) => {
  let currentUserId = partnerId;
  let previousRate = sellerRate;
  let depth = 0;
  const maxDepth = 10;
  const commissions = [];

  while (depth < maxDepth) {
    // Get upline
    const uplineResult = await client.query(
      `SELECT u.id, u.upline_id, u.status, u.first_name, u.last_name, 
              r.commission_rate, r.level
       FROM users u
       JOIN ranks r ON u.rank_id = r.id
       WHERE u.id = (SELECT upline_id FROM users WHERE id = $1)`,
      [currentUserId]
    );

    if (uplineResult.rows.length === 0) break;

    const upline = uplineResult.rows[0];

    // Check if upline is ACTIVE (2+ sales in current quarter)
    const isActive = await checkPartnerIsActive(client, upline.id);

    if (isActive && upline.commission_rate > previousRate) {
      // Upline is active and has higher rate → pays difference
      const differenceRate = upline.commission_rate - previousRate;
      const differenceCommission = roundCurrency(orderSubtotal * (differenceRate / 100));

      if (differenceCommission > 0) {
        const result = await client.query(
          `INSERT INTO commissions (user_id, order_id, type, amount, rate, base_amount, source_user_id, status, held_until, description)
           VALUES ($1, $2, 'difference', $3, $4, $5, $6, 'held', $7, $8)
           RETURNING *`,
          [
            upline.id, orderId, differenceCommission, differenceRate,
            orderSubtotal, partnerId, heldUntil,
            `Differenz-Provision (${differenceRate}%) von ${depth + 1}. Ebene`
          ]
        );
        commissions.push(result.rows[0]);

        // Update previousRate to this upline's rate for next iteration
        previousRate = upline.commission_rate;
      }
    }
    // If upline is INACTIVE → they get €0, DO NOT update previousRate
    // This means the next active upline above gets the full difference

    currentUserId = upline.id;
    depth++;

    // If we've reached R7 (34%) = max rate, no more difference possible
    if (upline.commission_rate >= 34) break;
  }

  return commissions;
};


// ============================================
// UPDATE TEAM STATS for entire upline chain
// ============================================
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

    // Also update the upline's monthly snapshot for team stats
    await updateMonthlySnapshotTeam(client, uplineId, orderSubtotal);

    currentUserId = uplineId;
    depth++;
  }
};


// ============================================
// MONTHLY SNAPSHOT TRACKING
// Used for "3 consecutive months" rank qualification
// ============================================
const updateMonthlySnapshot = async (client, userId, orderSubtotal) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  await client.query(
    `INSERT INTO monthly_sales_snapshots (user_id, year, month, personal_sales_count, personal_sales_volume)
     VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (user_id, year, month) DO UPDATE SET
       personal_sales_count = monthly_sales_snapshots.personal_sales_count + 1,
       personal_sales_volume = monthly_sales_snapshots.personal_sales_volume + $4`,
    [userId, year, month, orderSubtotal]
  );
};

const updateMonthlySnapshotTeam = async (client, userId, orderSubtotal) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  await client.query(
    `INSERT INTO monthly_sales_snapshots (user_id, year, month, team_sales_count, team_sales_volume)
     VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (user_id, year, month) DO UPDATE SET
       team_sales_count = monthly_sales_snapshots.team_sales_count + 1,
       team_sales_volume = monthly_sales_snapshots.team_sales_volume + $4`,
    [userId, year, month, orderSubtotal]
  );
};


// ============================================
// ACTIVITY CHECK: 2+ sales in current quarter
// ============================================
export const checkPartnerIsActive = async (client, userId) => {
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


// ============================================
// RANK CHECK & UPGRADE
// ============================================
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

  // NEVER auto-change admin ranks (R7 Direktor)
  if (user.role === 'admin' || user.current_level === 7) return null;

  // Get all ranks (exclude R7 admin-only rank)
  const ranksResult = await query('SELECT * FROM ranks WHERE level <= 6 ORDER BY level ASC');
  const ranks = ranksResult.rows;

  // Get cumulative personal sales count
  const cumulativeSales = user.own_sales_count || 0;

  // Special case: Machine owner auto-upgrade to Berater (R2)
  if (user.has_own_machine && user.current_level < 2) {
    const beraterRank = ranks.find(r => r.level === 2);
    if (beraterRank) {
      await query('UPDATE users SET rank_id = $1, rank_achieved_at = CURRENT_TIMESTAMP WHERE id = $2', [beraterRank.id, userId]);
      await logRankChange(userId, user.current_level, 2, 'machine_owner');
      return { newRankLevel: 2, reason: 'machine_owner' };
    }
  }

  // Determine highest qualifying rank
  let qualifiedLevel = 1; // Default: Starter

  // R2 Berater: 1+ cumulative personal sales
  if (cumulativeSales >= 1) {
    qualifiedLevel = 2;
  }

  // R3 Fachberater: 11+ cumulative personal sales
  if (cumulativeSales >= 11) {
    qualifiedLevel = 3;
  }

  // R4-R6 require "3 consecutive months" check using monthly snapshots
  const consecutiveMonths = await getConsecutiveQualifyingMonths(userId);

  // R4 Teamleiter: ≥5 personal + 15 team sales/month for 3 consecutive months
  if (consecutiveMonths.teamleiter >= 3) {
    qualifiedLevel = 4;
  }

  // R5 Manager: 30 team sales/month for 3 consecutive months
  if (consecutiveMonths.manager >= 3) {
    qualifiedLevel = 5;
  }

  // R6 Sales Manager: 50 team sales/month for 3 consecutive months
  if (consecutiveMonths.salesManager >= 3) {
    qualifiedLevel = 6;
  }

  // Find the rank record for qualified level
  const newRank = ranks.find(r => r.level === qualifiedLevel);
  if (!newRank) return null;

  // Only upgrade, never downgrade (rank is maintained for 12 months - decay handled separately)
  if (newRank.level > user.current_level) {
    await query(
      'UPDATE users SET rank_id = $1, rank_achieved_at = CURRENT_TIMESTAMP, highest_rank_level = GREATEST(COALESCE(highest_rank_level, 1), $2) WHERE id = $3',
      [newRank.id, newRank.level, userId]
    );

    await logRankChange(userId, user.current_level, newRank.level, 'qualification');

    // Check if leadership cash bonus should be awarded (for R4, R5, R6)
    if (newRank.level >= 4) {
      await checkLeadershipCashBonus(userId, newRank.level, newRank.one_time_bonus);
    }

    return { newRankLevel: newRank.level, reason: 'qualification' };
  }

  return null;
};


// ============================================
// CONSECUTIVE QUALIFYING MONTHS CHECK
// ============================================
const getConsecutiveQualifyingMonths = async (userId) => {
  // Get last 6 months of snapshots (more than enough to check 3 consecutive)
  const snapshotsResult = await query(
    `SELECT year, month, personal_sales_count, team_sales_count
     FROM monthly_sales_snapshots
     WHERE user_id = $1
     ORDER BY year DESC, month DESC
     LIMIT 6`,
    [userId]
  );

  const snapshots = snapshotsResult.rows;

  let teamleiterConsecutive = 0;
  let managerConsecutive = 0;
  let salesManagerConsecutive = 0;

  // Count consecutive qualifying months for Teamleiter
  for (const snapshot of snapshots) {
    const personal = snapshot.personal_sales_count || 0;
    const team = snapshot.team_sales_count || 0;
    if (personal >= 5 && team >= 15) {
      teamleiterConsecutive++;
    } else {
      break;
    }
  }

  // Count for Manager
  for (const snapshot of snapshots) {
    const team = snapshot.team_sales_count || 0;
    if (team >= 30) {
      managerConsecutive++;
    } else {
      break;
    }
  }

  // Count for Sales Manager
  for (const snapshot of snapshots) {
    const team = snapshot.team_sales_count || 0;
    if (team >= 50) {
      salesManagerConsecutive++;
    } else {
      break;
    }
  }

  return {
    teamleiter: teamleiterConsecutive,
    manager: managerConsecutive,
    salesManager: salesManagerConsecutive
  };
};


// ============================================
// LEADERSHIP CASH BONUS (one-time)
// €500 at Team Leader, €1000 at Manager, €2000 at Sales Manager
// ============================================
const checkLeadershipCashBonus = async (userId, rankLevel, bonusAmount) => {
  if (bonusAmount <= 0) return;

  const existingResult = await query(
    'SELECT id FROM leadership_cash_bonuses WHERE user_id = $1 AND rank_level = $2',
    [userId, rankLevel]
  );

  if (existingResult.rows.length > 0) return; // Already awarded

  const rankNames = { 4: 'Teamleiter', 5: 'Manager', 6: 'Sales Manager' };
  const rankName = rankNames[rankLevel] || `Rang ${rankLevel}`;

  const commissionResult = await query(
    `INSERT INTO commissions (user_id, type, amount, status, description)
     VALUES ($1, 'leadership_cash_bonus', $2, 'released', $3)
     RETURNING id`,
    [userId, bonusAmount, `Einmalige Führungsprämie: ${rankName} (€${bonusAmount})`]
  );

  await query(
    `INSERT INTO leadership_cash_bonuses (user_id, rank_level, amount, commission_id)
     VALUES ($1, $2, $3, $4)`,
    [userId, rankLevel, bonusAmount, commissionResult.rows[0].id]
  );

  await query(
    'UPDATE users SET wallet_balance = wallet_balance + $1, total_earned = total_earned + $1 WHERE id = $2',
    [bonusAmount, userId]
  );
};


// ============================================
// LEADERSHIP BONUS: 1% if 3+ active direct partners
// ============================================
const checkLeadershipBonus = async (client, userId) => {
  const quarterStart = new Date();
  quarterStart.setMonth(quarterStart.getMonth() - quarterStart.getMonth() % 3, 1);
  quarterStart.setHours(0, 0, 0, 0);

  const activeDirectResult = await client.query(
    `SELECT COUNT(*) as count FROM users u
     WHERE u.upline_id = $1 AND u.status = 'active'
     AND (
       SELECT COUNT(*) FROM orders o 
       WHERE o.partner_id = u.id 
       AND o.created_at >= $2
       AND o.payment_status = 'paid'
       AND o.status NOT IN ('cancelled', 'refunded')
     ) >= 2`,
    [userId, quarterStart]
  );

  const activeDirectCount = parseInt(activeDirectResult.rows[0].count);

  if (activeDirectCount >= 3) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const teamSalesResult = await client.query(
      `SELECT COALESCE(SUM(o.subtotal), 0) as total
       FROM orders o
       WHERE o.partner_id IN (
         SELECT id FROM users WHERE upline_id = $1
       )
       AND o.created_at >= $2
       AND o.payment_status = 'paid'
       AND o.status NOT IN ('cancelled', 'refunded')`,
      [userId, monthStart]
    );

    const teamSales = parseFloat(teamSalesResult.rows[0].total) || 0;

    if (teamSales > 0) {
      const leadershipBonus = roundCurrency(teamSales * 0.01);

      const existingBonus = await client.query(
        `SELECT id FROM commissions 
         WHERE user_id = $1 AND type = 'leadership_bonus' 
         AND created_at >= $2`,
        [userId, monthStart]
      );

      if (existingBonus.rows.length === 0 && leadershipBonus > 0) {
        await client.query(
          `INSERT INTO commissions (user_id, type, amount, rate, base_amount, status, description)
           VALUES ($1, 'leadership_bonus', $2, 1, $3, 'released', $4)`,
          [userId, leadershipBonus, teamSales, `Leadership Bonus (1% von €${teamSales.toFixed(2)} Team-Umsatz, ${activeDirectCount} aktive Partner)`]
        );

        await client.query(
          'UPDATE users SET wallet_balance = wallet_balance + $1, total_earned = total_earned + $1 WHERE id = $2',
          [leadershipBonus, userId]
        );
      }
    }
  }
};


// ============================================
// TEAM VOLUME BONUS: 1% if team ≥10 sales/month
// ============================================
export const checkTeamVolumeBonus = async (userId) => {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const teamSalesResult = await query(
    `WITH RECURSIVE team AS (
       SELECT id FROM users WHERE upline_id = $1
       UNION ALL
       SELECT u.id FROM users u JOIN team t ON u.upline_id = t.id
     )
     SELECT COUNT(*) as count, COALESCE(SUM(o.subtotal), 0) as total
     FROM orders o
     WHERE o.partner_id IN (SELECT id FROM team)
     AND o.created_at >= $2
     AND o.payment_status = 'paid'
     AND o.status NOT IN ('cancelled', 'refunded')`,
    [userId, monthStart]
  );

  const teamSalesCount = parseInt(teamSalesResult.rows[0].count);
  const teamSalesTotal = parseFloat(teamSalesResult.rows[0].total) || 0;

  if (teamSalesCount >= 10 && teamSalesTotal > 0) {
    const bonus = roundCurrency(teamSalesTotal * 0.01);

    const existingBonus = await query(
      `SELECT id FROM commissions 
       WHERE user_id = $1 AND type = 'team_volume_bonus' 
       AND created_at >= $2`,
      [userId, monthStart]
    );

    if (existingBonus.rows.length === 0 && bonus > 0) {
      await query(
        `INSERT INTO commissions (user_id, type, amount, rate, base_amount, status, description)
         VALUES ($1, 'team_volume_bonus', $2, 1, $3, 'released', $4)`,
        [userId, bonus, teamSalesTotal, `Team-Volumen Bonus (1% bei ${teamSalesCount} Verkäufen, €${teamSalesTotal.toFixed(2)})`]
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


// ============================================
// 2% BONUS POOL DISTRIBUTION (monthly, admin-triggered)
// ============================================
export const distributeBonusPool = async (triggeredByUserId) => {
  return await transaction(async (client) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const existingResult = await client.query(
      'SELECT id FROM bonus_pool_distributions WHERE year = $1 AND month = $2',
      [year, month]
    );
    if (existingResult.rows.length > 0) {
      return { error: 'Bonus Pool wurde diesen Monat bereits verteilt' };
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const revenueResult = await client.query(
      `SELECT COALESCE(SUM(subtotal), 0) as total
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2
       AND payment_status = 'paid'
       AND status NOT IN ('cancelled', 'refunded')`,
      [monthStart, monthEnd]
    );

    const totalRevenue = parseFloat(revenueResult.rows[0].total) || 0;
    if (totalRevenue <= 0) {
      return { error: 'Kein Umsatz diesen Monat', totalRevenue: 0 };
    }

    const poolRate = 2;
    const poolAmount = roundCurrency(totalRevenue * (poolRate / 100));

    const quarterStart = new Date(year, Math.floor((month - 1) / 3) * 3, 1);

    const leadersResult = await client.query(
      `SELECT u.id, u.first_name, u.last_name, r.level, r.name as rank_name
       FROM users u
       JOIN ranks r ON u.rank_id = r.id
       WHERE r.level >= 4
       AND u.status = 'active'
       AND u.role = 'partner'
       AND (
         SELECT COUNT(*) FROM orders o
         WHERE o.partner_id = u.id
         AND o.created_at >= $1
         AND o.payment_status = 'paid'
         AND o.status NOT IN ('cancelled', 'refunded')
       ) >= 2`,
      [quarterStart]
    );

    const eligibleLeaders = leadersResult.rows;
    if (eligibleLeaders.length === 0) {
      return { error: 'Keine berechtigten aktiven Leader', totalRevenue, poolAmount };
    }

    const amountPerLeader = roundCurrency(poolAmount / eligibleLeaders.length);

    const distResult = await client.query(
      `INSERT INTO bonus_pool_distributions (year, month, total_revenue, pool_amount, eligible_leaders, amount_per_leader, distributed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [year, month, totalRevenue, poolAmount, eligibleLeaders.length, amountPerLeader, triggeredByUserId]
    );
    const distributionId = distResult.rows[0].id;

    const payouts = [];
    for (const leader of eligibleLeaders) {
      const commResult = await client.query(
        `INSERT INTO commissions (user_id, type, amount, rate, base_amount, status, description)
         VALUES ($1, 'bonus_pool', $2, $3, $4, 'released', $5)
         RETURNING id`,
        [
          leader.id, amountPerLeader, poolRate, totalRevenue,
          `Bonus Pool ${month}/${year}: €${amountPerLeader} (${eligibleLeaders.length} Leader)`
        ]
      );

      await client.query(
        `INSERT INTO bonus_pool_payouts (distribution_id, user_id, amount, commission_id)
         VALUES ($1, $2, $3, $4)`,
        [distributionId, leader.id, amountPerLeader, commResult.rows[0].id]
      );

      await client.query(
        'UPDATE users SET wallet_balance = wallet_balance + $1, total_earned = total_earned + $1 WHERE id = $2',
        [amountPerLeader, leader.id]
      );

      payouts.push({
        userId: leader.id,
        name: `${leader.first_name} ${leader.last_name}`,
        rank: leader.rank_name,
        amount: amountPerLeader
      });
    }

    return {
      distributionId, year, month, totalRevenue, poolAmount,
      eligibleLeaders: eligibleLeaders.length, amountPerLeader, payouts
    };
  });
};


// ============================================
// RANK DECAY: 12 months no sales → reset to Berater (R2)
// Run monthly via cron
// ============================================
export const checkRankDecay = async () => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const result = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, r.level, r.name as rank_name
     FROM users u
     JOIN ranks r ON u.rank_id = r.id
     WHERE u.role = 'partner'
     AND r.level > 2
     AND (u.last_sale_at IS NULL OR u.last_sale_at < $1)
     AND u.status = 'active'`,
    [twelveMonthsAgo]
  );

  const beraterRank = await query("SELECT id FROM ranks WHERE level = 2");
  if (beraterRank.rows.length === 0) return [];

  const beraterRankId = beraterRank.rows[0].id;
  const decayed = [];

  for (const partner of result.rows) {
    await query(
      'UPDATE users SET rank_id = $1, rank_achieved_at = CURRENT_TIMESTAMP WHERE id = $2',
      [beraterRankId, partner.id]
    );

    await logRankChange(partner.id, partner.level, 2, 'decay_12_months');

    decayed.push({
      id: partner.id,
      name: `${partner.first_name} ${partner.last_name}`,
      email: partner.email,
      fromRank: partner.rank_name,
      toRank: 'Berater'
    });
  }

  if (decayed.length > 0) {
    console.log(`Rank decay: ${decayed.length} partners reset to Berater after 12 months inactivity`);
  }

  return decayed;
};


// ============================================
// RELEASE HELD COMMISSIONS (daily cron)
// ============================================
export const releaseHeldCommissions = async () => {
  const result = await query(
    `UPDATE commissions
     SET status = 'released', released_at = CURRENT_TIMESTAMP
     WHERE status = 'held' AND held_until <= CURRENT_TIMESTAMP
     RETURNING *`
  );

  console.log(`Released ${result.rows.length} commissions`);

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


// ============================================
// RESET QUARTERLY SALES COUNTS
// ============================================
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


// ============================================
// REVERSE COMMISSIONS for cancelled/refunded order
// ============================================
export const reverseCommissions = async (orderId) => {
  return await transaction(async (client) => {
    const commissionsResult = await client.query(
      `SELECT * FROM commissions 
       WHERE order_id = $1 AND status IN ('pending', 'held', 'released')`,
      [orderId]
    );

    const commissions = commissionsResult.rows;

    for (const commission of commissions) {
      await client.query(
        `UPDATE commissions 
         SET status = 'reversed', cancelled_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [commission.id]
      );

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


// ============================================
// COMMISSION SUMMARY for user dashboard
// ============================================
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
       COUNT(CASE WHEN type LIKE '%bonus%' AND status NOT IN ('reversed', 'cancelled') THEN 1 END) as bonus_count
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


// ============================================
// COMMISSION BREAKDOWN by type for date range
// ============================================
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


// ============================================
// HELPERS
// ============================================
function roundCurrency(amount) {
  return Math.round(amount * 100) / 100;
}

async function logRankChange(userId, fromLevel, toLevel, reason) {
  try {
    await query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, 'user', $1, $3)`,
      [
        userId,
        toLevel > fromLevel ? 'rank_upgraded' : 'rank_downgraded',
        JSON.stringify({ oldRank: fromLevel, newRank: toLevel, reason })
      ]
    );
  } catch (err) {
    console.error('Failed to log rank change:', err.message);
  }
}
