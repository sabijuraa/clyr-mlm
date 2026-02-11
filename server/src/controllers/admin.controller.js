import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  // Get date ranges
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  // Total revenue
  const revenueResult = await query(
    `SELECT 
       COALESCE(SUM(CASE WHEN created_at >= $1 THEN total ELSE 0 END), 0) as this_month,
       COALESCE(SUM(CASE WHEN created_at >= $2 AND created_at <= $3 THEN total ELSE 0 END), 0) as last_month,
       COALESCE(SUM(total), 0) as all_time
     FROM orders
     WHERE payment_status = 'paid'`,
    [monthStart, lastMonthStart, lastMonthEnd]
  );

  // Orders count
  const ordersResult = await query(
    `SELECT 
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
       COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
       COUNT(CASE WHEN created_at >= $1 THEN 1 END) as this_month
     FROM orders`,
    [monthStart]
  );

  // Partners count
  const partnersResult = await query(
    `SELECT 
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
       COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_this_month
     FROM users
     WHERE role = 'partner'`,
    [monthStart]
  );

  // Commissions
  const commissionsResult = await query(
    `SELECT 
       COALESCE(SUM(CASE WHEN status = 'held' THEN amount ELSE 0 END), 0) as held,
       COALESCE(SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END), 0) as pending_payout,
       COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= $1 THEN amount ELSE 0 END), 0) as paid_this_month
     FROM commissions`,
    [monthStart]
  );

  // Recent orders
  const recentOrdersResult = await query(
    `SELECT o.id, o.order_number, o.customer_first_name, o.customer_last_name,
            o.total, o.status, o.payment_status, o.created_at,
            p.first_name as partner_first_name, p.last_name as partner_last_name
     FROM orders o
     LEFT JOIN users p ON o.partner_id = p.id
     ORDER BY o.created_at DESC
     LIMIT 5`
  );

  // Recent partners
  const recentPartnersResult = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.status, u.created_at,
            r.name as rank_name, r.color as rank_color
     FROM users u
     JOIN ranks r ON u.rank_id = r.id
     WHERE u.role = 'partner'
     ORDER BY u.created_at DESC
     LIMIT 5`
  );

  // Daily revenue (last 30 days)
  const dailyRevenueResult = await query(
    `SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as revenue, COUNT(*) as orders
     FROM orders
     WHERE payment_status = 'paid' AND created_at >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  );

  const revenue = revenueResult.rows[0];
  const revenueGrowth = revenue.last_month > 0 
    ? Math.round(((revenue.this_month - revenue.last_month) / revenue.last_month) * 100)
    : 0;

  res.json({
    revenue: {
      thisMonth: parseFloat(revenue.this_month),
      lastMonth: parseFloat(revenue.last_month),
      allTime: parseFloat(revenue.all_time),
      growth: revenueGrowth
    },
    orders: {
      total: parseInt(ordersResult.rows[0].total),
      pending: parseInt(ordersResult.rows[0].pending),
      processing: parseInt(ordersResult.rows[0].processing),
      completed: parseInt(ordersResult.rows[0].completed),
      thisMonth: parseInt(ordersResult.rows[0].this_month)
    },
    partners: {
      total: parseInt(partnersResult.rows[0].total),
      active: parseInt(partnersResult.rows[0].active),
      pending: parseInt(partnersResult.rows[0].pending),
      newThisMonth: parseInt(partnersResult.rows[0].new_this_month)
    },
    commissions: {
      held: parseFloat(commissionsResult.rows[0].held),
      pendingPayout: parseFloat(commissionsResult.rows[0].pending_payout),
      paidThisMonth: parseFloat(commissionsResult.rows[0].paid_this_month)
    },
    recentOrders: recentOrdersResult.rows,
    recentPartners: recentPartnersResult.rows,
    dailyRevenue: dailyRevenueResult.rows
  });
});

/**
 * Get all partners
 */
export const getPartners = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, rank, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = "WHERE u.role = 'partner'";
  const params = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND u.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (rank) {
    whereClause += ` AND r.slug = $${paramIndex}`;
    params.push(rank);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u.referral_code ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const allowedSortFields = ['created_at', 'first_name', 'last_name', 'own_sales_count', 'total_earned'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const countResult = await query(
    `SELECT COUNT(*) FROM users u JOIN ranks r ON u.rank_id = r.id ${whereClause}`,
    params
  );

  const partnersResult = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.referral_code,
            u.status, u.created_at, u.own_sales_count, u.direct_partners_count,
            u.total_earned, u.wallet_balance, u.city, u.country,
            r.name as rank_name, r.color as rank_color, r.commission_rate,
            up.first_name as upline_first_name, up.last_name as upline_last_name
     FROM users u
     JOIN ranks r ON u.rank_id = r.id
     LEFT JOIN users up ON u.upline_id = up.id
     ${whereClause}
     ORDER BY u.${sortField} ${order}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    partners: partnersResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

/**
 * Get partner by ID
 */
export const getPartnerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const partnerResult = await query(
    `SELECT u.*, r.name as rank_name, r.color as rank_color, r.commission_rate,
            up.first_name as upline_first_name, up.last_name as upline_last_name, up.email as upline_email
     FROM users u
     JOIN ranks r ON u.rank_id = r.id
     LEFT JOIN users up ON u.upline_id = up.id
     WHERE u.id = $1`,
    [id]
  );

  if (partnerResult.rows.length === 0) {
    throw new AppError('Partner nicht gefunden', 404);
  }

  const partner = partnerResult.rows[0];
  delete partner.password_hash;

  // Get stats
  const statsResult = await query(
    `SELECT 
       (SELECT COUNT(*) FROM orders WHERE partner_id = $1 AND payment_status = 'paid') as total_orders,
       (SELECT COALESCE(SUM(total), 0) FROM orders WHERE partner_id = $1 AND payment_status = 'paid') as total_revenue,
       (SELECT COUNT(*) FROM users WHERE upline_id = $1) as direct_partners,
       (SELECT COUNT(*) FROM customers WHERE referred_by = $1) as total_customers`,
    [id]
  );

  // Get recent orders
  const ordersResult = await query(
    `SELECT id, order_number, customer_first_name, customer_last_name, total, status, created_at
     FROM orders WHERE partner_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [id]
  );

  // Get commission history
  const commissionsResult = await query(
    `SELECT c.*, o.order_number
     FROM commissions c
     LEFT JOIN orders o ON c.order_id = o.id
     WHERE c.user_id = $1
     ORDER BY c.created_at DESC LIMIT 20`,
    [id]
  );

  res.json({
    partner,
    stats: statsResult.rows[0],
    recentOrders: ordersResult.rows,
    commissions: commissionsResult.rows
  });
});

/**
 * Update partner status
 */
export const updatePartnerStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const validStatuses = ['pending', 'active', 'inactive', 'suspended'];
  if (!validStatuses.includes(status)) {
    throw new AppError('Ungültiger Status', 400);
  }

  const result = await query(
    'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, first_name, last_name, status',
    [status, id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Partner nicht gefunden', 404);
  }

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user.id, 'partner_status_updated', 'user', id, JSON.stringify({ status, reason })]
  );

  res.json({
    message: 'Status aktualisiert',
    partner: result.rows[0]
  });
});

/**
 * Update partner rank
 */
export const updatePartnerRank = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rankId, reason } = req.body;

  const rankResult = await query('SELECT * FROM ranks WHERE id = $1', [rankId]);
  if (rankResult.rows.length === 0) {
    throw new AppError('Rang nicht gefunden', 404);
  }

  const result = await query(
    `UPDATE users SET rank_id = $1 WHERE id = $2 
     RETURNING id, first_name, last_name, rank_id`,
    [rankId, id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Partner nicht gefunden', 404);
  }

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user.id, 'partner_rank_updated', 'user', id, JSON.stringify({ rankId, reason })]
  );

  res.json({
    message: 'Rang aktualisiert',
    partner: result.rows[0],
    rank: rankResult.rows[0]
  });
});

/**
 * Get settings
 */
export const getSettings = asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM settings ORDER BY key ASC');
  
  const settings = {};
  result.rows.forEach(row => {
    settings[row.key] = {
      value: row.value,
      description: row.description,
      updatedAt: row.updated_at
    };
  });

  res.json({ settings });
});

/**
 * Update setting
 */
export const updateSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  const result = await query(
    `UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP 
     WHERE key = $2 RETURNING *`,
    [JSON.stringify(value), key]
  );

  if (result.rows.length === 0) {
    throw new AppError('Einstellung nicht gefunden', 404);
  }

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user.id, 'setting_updated', 'setting', key, JSON.stringify({ value })]
  );

  res.json({
    message: 'Einstellung aktualisiert',
    setting: result.rows[0]
  });
});

/**
 * Get sales report
 */
export const getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  let dateFormat;
  switch (groupBy) {
    case 'month':
      dateFormat = 'YYYY-MM';
      break;
    case 'week':
      dateFormat = 'IYYY-IW';
      break;
    default:
      dateFormat = 'YYYY-MM-DD';
  }

  let whereClause = "WHERE payment_status = 'paid'";
  const params = [];

  if (startDate) {
    params.push(startDate);
    whereClause += ` AND created_at >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    whereClause += ` AND created_at <= $${params.length}`;
  }

  const result = await query(
    `SELECT 
       TO_CHAR(created_at, '${dateFormat}') as period,
       COUNT(*) as orders,
       COALESCE(SUM(subtotal), 0) as subtotal,
       COALESCE(SUM(shipping_cost), 0) as shipping,
       COALESCE(SUM(vat_amount), 0) as vat,
       COALESCE(SUM(total), 0) as total,
       COUNT(DISTINCT partner_id) as partners_involved
     FROM orders
     ${whereClause}
     GROUP BY TO_CHAR(created_at, '${dateFormat}')
     ORDER BY period DESC`,
    params
  );

  // Get totals
  const totalsResult = await query(
    `SELECT 
       COUNT(*) as total_orders,
       COALESCE(SUM(total), 0) as total_revenue,
       COALESCE(AVG(total), 0) as avg_order_value
     FROM orders
     ${whereClause}`,
    params
  );

  res.json({
    data: result.rows,
    totals: totalsResult.rows[0]
  });
});

/**
 * Get commissions report
 */
export const getCommissionsReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (startDate) {
    params.push(startDate);
    whereClause += ` AND c.created_at >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    whereClause += ` AND c.created_at <= $${params.length}`;
  }

  // By type
  const byTypeResult = await query(
    `SELECT type, status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
     FROM commissions c
     ${whereClause}
     GROUP BY type, status
     ORDER BY type, status`,
    params
  );

  // Top earners
  const topEarnersResult = await query(
    `SELECT u.id, u.first_name, u.last_name, u.email, r.name as rank_name,
            COALESCE(SUM(c.amount), 0) as total_earned
     FROM commissions c
     JOIN users u ON c.user_id = u.id
     JOIN ranks r ON u.rank_id = r.id
     ${whereClause} AND c.status IN ('released', 'paid')
     GROUP BY u.id, u.first_name, u.last_name, u.email, r.name
     ORDER BY total_earned DESC
     LIMIT 10`,
    params
  );

  res.json({
    byType: byTypeResult.rows,
    topEarners: topEarnersResult.rows
  });
});

/**
 * Get partners report
 */
export const getPartnersReport = asyncHandler(async (req, res) => {
  // By rank
  const byRankResult = await query(
    `SELECT r.name, r.color, COUNT(u.id) as count
     FROM ranks r
     LEFT JOIN users u ON r.id = u.rank_id AND u.role = 'partner'
     GROUP BY r.id, r.name, r.color, r.level
     ORDER BY r.level ASC`
  );

  // By status
  const byStatusResult = await query(
    `SELECT status, COUNT(*) as count
     FROM users WHERE role = 'partner'
     GROUP BY status`
  );

  // By country
  const byCountryResult = await query(
    `SELECT country, COUNT(*) as count
     FROM users WHERE role = 'partner'
     GROUP BY country
     ORDER BY count DESC`
  );

  // Growth (last 12 months)
  const growthResult = await query(
    `SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as new_partners
     FROM users
     WHERE role = 'partner' AND created_at >= CURRENT_DATE - INTERVAL '12 months'
     GROUP BY TO_CHAR(created_at, 'YYYY-MM')
     ORDER BY month ASC`
  );

  res.json({
    byRank: byRankResult.rows,
    byStatus: byStatusResult.rows,
    byCountry: byCountryResult.rows,
    growth: growthResult.rows
  });
});

/**
 * Export orders to CSV
 */
export const exportOrders = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (startDate) {
    params.push(startDate);
    whereClause += ` AND o.created_at >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    whereClause += ` AND o.created_at <= $${params.length}`;
  }

  if (status) {
    params.push(status);
    whereClause += ` AND o.status = $${params.length}`;
  }

  const result = await query(
    `SELECT o.order_number, o.created_at, o.customer_first_name, o.customer_last_name,
            o.customer_email, o.billing_city, o.billing_country, o.subtotal, o.shipping_cost,
            o.vat_rate, o.vat_amount, o.total, o.status, o.payment_status,
            p.first_name as partner_first_name, p.last_name as partner_last_name, p.referral_code
     FROM orders o
     LEFT JOIN users p ON o.partner_id = p.id
     ${whereClause}
     ORDER BY o.created_at DESC`,
    params
  );

  // Convert to CSV
  const headers = [
    'Bestellnummer', 'Datum', 'Vorname', 'Nachname', 'E-Mail', 'Stadt', 'Land',
    'Zwischensumme', 'Versand', 'MwSt %', 'MwSt', 'Gesamt', 'Status', 'Zahlungsstatus',
    'Partner Vorname', 'Partner Nachname', 'Empfehlungscode'
  ];

  const rows = result.rows.map(o => [
    o.order_number,
    new Date(o.created_at).toLocaleDateString('de-DE'),
    o.customer_first_name,
    o.customer_last_name,
    o.customer_email,
    o.billing_city,
    o.billing_country,
    o.subtotal,
    o.shipping_cost,
    o.vat_rate,
    o.vat_amount,
    o.total,
    o.status,
    o.payment_status,
    o.partner_first_name || '',
    o.partner_last_name || '',
    o.referral_code || ''
  ]);

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bestellungen-export-${Date.now()}.csv"`);
  res.send('\uFEFF' + csv); // BOM for Excel
});

/**
 * Export commissions to CSV
 */
export const exportCommissions = asyncHandler(async (req, res) => {
  const { startDate, endDate, userId } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (startDate) {
    params.push(startDate);
    whereClause += ` AND c.created_at >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    whereClause += ` AND c.created_at <= $${params.length}`;
  }

  if (userId) {
    params.push(userId);
    whereClause += ` AND c.user_id = $${params.length}`;
  }

  const result = await query(
    `SELECT c.created_at, c.type, c.amount, c.rate, c.status, c.description,
            u.first_name, u.last_name, u.email, u.country,
            o.order_number
     FROM commissions c
     JOIN users u ON c.user_id = u.id
     LEFT JOIN orders o ON c.order_id = o.id
     ${whereClause}
     ORDER BY c.created_at DESC`,
    params
  );

  const headers = [
    'Datum', 'Partner Vorname', 'Partner Nachname', 'E-Mail', 'Land',
    'Typ', 'Bestellung', 'Betrag', 'Rate %', 'Status', 'Beschreibung'
  ];

  const rows = result.rows.map(c => [
    new Date(c.created_at).toLocaleDateString('de-DE'),
    c.first_name,
    c.last_name,
    c.email,
    c.country,
    c.type,
    c.order_number || '-',
    c.amount,
    c.rate || '-',
    c.status,
    c.description || ''
  ]);

  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="provisionen-export-${Date.now()}.csv"`);
  res.send('\uFEFF' + csv);
});

/**
 * Get activity log
 */
export const getActivityLog = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, userId } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (action) {
    whereClause += ` AND a.action = $${paramIndex}`;
    params.push(action);
    paramIndex++;
  }

  if (userId) {
    whereClause += ` AND a.user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM activity_log a ${whereClause}`,
    params
  );

  const result = await query(
    `SELECT a.*, u.first_name, u.last_name, u.email
     FROM activity_log a
     LEFT JOIN users u ON a.user_id = u.id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    activities: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

/**
 * Get branding settings
 */
export const getBranding = asyncHandler(async (req, res) => {
  const result = await query("SELECT value FROM settings WHERE key = 'branding'");
  
  // Return stored branding or empty object (frontend uses defaults)
  res.json(result.rows[0]?.value || {});
});

/**
 * Update branding settings
 */
export const updateBranding = asyncHandler(async (req, res) => {
  const branding = req.body;
  
  // Validate required fields
  if (!branding) {
    throw new AppError('Branding-Daten erforderlich', 400);
  }

  // Upsert branding settings
  await query(
    `INSERT INTO settings (key, value, description) 
     VALUES ('branding', $1, 'Company branding configuration')
     ON CONFLICT (key) 
     DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(branding)]
  );

  // Log the activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, details)
     VALUES ($1, $2, $3, $4)`,
    [req.user.id, 'branding_updated', 'settings', JSON.stringify({ updated_fields: Object.keys(branding) })]
  );

  res.json({ 
    message: 'Branding erfolgreich aktualisiert', 
    branding 
  });
});

/**
 * Upload branding logo
 */
export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.uploadedFile && !req.file) {
    throw new AppError('Kein Logo hochgeladen', 400);
  }

  const logoUrl = req.uploadedFile || `/images/branding/${req.file?.filename || 'logo.png'}`;

  // Update branding with new logo
  const existing = await query("SELECT value FROM settings WHERE key = 'branding'");
  const currentBranding = existing.rows[0]?.value || {};
  currentBranding.logo = logoUrl;
  
  await query(
    `INSERT INTO settings (key, value, description) 
     VALUES ('branding', $1, 'Company branding configuration')
     ON CONFLICT (key) 
     DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
    [JSON.stringify(currentBranding)]
  );

  // Log the activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, details)
     VALUES ($1, $2, $3, $4)`,
    [req.user.id, 'logo_uploaded', 'settings', JSON.stringify({ logoUrl })]
  );

  res.json({ 
    message: 'Logo erfolgreich hochgeladen',
    url: logoUrl,
    logoUrl 
  });
});

/**
 * Get all invoices (customer and commission)
 */
export const getInvoices = asyncHandler(async (req, res) => {
  const { type = 'all', page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  if (type === 'customer') {
    whereClause = "WHERE i.type = 'customer'";
  } else if (type === 'commission') {
    whereClause = "WHERE i.type = 'commission'";
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM invoices i ${whereClause}`
  );

  const result = await query(
    `SELECT i.*,
            o.order_number,
            c.email as customer_email, c.first_name as customer_first_name, c.last_name as customer_last_name,
            u.email as partner_email, u.first_name as partner_first_name, u.last_name as partner_last_name
     FROM invoices i
     LEFT JOIN orders o ON i.order_id = o.id
     LEFT JOIN customers c ON i.customer_id = c.id
     LEFT JOIN users u ON i.partner_id = u.id
     ${whereClause}
     ORDER BY i.created_at DESC
     LIMIT $1 OFFSET $2`,
    [parseInt(limit), offset]
  );

  // Format for frontend
  const invoices = result.rows.map(inv => ({
    ...inv,
    customer_name: inv.customer_first_name ? `${inv.customer_first_name} ${inv.customer_last_name}` : null,
    partner_name: inv.partner_first_name ? `${inv.partner_first_name} ${inv.partner_last_name}` : null
  }));

  res.json({
    invoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});