import { query, transaction } from '../config/database.js';

/**
 * CLYR Subscription Controller
 * Handles recurring filter subscriptions (Filter-Abo)
 */

/**
 * Get customer's subscriptions
 */
export const getMySubscriptions = async (req, res) => {
  try {
    const { customerId } = req.params; // For admin viewing customer
    const userId = customerId || req.user.id;

    const result = await query(
      `SELECT s.*, p.name as product_name, p.sku, p.images
       FROM subscriptions s
       JOIN products p ON s.product_id = p.id
       WHERE s.customer_id = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Abonnements'
    });
  }
};

/**
 * Create subscription after order
 */
export const createSubscription = async (customerId, productId, price, partnerId, orderId) => {
  const startsAt = new Date();
  const nextBillingAt = new Date();
  nextBillingAt.setMonth(nextBillingAt.getMonth() + 12); // 12 months interval

  const result = await query(
    `INSERT INTO subscriptions (
      customer_id, product_id, price, partner_id, 
      status, interval_months, starts_at, next_billing_at
     )
     VALUES ($1, $2, $3, $4, 'active', 12, $5, $6)
     RETURNING *`,
    [customerId, productId, price, partnerId, startsAt, nextBillingAt]
  );

  // Log the subscription creation
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, 'subscription_created', 'subscription', $2, $3)`,
    [partnerId, result.rows[0].id, JSON.stringify({ orderId, productId })]
  );

  return result.rows[0];
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check permission
    const subResult = await query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement nicht gefunden'
      });
    }

    const subscription = subResult.rows[0];

    // Allow admin or the customer to cancel
    if (req.user.role !== 'admin' && subscription.customer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung'
      });
    }

    const result = await query(
      `UPDATE subscriptions 
       SET status = 'cancelled', 
           cancelled_at = CURRENT_TIMESTAMP,
           expires_at = next_billing_at
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Log cancellation
    await query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'subscription_cancelled', 'subscription', $2, $3)`,
      [req.user.id, id, JSON.stringify({ reason })]
    );

    res.json({
      success: true,
      message: 'Abonnement gekündigt. Es läuft bis zum Ende der aktuellen Periode.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Kündigen des Abonnements'
    });
  }
};

/**
 * Pause subscription
 */
export const pauseSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE subscriptions 
       SET status = 'paused'
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement nicht gefunden oder kann nicht pausiert werden'
      });
    }

    res.json({
      success: true,
      message: 'Abonnement pausiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Pausieren'
    });
  }
};

/**
 * Resume subscription
 */
export const resumeSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE subscriptions 
       SET status = 'active'
       WHERE id = $1 AND status = 'paused'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement nicht gefunden oder kann nicht fortgesetzt werden'
      });
    }

    res.json({
      success: true,
      message: 'Abonnement fortgesetzt',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Fortsetzen'
    });
  }
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * Get all subscriptions (admin)
 */
export const getAllSubscriptions = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let queryStr = `
      SELECT s.*, 
             c.email as customer_email, c.first_name as customer_first_name, c.last_name as customer_last_name,
             p.name as product_name, p.sku,
             u.email as partner_email, u.first_name as partner_first_name, u.last_name as partner_last_name
      FROM subscriptions s
      JOIN customers c ON s.customer_id = c.id
      JOIN products p ON s.product_id = p.id
      LEFT JOIN users u ON s.partner_id = u.id
    `;
    
    const params = [];
    
    if (status) {
      params.push(status);
      queryStr += ` WHERE s.status = $${params.length}`;
    }

    queryStr += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await query(queryStr, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM subscriptions';
    const countParams = [];
    if (status) {
      countParams.push(status);
      countQuery += ' WHERE status = $1';
    }
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: {
        subscriptions: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Abonnements'
    });
  }
};

/**
 * Get subscriptions due for renewal (admin/cron)
 */
export const getDueSubscriptions = async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysAhead);

    const result = await query(
      `SELECT s.*, 
              c.email as customer_email, c.first_name, c.last_name,
              p.name as product_name, p.price as current_price
       FROM subscriptions s
       JOIN customers c ON s.customer_id = c.id
       JOIN products p ON s.product_id = p.id
       WHERE s.status = 'active'
       AND s.next_billing_at <= $1
       ORDER BY s.next_billing_at ASC`,
      [dueDate]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting due subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der fälligen Abonnements'
    });
  }
};

/**
 * Process subscription renewal (admin/cron)
 */
export const renewSubscription = async (subscriptionId) => {
  return await transaction(async (client) => {
    // Get subscription details
    const subResult = await client.query(
      `SELECT s.*, c.email, c.first_name, c.last_name, c.stripe_customer_id,
              p.name as product_name, p.price as current_price
       FROM subscriptions s
       JOIN customers c ON s.customer_id = c.id
       JOIN products p ON s.product_id = p.id
       WHERE s.id = $1 AND s.status = 'active'`,
      [subscriptionId]
    );

    if (subResult.rows.length === 0) {
      throw new Error('Subscription not found or not active');
    }

    const subscription = subResult.rows[0];

    // Create renewal order
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, customer_id, customer_email, customer_first_name, customer_last_name,
        subtotal, total, partner_id, status, payment_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, 'pending', 'pending')
       RETURNING *`,
      [
        orderNumber,
        subscription.customer_id,
        subscription.email,
        subscription.first_name,
        subscription.last_name,
        subscription.price,
        subscription.partner_id
      ]
    );

    // Create order item
    await client.query(
      `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, total)
       VALUES ($1, $2, $3, $4, 1, $4)`,
      [orderResult.rows[0].id, subscription.product_id, subscription.product_name, subscription.price]
    );

    // Update next billing date
    const nextBilling = new Date(subscription.next_billing_at);
    nextBilling.setMonth(nextBilling.getMonth() + subscription.interval_months);

    await client.query(
      `UPDATE subscriptions SET next_billing_at = $1 WHERE id = $2`,
      [nextBilling, subscriptionId]
    );

    return {
      order: orderResult.rows[0],
      subscription: { ...subscription, next_billing_at: nextBilling }
    };
  });
};

/**
 * Run renewal cycle (cron job)
 */
export const runRenewalCycle = async (req, res) => {
  try {
    // Get subscriptions due today
    const dueResult = await query(
      `SELECT id FROM subscriptions 
       WHERE status = 'active' 
       AND next_billing_at <= CURRENT_DATE`,
      []
    );

    const results = {
      processed: 0,
      errors: []
    };

    for (const sub of dueResult.rows) {
      try {
        await renewSubscription(sub.id);
        results.processed++;
      } catch (error) {
        results.errors.push({
          subscriptionId: sub.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Renewal cycle complete: ${results.processed} renewed, ${results.errors.length} errors`,
      data: results
    });
  } catch (error) {
    console.error('Error running renewal cycle:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ausführen des Erneuerungszyklus'
    });
  }
};

/**
 * Get subscription stats (admin)
 */
export const getSubscriptionStats = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'paused' THEN 1 END) as paused_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        SUM(CASE WHEN status = 'active' THEN price ELSE 0 END) as monthly_recurring,
        SUM(CASE WHEN status = 'active' THEN price ELSE 0 END) * 12 as annual_recurring
      FROM subscriptions
    `);

    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        active: parseInt(stats.active_count) || 0,
        paused: parseInt(stats.paused_count) || 0,
        cancelled: parseInt(stats.cancelled_count) || 0,
        monthlyRecurring: parseFloat(stats.monthly_recurring) || 0,
        annualRecurring: parseFloat(stats.annual_recurring) || 0
      }
    });
  } catch (error) {
    console.error('Error getting subscription stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
};
