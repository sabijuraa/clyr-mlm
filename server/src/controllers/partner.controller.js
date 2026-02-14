import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { getCommissionSummary, checkAndUpdateRank } from '../services/commission.service.js';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get commission summary
  const commissionSummary = await getCommissionSummary(userId);

  // Get team size
  const teamResult = await query(
    `WITH RECURSIVE team AS (
       SELECT id, 1 as level FROM users WHERE upline_id = $1
       UNION ALL
       SELECT u.id, t.level + 1 FROM users u JOIN team t ON u.upline_id = t.id WHERE t.level < 10
     )
     SELECT COUNT(*) as total, COUNT(CASE WHEN level = 1 THEN 1 END) as direct
     FROM team`,
    [userId]
  );

  const teamSize = {
    total: parseInt(teamResult.rows[0].total) || 0,
    direct: parseInt(teamResult.rows[0].direct) || 0
  };

  // Get this month's orders
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const ordersResult = await query(
    `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
     FROM orders
     WHERE partner_id = $1 AND created_at >= $2 AND payment_status = 'paid'`,
    [userId, monthStart]
  );

  const monthlyOrders = {
    count: parseInt(ordersResult.rows[0].count) || 0,
    revenue: parseFloat(ordersResult.rows[0].revenue) || 0
  };

  // Get recent orders (last 5)
  const recentOrdersResult = await query(
    `SELECT o.id, o.order_number, o.customer_first_name, o.customer_last_name,
            o.total, o.status, o.created_at,
            (SELECT SUM(amount) FROM commissions WHERE order_id = o.id AND user_id = $1) as commission
     FROM orders o
     WHERE o.partner_id = $1
     ORDER BY o.created_at DESC
     LIMIT 5`,
    [userId]
  );

  // Get rank info
  const rankResult = await query(
    `SELECT r.*, 
            (SELECT name FROM ranks WHERE level = r.level + 1) as next_rank_name,
            (SELECT commission_rate FROM ranks WHERE level = r.level + 1) as next_rank_rate
     FROM ranks r
     WHERE r.id = $1`,
    [req.user.rank_id]
  );

  const rank = rankResult.rows[0];

  // Check for rank update
  await checkAndUpdateRank(userId);

  res.json({
    commissions: commissionSummary,
    team: teamSize,
    monthlyOrders,
    recentOrders: recentOrdersResult.rows,
    rank: {
      current: {
        name: rank.name,
        level: rank.level,
        commissionRate: rank.commission_rate,
        color: rank.color
      },
      next: rank.next_rank_name ? {
        name: rank.next_rank_name,
        commissionRate: rank.next_rank_rate
      } : null
    },
    walletBalance: parseFloat(req.user.wallet_balance) || 0
  });
});

/**
 * Get team members
 */
export const getTeam = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, level = 'all', status } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  let teamQuery;
  let countQuery;
  const params = [userId];

  if (level === 'direct' || level === '1') {
    // Direct team only
    teamQuery = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at,
             u.own_sales_count, u.direct_partners_count,
             r.name as rank_name, r.color as rank_color, r.commission_rate,
             (SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE user_id = u.id AND status IN ('released', 'paid')) as total_earned
      FROM users u
      JOIN ranks r ON u.rank_id = r.id
      WHERE u.upline_id = $1
    `;
    countQuery = `SELECT COUNT(*) FROM users WHERE upline_id = $1`;
  } else {
    // Full team tree
    teamQuery = `
      WITH RECURSIVE team AS (
        SELECT id, first_name, last_name, email, phone, status, created_at,
               own_sales_count, direct_partners_count, rank_id, 1 as level
        FROM users WHERE upline_id = $1
        UNION ALL
        SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at,
               u.own_sales_count, u.direct_partners_count, u.rank_id, t.level + 1
        FROM users u JOIN team t ON u.upline_id = t.id
        WHERE t.level < 10
      )
      SELECT t.*, r.name as rank_name, r.color as rank_color, r.commission_rate,
             (SELECT COALESCE(SUM(amount), 0) FROM commissions WHERE user_id = t.id AND status IN ('released', 'paid')) as total_earned
      FROM team t
      JOIN ranks r ON t.rank_id = r.id
    `;
    countQuery = `
      WITH RECURSIVE team AS (
        SELECT id FROM users WHERE upline_id = $1
        UNION ALL
        SELECT u.id FROM users u JOIN team t ON u.upline_id = t.id
      )
      SELECT COUNT(*) FROM team
    `;
  }

  // Add status filter
  if (status) {
    teamQuery += ` AND u.status = $${params.length + 1}`;
    countQuery += ` AND status = $${params.length + 1}`;
    params.push(status);
  }

  // Add ordering and pagination
  teamQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), offset);

  const [teamResult, countResult] = await Promise.all([
    query(teamQuery, params),
    query(countQuery, params.slice(0, status ? 2 : 1))
  ]);

  res.json({
    team: teamResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

/**
 * Get team tree structure
 */
export const getTeamTree = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { maxDepth = 5 } = req.query;

  const result = await query(
    `WITH RECURSIVE team_tree AS (
       SELECT id, first_name, last_name, upline_id, rank_id, status, own_sales_count,
              1 as depth, ARRAY[id] as path
       FROM users WHERE upline_id = $1
       UNION ALL
       SELECT u.id, u.first_name, u.last_name, u.upline_id, u.rank_id, u.status, u.own_sales_count,
              tt.depth + 1, tt.path || u.id
       FROM users u
       JOIN team_tree tt ON u.upline_id = tt.id
       WHERE tt.depth < $2 AND NOT u.id = ANY(tt.path)
     )
     SELECT tt.*, r.name as rank_name, r.color as rank_color
     FROM team_tree tt
     JOIN ranks r ON tt.rank_id = r.id
     ORDER BY path`,
    [userId, parseInt(maxDepth)]
  );

  // Build tree structure
  const buildTree = (members, parentId = userId) => {
    return members
      .filter(m => m.upline_id === parentId)
      .map(member => ({
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        rank: member.rank_name,
        rankColor: member.rank_color,
        status: member.status,
        sales: member.own_sales_count,
        children: buildTree(members, member.id)
      }));
  };

  const tree = buildTree(result.rows);

  res.json({ tree });
});

/**
 * Get team member details
 */
export const getTeamMemberDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Verify this member is in user's team
  const verifyResult = await query(
    `WITH RECURSIVE team AS (
       SELECT id FROM users WHERE upline_id = $1
       UNION ALL
       SELECT u.id FROM users u JOIN team t ON u.upline_id = t.id
     )
     SELECT id FROM team WHERE id = $2`,
    [userId, id]
  );

  if (verifyResult.rows.length === 0) {
    throw new AppError('Teammitglied nicht gefunden', 404);
  }

  // Get member details
  const memberResult = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.city, u.country,
            u.status, u.created_at, u.own_sales_count, u.direct_partners_count,
            r.name as rank_name, r.color as rank_color, r.commission_rate
     FROM users u
     JOIN ranks r ON u.rank_id = r.id
     WHERE u.id = $1`,
    [id]
  );

  const member = memberResult.rows[0];

  // Get member's monthly stats
  const monthStart = new Date();
  monthStart.setDate(1);

  const statsResult = await query(
    `SELECT 
       COUNT(*) as orders_this_month,
       COALESCE(SUM(total), 0) as revenue_this_month
     FROM orders
     WHERE partner_id = $1 AND created_at >= $2 AND payment_status = 'paid'`,
    [id, monthStart]
  );

  // Get member's direct team count
  const directTeamResult = await query(
    'SELECT COUNT(*) FROM users WHERE upline_id = $1',
    [id]
  );

  res.json({
    member: {
      ...member,
      ordersThisMonth: parseInt(statsResult.rows[0].orders_this_month),
      revenueThisMonth: parseFloat(statsResult.rows[0].revenue_this_month),
      directTeamSize: parseInt(directTeamResult.rows[0].count)
    }
  });
});

/**
 * Get referral links
 */
export const getReferralLinks = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get products for product-specific links
  const productsResult = await query(
    'SELECT id, name, slug FROM products WHERE is_active = true ORDER BY is_featured DESC, name ASC'
  );

  const baseUrl = process.env.FRONTEND_URL || 'https://clyr.shop';
  const referralCode = req.user.referral_code;

  const links = {
    main: `${baseUrl}?ref=${referralCode}`,
    register: `${baseUrl}/partner-werden?ref=${referralCode}`,
    products: productsResult.rows.map(p => ({
      productId: p.id,
      productName: p.name,
      url: `${baseUrl}/produkt/${p.slug}?ref=${referralCode}`
    }))
  };

  res.json({ links, referralCode });
});

/**
 * Create custom referral link (discount code)
 */
export const createReferralLink = asyncHandler(async (req, res) => {
  const { code, discountType = 'fixed', discountValue, maxUses, expiresAt } = req.body;
  const userId = req.user.id;

  // Check if code already exists
  const existingCode = await query(
    'SELECT id FROM discount_codes WHERE code = $1',
    [code.toUpperCase()]
  );

  if (existingCode.rows.length > 0) {
    throw new AppError('Dieser Code existiert bereits', 409);
  }

  // Validate discount value (max 100€ or 10%)
  if (discountType === 'fixed' && discountValue > 100) {
    throw new AppError('Maximaler Rabatt ist 100€', 400);
  }
  if (discountType === 'percentage' && discountValue > 10) {
    throw new AppError('Maximaler Rabatt ist 10%', 400);
  }

  const result = await query(
    `INSERT INTO discount_codes (code, type, value, partner_id, max_uses, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [code.toUpperCase(), discountType, discountValue, userId, maxUses || null, expiresAt || null]
  );

  res.status(201).json({
    message: 'Rabattcode erstellt',
    discountCode: result.rows[0]
  });
});

/**
 * Get referral statistics
 */
export const getReferralStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const referralCode = req.user.referral_code;

  // Get click stats
  const clicksResult = await query(
    `SELECT 
       COUNT(*) as total_clicks,
       COUNT(CASE WHEN converted = true THEN 1 END) as conversions,
       COUNT(DISTINCT DATE(created_at)) as days_with_clicks
     FROM referral_clicks
     WHERE referral_code = $1`,
    [referralCode]
  );

  // Get clicks by day (last 30 days)
  const dailyClicksResult = await query(
    `SELECT DATE(created_at) as date, COUNT(*) as clicks, COUNT(CASE WHEN converted THEN 1 END) as conversions
     FROM referral_clicks
     WHERE referral_code = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date DESC`,
    [referralCode]
  );

  // Get top performing products
  const topProductsResult = await query(
    `SELECT p.name, COUNT(*) as clicks
     FROM referral_clicks rc
     JOIN products p ON rc.product_id = p.id
     WHERE rc.referral_code = $1 AND rc.product_id IS NOT NULL
     GROUP BY p.id, p.name
     ORDER BY clicks DESC
     LIMIT 5`,
    [referralCode]
  );

  const stats = clicksResult.rows[0];
  const conversionRate = stats.total_clicks > 0 
    ? Math.round((stats.conversions / stats.total_clicks) * 100 * 10) / 10 
    : 0;

  res.json({
    totalClicks: parseInt(stats.total_clicks),
    conversions: parseInt(stats.conversions),
    conversionRate,
    dailyClicks: dailyClicksResult.rows,
    topProducts: topProductsResult.rows
  });
});

/**
 * Get customers
 */
export const getCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  let whereClause = 'WHERE c.referred_by = $1';
  const params = [userId];

  if (search) {
    whereClause += ` AND (c.first_name ILIKE $2 OR c.last_name ILIKE $2 OR c.email ILIKE $2)`;
    params.push(`%${search}%`);
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM customers c ${whereClause}`,
    params
  );

  const customersResult = await query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM orders WHERE customer_id = c.id AND payment_status = 'paid') as order_count,
            (SELECT COALESCE(SUM(total), 0) FROM orders WHERE customer_id = c.id AND payment_status = 'paid') as total_spent,
            (SELECT MAX(created_at) FROM orders WHERE customer_id = c.id) as last_order_at
     FROM customers c
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    customers: customersResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

/**
 * Get wallet details
 */
export const getWallet = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const commissionSummary = await getCommissionSummary(userId);

  // Get pending payouts
  const pendingPayoutsResult = await query(
    `SELECT * FROM payouts WHERE user_id = $1 AND status IN ('pending', 'processing') ORDER BY created_at DESC`,
    [userId]
  );

  // Get recent transactions
  const transactionsResult = await query(
    `SELECT 
       c.id, c.amount, c.type, c.status, c.description, c.created_at, c.released_at, c.paid_at,
       o.order_number
     FROM commissions c
     LEFT JOIN orders o ON c.order_id = o.id
     WHERE c.user_id = $1
     ORDER BY c.created_at DESC
     LIMIT 20`,
    [userId]
  );

  // Get minimum payout threshold
  const settingsResult = await query("SELECT value FROM settings WHERE key = 'min_payout_amount'");
  const minPayoutAmount = settingsResult.rows[0]?.value?.amount || 50;

  res.json({
    balance: parseFloat(req.user.wallet_balance) || 0,
    summary: commissionSummary,
    pendingPayouts: pendingPayoutsResult.rows,
    transactions: transactionsResult.rows,
    minPayoutAmount
  });
});

/**
 * Request payout
 */
export const requestPayout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { amount } = req.body;

  // Get minimum payout threshold
  const settingsResult = await query("SELECT value FROM settings WHERE key = 'min_payout_amount'");
  const minPayoutAmount = settingsResult.rows[0]?.value?.amount || 50;

  // Validate amount
  const walletBalance = parseFloat(req.user.wallet_balance) || 0;
  const requestedAmount = amount || walletBalance;

  if (requestedAmount < minPayoutAmount) {
    throw new AppError(`Mindestbetrag für Auszahlung ist ${minPayoutAmount}€`, 400);
  }

  if (requestedAmount > walletBalance) {
    throw new AppError('Nicht genügend Guthaben', 400);
  }

  // Check if user has bank details
  if (!req.user.iban) {
    throw new AppError('Bitte hinterlegen Sie zuerst Ihre Bankverbindung', 400);
  }

  // Check for pending payout
  const pendingResult = await query(
    "SELECT id FROM payouts WHERE user_id = $1 AND status IN ('pending', 'processing')",
    [userId]
  );

  if (pendingResult.rows.length > 0) {
    throw new AppError('Sie haben bereits eine ausstehende Auszahlung', 400);
  }

  // Create payout request
  const payoutResult = await query(
    `INSERT INTO payouts (user_id, amount, method, iban, bic, status)
     VALUES ($1, $2, 'sepa', $3, $4, 'pending')
     RETURNING *`,
    [userId, requestedAmount, req.user.iban, req.user.bic]
  );

  // Deduct from wallet
  await query(
    'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
    [requestedAmount, userId]
  );

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'payout_requested', 'payout', payoutResult.rows[0].id, JSON.stringify({ amount: requestedAmount })]
  );

  res.status(201).json({
    message: 'Auszahlung beantragt',
    payout: payoutResult.rows[0]
  });
});

/**
 * Get payout history
 */
export const getPayoutHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  const countResult = await query(
    'SELECT COUNT(*) FROM payouts WHERE user_id = $1',
    [userId]
  );

  const payoutsResult = await query(
    `SELECT * FROM payouts WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, parseInt(limit), offset]
  );

  res.json({
    payouts: payoutsResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

/**
 * Get rank progress
 */
export const getRankProgress = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get all ranks
  const ranksResult = await query('SELECT * FROM ranks ORDER BY level ASC');
  const ranks = ranksResult.rows;

  // Get user stats
  const userResult = await query(
    `SELECT u.*, r.level as current_level, r.name as rank_name
     FROM users u
     JOIN ranks r ON u.rank_id = r.id
     WHERE u.id = $1`,
    [userId]
  );
  const user = userResult.rows[0];

  // Calculate team sales
  const teamSalesResult = await query(
    `WITH RECURSIVE team AS (
       SELECT id FROM users WHERE upline_id = $1
       UNION ALL
       SELECT u.id FROM users u JOIN team t ON u.upline_id = t.id
     )
     SELECT COUNT(*) as count FROM orders 
     WHERE partner_id IN (SELECT id FROM team)
     AND payment_status = 'paid'`,
    [userId]
  );
  const teamSales = parseInt(teamSalesResult.rows[0].count);

  // Find current and next rank
  const currentRank = ranks.find(r => r.id === user.rank_id);
  const nextRank = ranks.find(r => r.level === currentRank.level + 1);

  const progress = {
    currentRank: {
      ...currentRank,
      progress: 100
    },
    nextRank: nextRank ? {
      ...nextRank,
      requirements: {
        ownSales: { current: user.own_sales_count, required: nextRank.min_own_sales, progress: Math.min(100, (user.own_sales_count / nextRank.min_own_sales) * 100) },
        teamSales: { current: teamSales, required: nextRank.min_team_sales, progress: Math.min(100, (teamSales / nextRank.min_team_sales) * 100) },
        directPartners: { current: user.direct_partners_count, required: nextRank.min_direct_partners, progress: Math.min(100, (user.direct_partners_count / nextRank.min_direct_partners) * 100) }
      }
    } : null,
    allRanks: ranks.map(r => ({
      ...r,
      achieved: r.level <= currentRank.level,
      current: r.level === currentRank.level
    }))
  };

  res.json(progress);
});

/**
 * Get activity log
 */
export const getActivity = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  const result = await query(
    `SELECT * FROM activity_log 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, parseInt(limit), offset]
  );

  res.json({ activities: result.rows });
});