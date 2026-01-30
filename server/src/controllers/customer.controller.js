/**
 * Customer Portal Controller
 * ==========================
 * Handles customer-facing endpoints for:
 * - Customer registration/login
 * - Order history
 * - Invoice downloads
 * - Subscription management
 * - Profile management
 */

import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateInvoicePDF } from '../services/invoice.service.js';
import { sendEmail } from '../services/email.service.js';

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Register a new customer
 * POST /api/customer/register
 */
export const registerCustomer = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;

  // Validate
  if (!email || !password || !firstName || !lastName) {
    throw new AppError('Bitte füllen Sie alle Pflichtfelder aus', 400);
  }

  // Check if customer exists
  const existingCustomer = await query(
    'SELECT id FROM customers WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existingCustomer.rows.length > 0) {
    // Customer exists - check if they have a password
    const customer = await query(
      'SELECT id, password_hash FROM customers WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (customer.rows[0].password_hash) {
      throw new AppError('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.', 400);
    }
    
    // Guest customer upgrading to registered - update with password
    const hashedPassword = await bcrypt.hash(password, 12);
    await query(`
      UPDATE customers SET
        password_hash = $2,
        first_name = $3,
        last_name = $4,
        phone = $5,
        is_registered = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [customer.rows[0].id, hashedPassword, firstName, lastName, phone]);

    // Generate token
    const token = jwt.sign(
      { id: customer.rows[0].id, type: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Konto erfolgreich erstellt',
      token,
      customer: {
        id: customer.rows[0].id,
        email: email.toLowerCase(),
        firstName,
        lastName
      }
    });
  }

  // New customer registration
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const result = await query(`
    INSERT INTO customers (email, password_hash, first_name, last_name, phone, is_registered)
    VALUES ($1, $2, $3, $4, $5, true)
    RETURNING id, email, first_name, last_name
  `, [email.toLowerCase(), hashedPassword, firstName, lastName, phone]);

  const customer = result.rows[0];

  // Generate token
  const token = jwt.sign(
    { id: customer.id, type: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Send welcome email
  try {
    await sendEmail({
      to: email,
      subject: 'Willkommen bei CLYR',
      html: `
        <h1>Willkommen bei CLYR, ${firstName}!</h1>
        <p>Ihr Kundenkonto wurde erfolgreich erstellt.</p>
        <p>Sie können sich jetzt anmelden und Ihre Bestellungen verwalten.</p>
        <p><a href="${process.env.FRONTEND_URL}/customer/login">Zum Kundenbereich</a></p>
      `
    });
  } catch (e) {
    console.error('Welcome email failed:', e);
  }

  res.status(201).json({
    success: true,
    message: 'Konto erfolgreich erstellt',
    token,
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name
    }
  });
});

/**
 * Customer login
 * POST /api/customer/login
 */
export const loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('E-Mail und Passwort erforderlich', 400);
  }

  const result = await query(`
    SELECT id, email, password_hash, first_name, last_name, is_registered
    FROM customers WHERE email = $1
  `, [email.toLowerCase()]);

  if (result.rows.length === 0) {
    throw new AppError('Ungültige Anmeldedaten', 401);
  }

  const customer = result.rows[0];

  if (!customer.password_hash || !customer.is_registered) {
    throw new AppError('Bitte registrieren Sie sich zuerst mit dieser E-Mail-Adresse', 401);
  }

  const isValid = await bcrypt.compare(password, customer.password_hash);
  if (!isValid) {
    throw new AppError('Ungültige Anmeldedaten', 401);
  }

  // Generate token
  const token = jwt.sign(
    { id: customer.id, type: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Update last login
  await query('UPDATE customers SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [customer.id]);

  res.json({
    success: true,
    token,
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name
    }
  });
});

/**
 * Get current customer
 * GET /api/customer/me
 */
export const getCurrentCustomer = asyncHandler(async (req, res) => {
  const customerId = req.customer.id;

  const result = await query(`
    SELECT 
      id, email, first_name, last_name, phone, company, vat_id,
      street, zip, city, country,
      is_registered, created_at, last_login_at
    FROM customers WHERE id = $1
  `, [customerId]);

  if (result.rows.length === 0) {
    throw new AppError('Kunde nicht gefunden', 404);
  }

  res.json({ customer: result.rows[0] });
});

// ============================================
// ORDERS
// ============================================

/**
 * Get customer's order history
 * GET /api/customer/orders
 */
export const getCustomerOrders = asyncHandler(async (req, res) => {
  const customerId = req.customer.id;
  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get customer email
  const customerResult = await query('SELECT email FROM customers WHERE id = $1', [customerId]);
  if (customerResult.rows.length === 0) {
    throw new AppError('Kunde nicht gefunden', 404);
  }
  const customerEmail = customerResult.rows[0].email;

  // Get orders
  const ordersResult = await query(`
    SELECT 
      id, order_number, status, subtotal, shipping, vat, total,
      billing_address, shipping_address, tracking_number,
      created_at, shipped_at, delivered_at
    FROM orders 
    WHERE customer_email = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [customerEmail, parseInt(limit), offset]);

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) FROM orders WHERE customer_email = $1',
    [customerEmail]
  );

  res.json({
    orders: ordersResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
    }
  });
});

/**
 * Get single order details
 * GET /api/customer/orders/:orderNumber
 */
export const getCustomerOrder = asyncHandler(async (req, res) => {
  const customerId = req.customer.id;
  const { orderNumber } = req.params;

  // Get customer email
  const customerResult = await query('SELECT email FROM customers WHERE id = $1', [customerId]);
  const customerEmail = customerResult.rows[0].email;

  // Get order
  const orderResult = await query(`
    SELECT 
      o.*,
      json_agg(json_build_object(
        'id', oi.id,
        'product_name', oi.product_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total_price', oi.total_price
      )) as items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.order_number = $1 AND o.customer_email = $2
    GROUP BY o.id
  `, [orderNumber, customerEmail]);

  if (orderResult.rows.length === 0) {
    throw new AppError('Bestellung nicht gefunden', 404);
  }

  res.json({ order: orderResult.rows[0] });
});

/**
 * Download invoice for order
 * GET /api/customer/orders/:orderNumber/invoice
 */
export const downloadCustomerInvoice = asyncHandler(async (req, res) => {
  const customerId = req.customer.id;
  const { orderNumber } = req.params;

  // Get customer email
  const customerResult = await query('SELECT email FROM customers WHERE id = $1', [customerId]);
  const customerEmail = customerResult.rows[0].email;

  // Get order
  const orderResult = await query(`
    SELECT * FROM orders WHERE order_number = $1 AND customer_email = $2
  `, [orderNumber, customerEmail]);

  if (orderResult.rows.length === 0) {
    throw new AppError('Bestellung nicht gefunden', 404);
  }

  const order = orderResult.rows[0];

  // Check if order has been paid
  if (!['paid', 'processing', 'shipped', 'delivered', 'completed'].includes(order.status)) {
    throw new AppError('Rechnung nur für bezahlte Bestellungen verfügbar', 400);
  }

  // Get order items
  const itemsResult = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [order.id]
  );

  // Generate PDF
  const pdfBuffer = await generateInvoicePDF({
    ...order,
    items: itemsResult.rows
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${order.invoice_number || order.order_number}.pdf"`);
  res.send(pdfBuffer);
});

// ============================================
// SUBSCRIPTIONS
// ============================================

/**
 * Get customer's subscriptions
 * GET /api/customer/subscriptions
 */
export const getCustomerSubscriptions = asyncHandler(async (req, res) => {
  const customerId = req.customer.id;

  // Get customer's user_id if they're also a partner
  const customerResult = await query('SELECT email FROM customers WHERE id = $1', [customerId]);
  const customerEmail = customerResult.rows[0].email;

  // Get subscriptions
  const result = await query(`
    SELECT 
      s.*,
      p.name as product_name,
      p.price as product_price
    FROM subscriptions s
    LEFT JOIN products p ON p.id = s.product_id
    WHERE s.customer_email = $1
    ORDER BY s.created_at DESC
  `, [customerEmail]);

  res.json({ subscriptions: result.rows });
});

/**
 * Cancel a subscription
 * POST /api/customer/subscriptions/:id/cancel
 */
export const cancelSubscription = asyncHandler(async (req, res) => {
  const customerId = req.customer.id;
  const { id } = req.params;
  const { reason } = req.body;

  // Get customer email
  const customerResult = await query('SELECT email FROM customers WHERE id = $1', [customerId]);
  const customerEmail = customerResult.rows[0].email;

  // Check subscription belongs to customer
  const subResult = await query(`
    SELECT * FROM subscriptions WHERE id = $1 AND customer_email = $2
  `, [id, customerEmail]);

  if (subResult.rows.length === 0) {
    throw new AppError('Abonnement nicht gefunden', 404);
  }

  const subscription = subResult.rows[0];

  if (subscription.status === 'cancelled') {
    throw new AppError('Abonnement ist bereits gekündigt', 400);
  }

  // Cancel subscription (will run until end of current period)
  await query(`
    UPDATE subscriptions SET
      status = 'cancelled',
      cancelled_at = CURRENT_TIMESTAMP,
      cancellation_reason = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id, reason || 'Kundenwunsch']);

  // Cancel in Stripe if applicable
  if (subscription.stripe_subscription_id) {
    try {
      const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true
      });
    } catch (e) {
      console.error('Stripe cancellation failed:', e);
    }
  }

  res.json({
    success: true,
    message: 'Abonnement wurde gekündigt. Es läuft bis zum Ende der aktuellen Periode.'
  });
});

/**
 * Reactivate a cancelled subscription
 * POST /api/customer/subscriptions/:id/reactivate
 */
export const reactivateSubscription = asyncHandler(async (req, res) => {
  const customerId = req.customer.id;
  const { id } = req.params;

  // Get customer email
  const customerResult = await query('SELECT email FROM customers WHERE id = $1', [customerId]);
  const customerEmail = customerResult.rows[0].email;

  // Check subscription
  const subResult = await query(`
    SELECT * FROM subscriptions WHERE id = $1 AND customer_email = $2
  `, [id, customerEmail]);

  if (subResult.rows.length === 0) {
    throw new AppError('Abonnement nicht gefunden', 404);
  }

  const subscription = subResult.rows[0];

  if (subscription.status !== 'cancelled') {
    throw new AppError('Nur gekündigte Abonnements können reaktiviert werden', 400);
  }

  // Check if still within period
  if (new Date(subscription.next_billing_date) < new Date()) {
    throw new AppError('Abonnement ist bereits abgelaufen. Bitte erstellen Sie ein neues.', 400);
  }

  // Reactivate
  await query(`
    UPDATE subscriptions SET
      status = 'active',
      cancelled_at = NULL,
      cancellation_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [id]);

  // Reactivate in Stripe
  if (subscription.stripe_subscription_id) {
    try {
      const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false
      });
    } catch (e) {
      console.error('Stripe reactivation failed:', e);
    }
  }

  res.json({
    success: true,
    message: 'Abonnement wurde reaktiviert.'
  });
});

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Update customer profile
 * PUT /api/customer/profile
 */
export const updateCustomerProfile = asyncHandler(async (req, res) => {
  const customerId = req.customer.id;
  const { firstName, lastName, phone, company, vatId, street, zip, city, country } = req.body;

  await query(`
    UPDATE customers SET
      first_name = COALESCE($2, first_name),
      last_name = COALESCE($3, last_name),
      phone = COALESCE($4, phone),
      company = COALESCE($5, company),
      vat_id = COALESCE($6, vat_id),
      street = COALESCE($7, street),
      zip = COALESCE($8, zip),
      city = COALESCE($9, city),
      country = COALESCE($10, country),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [customerId, firstName, lastName, phone, company, vatId, street, zip, city, country]);

  res.json({ success: true, message: 'Profil aktualisiert' });
});

/**
 * Change customer password
 * PUT /api/customer/change-password
 */
export const changeCustomerPassword = asyncHandler(async (req, res) => {
  const customerId = req.customer.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Aktuelles und neues Passwort erforderlich', 400);
  }

  if (newPassword.length < 8) {
    throw new AppError('Neues Passwort muss mindestens 8 Zeichen haben', 400);
  }

  // Verify current password
  const result = await query('SELECT password_hash FROM customers WHERE id = $1', [customerId]);
  const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  
  if (!isValid) {
    throw new AppError('Aktuelles Passwort ist falsch', 401);
  }

  // Update password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await query('UPDATE customers SET password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', 
    [customerId, hashedPassword]);

  res.json({ success: true, message: 'Passwort geändert' });
});

/**
 * Request password reset
 * POST /api/customer/forgot-password
 */
export const forgotCustomerPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result = await query(
    'SELECT id, first_name FROM customers WHERE email = $1 AND is_registered = true',
    [email.toLowerCase()]
  );

  // Always return success to prevent email enumeration
  if (result.rows.length === 0) {
    return res.json({ success: true, message: 'Falls ein Konto existiert, wurde eine E-Mail gesendet.' });
  }

  const customer = result.rows[0];

  // Generate reset token
  const resetToken = jwt.sign(
    { id: customer.id, type: 'customer_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Store token
  await query(`
    UPDATE customers SET
      password_reset_token = $2,
      password_reset_expires = NOW() + INTERVAL '1 hour'
    WHERE id = $1
  `, [customer.id, resetToken]);

  // Send email
  try {
    await sendEmail({
      to: email,
      subject: 'Passwort zurücksetzen - CLYR',
      html: `
        <h1>Passwort zurücksetzen</h1>
        <p>Hallo ${customer.first_name},</p>
        <p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
        <p><a href="${process.env.FRONTEND_URL}/customer/reset-password?token=${resetToken}">Passwort zurücksetzen</a></p>
        <p>Der Link ist 1 Stunde gültig.</p>
        <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.</p>
      `
    });
  } catch (e) {
    console.error('Reset email failed:', e);
  }

  res.json({ success: true, message: 'Falls ein Konto existiert, wurde eine E-Mail gesendet.' });
});

/**
 * Reset password with token
 * POST /api/customer/reset-password
 */
export const resetCustomerPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new AppError('Token und neues Passwort erforderlich', 400);
  }

  if (newPassword.length < 8) {
    throw new AppError('Passwort muss mindestens 8 Zeichen haben', 400);
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    throw new AppError('Ungültiger oder abgelaufener Token', 400);
  }

  if (decoded.type !== 'customer_reset') {
    throw new AppError('Ungültiger Token-Typ', 400);
  }

  // Check token in database
  const result = await query(`
    SELECT id FROM customers 
    WHERE id = $1 AND password_reset_token = $2 AND password_reset_expires > NOW()
  `, [decoded.id, token]);

  if (result.rows.length === 0) {
    throw new AppError('Token ungültig oder abgelaufen', 400);
  }

  // Update password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await query(`
    UPDATE customers SET
      password_hash = $2,
      password_reset_token = NULL,
      password_reset_expires = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [decoded.id, hashedPassword]);

  res.json({ success: true, message: 'Passwort wurde geändert. Sie können sich jetzt anmelden.' });
});
