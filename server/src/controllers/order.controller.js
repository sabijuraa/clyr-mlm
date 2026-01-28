import Stripe from 'stripe';
import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/error.middleware.js';
import { calculateCommissions } from '../services/commission.service.js';
import { generateInvoicePDF } from '../services/invoice.service.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Generate unique order number
 */
const generateOrderNumber = async () => {
  const date = new Date();
  const prefix = `FL${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const result = await query(
    `SELECT order_number FROM orders 
     WHERE order_number LIKE $1 
     ORDER BY created_at DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let sequence = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].order_number;
    sequence = parseInt(lastNumber.slice(-4)) + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

/**
 * Get shipping cost based on country and items
 */
const getShippingCost = async (country, items, products) => {
  const settingsResult = await query("SELECT value FROM settings WHERE key = 'shipping_costs'");
  const shippingCosts = settingsResult.rows[0]?.value || {
    DE: { small: 9.90, large: 39.39, threshold: 100 },
    AT: { small: 9.90, large: 69.90, threshold: 100 },
    CH: { flat: 170 }
  };

  const countryConfig = shippingCosts[country];
  if (!countryConfig) {
    throw new AppError(`Versand nach ${country} nicht verfügbar`, 400);
  }

  // Switzerland has flat rate
  if (country === 'CH') {
    return countryConfig.flat;
  }

  // Check if any item is a large item
  const hasLargeItem = items.some(item => {
    const product = products.find(p => p.id === item.productId);
    return product?.is_large_item;
  });

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  // Large items or orders above threshold get large shipping rate
  if (hasLargeItem || subtotal >= countryConfig.threshold) {
    return countryConfig.large;
  }

  return countryConfig.small;
};

/**
 * Get VAT rate based on country and customer type
 */
const getVatRate = async (country, hasVatId = false) => {
  // Business customer with VAT ID from Austria = Reverse Charge
  if (country === 'AT' && hasVatId) {
    return 0;
  }

  const settingsResult = await query("SELECT value FROM settings WHERE key = 'vat_rates'");
  const vatRates = settingsResult.rows[0]?.value || { DE: 19, AT: 20, CH: 0 };

  return vatRates[country] || 0;
};

/**
 * Calculate order totals
 */
export const calculateOrderTotals = asyncHandler(async (req, res) => {
  const { items, country, hasVatId = false } = req.body;

  if (!items || items.length === 0) {
    throw new AppError('Keine Artikel angegeben', 400);
  }

  // Get products
  const productIds = items.map(item => item.productId);
  const productsResult = await query(
    'SELECT * FROM products WHERE id = ANY($1) AND is_active = true',
    [productIds]
  );

  if (productsResult.rows.length !== productIds.length) {
    throw new AppError('Ein oder mehrere Produkte nicht gefunden', 404);
  }

  const products = productsResult.rows;

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + product.price * item.quantity;
  }, 0);

  // Get shipping cost
  const shippingCost = await getShippingCost(country, items, products);

  // Get VAT rate
  const vatRate = await getVatRate(country, hasVatId);

  // Calculate VAT (on subtotal + shipping)
  const taxableAmount = subtotal + shippingCost;
  const vatAmount = Math.round(taxableAmount * (vatRate / 100) * 100) / 100;

  // Calculate total
  const total = Math.round((taxableAmount + vatAmount) * 100) / 100;

  res.json({
    subtotal: Math.round(subtotal * 100) / 100,
    shippingCost,
    vatRate,
    vatAmount,
    total,
    items: items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: product.price * item.quantity,
        image: product.images?.[0] || null
      };
    })
  });
});

/**
 * Create payment intent
 */
export const createPaymentIntent = asyncHandler(async (req, res) => {
  const { amount, currency = 'eur', metadata = {} } = req.body;

  if (!amount || amount < 50) {
    throw new AppError('Betrag muss mindestens 0,50€ sein', 400);
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    automatic_payment_methods: { enabled: true },
    metadata
  });

  res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  });
});

/**
 * Create order
 */
export const createOrder = asyncHandler(async (req, res) => {
  const {
    customer,
    billing,
    shipping,
    items,
    referralCode,
    discountCode,
    paymentMethod,
    stripePaymentIntentId,
    customerNotes
  } = req.body;

  // Validate items and get products
  const productIds = items.map(item => item.productId);
  const productsResult = await query(
    'SELECT * FROM products WHERE id = ANY($1) AND is_active = true',
    [productIds]
  );

  if (productsResult.rows.length !== productIds.length) {
    throw new AppError('Ein oder mehrere Produkte nicht verfügbar', 400);
  }

  const products = productsResult.rows;

  // Check stock
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (product.track_stock && product.stock < item.quantity) {
      throw new AppError(`${product.name} ist nicht in ausreichender Menge verfügbar`, 400);
    }
  }

  // Find partner by referral code
  let partnerId = null;
  if (referralCode) {
    const partnerResult = await query(
      'SELECT id FROM users WHERE referral_code = $1 AND status = $2',
      [referralCode.toUpperCase(), 'active']
    );
    if (partnerResult.rows.length > 0) {
      partnerId = partnerResult.rows[0].id;
    }
  }

  // Calculate totals
  const country = billing.country;
  const hasVatId = !!customer.vatId;
  
  const subtotal = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + product.price * item.quantity;
  }, 0);

  const shippingCost = await getShippingCost(country, items, products);
  const vatRate = await getVatRate(country, hasVatId);
  const taxableAmount = subtotal + shippingCost;
  const vatAmount = Math.round(taxableAmount * (vatRate / 100) * 100) / 100;

  // Handle discount code
  let discountAmount = 0;
  let appliedDiscountCode = null;
  if (discountCode) {
    const discountResult = await query(
      `SELECT * FROM discount_codes 
       WHERE code = $1 
       AND is_active = true 
       AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      [discountCode.toUpperCase()]
    );

    if (discountResult.rows.length > 0) {
      const discount = discountResult.rows[0];
      if (subtotal >= discount.min_order_amount) {
        if (discount.type === 'percentage') {
          discountAmount = Math.round(subtotal * (discount.value / 100) * 100) / 100;
        } else {
          discountAmount = Math.min(discount.value, subtotal);
        }
        appliedDiscountCode = discount;
      }
    }
  }

  const total = Math.round((taxableAmount + vatAmount - discountAmount) * 100) / 100;

  // Create order in transaction
  const order = await transaction(async (client) => {
    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Find or create customer
    let customerId = null;
    const existingCustomer = await client.query(
      'SELECT id FROM customers WHERE email = $1',
      [customer.email.toLowerCase()]
    );

    if (existingCustomer.rows.length > 0) {
      customerId = existingCustomer.rows[0].id;
      // Update customer info
      await client.query(
        `UPDATE customers SET
          first_name = $1, last_name = $2, phone = $3,
          street = $4, zip = $5, city = $6, country = $7,
          company = $8, vat_id = $9, referred_by = COALESCE(referred_by, $10)
         WHERE id = $11`,
        [
          customer.firstName, customer.lastName, customer.phone,
          billing.street, billing.zip, billing.city, billing.country,
          customer.company, customer.vatId, partnerId,
          customerId
        ]
      );
    } else {
      const newCustomer = await client.query(
        `INSERT INTO customers (email, first_name, last_name, phone, street, zip, city, country, company, vat_id, referred_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          customer.email.toLowerCase(), customer.firstName, customer.lastName, customer.phone,
          billing.street, billing.zip, billing.city, billing.country,
          customer.company, customer.vatId, partnerId
        ]
      );
      customerId = newCustomer.rows[0].id;
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number, customer_id, customer_email, customer_first_name, customer_last_name, customer_phone,
        customer_company, customer_vat_id,
        billing_street, billing_zip, billing_city, billing_country,
        shipping_street, shipping_zip, shipping_city, shipping_country,
        subtotal, shipping_cost, vat_rate, vat_amount, discount_amount, total,
        partner_id, referral_code, discount_code,
        payment_method, stripe_payment_intent_id, payment_status,
        customer_notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) RETURNING *`,
      [
        orderNumber, customerId, customer.email.toLowerCase(), customer.firstName, customer.lastName, customer.phone,
        customer.company, customer.vatId,
        billing.street, billing.zip, billing.city, billing.country,
        shipping?.street || billing.street, shipping?.zip || billing.zip,
        shipping?.city || billing.city, shipping?.country || billing.country,
        subtotal, shippingCost, vatRate, vatAmount, discountAmount, total,
        partnerId, referralCode?.toUpperCase(), appliedDiscountCode?.code,
        paymentMethod, stripePaymentIntentId, stripePaymentIntentId ? 'paid' : 'pending',
        customerNotes
      ]
    );

    const newOrder = orderResult.rows[0];

    // Create order items
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_price, product_image, quantity, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          newOrder.id, product.id, product.name, product.price,
          product.images?.[0] || null, item.quantity, product.price * item.quantity
        ]
      );

      // Reduce stock
      if (product.track_stock) {
        await client.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, product.id]
        );
      }
    }

    // Update discount code usage
    if (appliedDiscountCode) {
      await client.query(
        'UPDATE discount_codes SET current_uses = current_uses + 1 WHERE id = $1',
        [appliedDiscountCode.id]
      );
    }

    // Calculate and create commissions if partner exists and payment is confirmed
    if (partnerId && newOrder.payment_status === 'paid') {
      await calculateCommissions(client, newOrder.id, partnerId, subtotal);
    }

    // Update partner sales count
    if (partnerId) {
      await client.query(
        'UPDATE users SET own_sales_count = own_sales_count + 1 WHERE id = $1',
        [partnerId]
      );
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_log (action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4)`,
      ['order_created', 'order', newOrder.id, JSON.stringify({ orderNumber, total, partnerId })]
    );

    return newOrder;
  });

  // Get order items
  const orderItemsResult = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [order.id]
  );

  res.status(201).json({
    message: 'Bestellung erfolgreich',
    order: {
      ...order,
      items: orderItemsResult.rows
    }
  });
});

/**
 * Get order confirmation
 */
export const getOrderConfirmation = asyncHandler(async (req, res) => {
  const { orderNumber } = req.params;

  const orderResult = await query(
    `SELECT o.*, 
            p.first_name as partner_first_name, p.last_name as partner_last_name
     FROM orders o
     LEFT JOIN users p ON o.partner_id = p.id
     WHERE o.order_number = $1`,
    [orderNumber]
  );

  if (orderResult.rows.length === 0) {
    throw new AppError('Bestellung nicht gefunden', 404);
  }

  const order = orderResult.rows[0];

  // Get order items
  const itemsResult = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [order.id]
  );

  res.json({
    order: {
      ...order,
      items: itemsResult.rows
    }
  });
});

/**
 * Get all orders (Admin)
 */
export const getAllOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    partnerId,
    search,
    startDate,
    endDate
  } = req.query;

  const offset = (page - 1) * limit;
  const params = [];
  let paramIndex = 1;
  let whereClause = 'WHERE 1=1';

  if (status) {
    whereClause += ` AND o.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  if (paymentStatus) {
    whereClause += ` AND o.payment_status = $${paramIndex}`;
    params.push(paymentStatus);
    paramIndex++;
  }

  if (partnerId) {
    whereClause += ` AND o.partner_id = $${paramIndex}`;
    params.push(partnerId);
    paramIndex++;
  }

  if (search) {
    whereClause += ` AND (o.order_number ILIKE $${paramIndex} OR o.customer_email ILIKE $${paramIndex} OR o.customer_last_name ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND o.created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND o.created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM orders o ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const ordersResult = await query(
    `SELECT o.*, 
            p.first_name as partner_first_name, p.last_name as partner_last_name, p.referral_code as partner_code
     FROM orders o
     LEFT JOIN users p ON o.partner_id = p.id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    orders: ordersResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * Get order by ID (Admin)
 */
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const orderResult = await query(
    `SELECT o.*, 
            p.first_name as partner_first_name, p.last_name as partner_last_name, 
            p.email as partner_email, p.referral_code as partner_code
     FROM orders o
     LEFT JOIN users p ON o.partner_id = p.id
     WHERE o.id = $1`,
    [id]
  );

  if (orderResult.rows.length === 0) {
    throw new AppError('Bestellung nicht gefunden', 404);
  }

  const order = orderResult.rows[0];

  // Get order items
  const itemsResult = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [order.id]
  );

  // Get commissions for this order
  const commissionsResult = await query(
    `SELECT c.*, u.first_name, u.last_name, u.email
     FROM commissions c
     JOIN users u ON c.user_id = u.id
     WHERE c.order_id = $1`,
    [order.id]
  );

  res.json({
    order: {
      ...order,
      items: itemsResult.rows,
      commissions: commissionsResult.rows
    }
  });
});

/**
 * Update order status
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber, adminNotes } = req.body;

  const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);
  if (orderResult.rows.length === 0) {
    throw new AppError('Bestellung nicht gefunden', 404);
  }

  const order = orderResult.rows[0];

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (status) {
    updates.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;

    if (status === 'shipped') {
      updates.push(`shipped_at = CURRENT_TIMESTAMP`);
    } else if (status === 'delivered' || status === 'completed') {
      updates.push(`delivered_at = CURRENT_TIMESTAMP`);
    }
  }

  if (trackingNumber) {
    updates.push(`tracking_number = $${paramIndex}`);
    params.push(trackingNumber);
    paramIndex++;
  }

  if (adminNotes) {
    updates.push(`admin_notes = $${paramIndex}`);
    params.push(adminNotes);
    paramIndex++;
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  params.push(id);

  const result = await query(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );

  // Log activity
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [req.user.id, 'order_status_updated', 'order', id, JSON.stringify({ oldStatus: order.status, newStatus: status })]
  );

  res.json({
    message: 'Bestellstatus aktualisiert',
    order: result.rows[0]
  });
});

/**
 * Refund order
 */
export const refundOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, amount } = req.body;

  const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);
  if (orderResult.rows.length === 0) {
    throw new AppError('Bestellung nicht gefunden', 404);
  }

  const order = orderResult.rows[0];

  if (order.payment_status === 'refunded') {
    throw new AppError('Bestellung wurde bereits erstattet', 400);
  }

  const refundAmount = amount || order.total;

  await transaction(async (client) => {
    // Process Stripe refund if applicable
    if (order.stripe_payment_intent_id) {
      await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: Math.round(refundAmount * 100),
        reason: 'requested_by_customer'
      });
    }

    // Update order status
    const isFullRefund = refundAmount >= order.total;
    await client.query(
      `UPDATE orders SET 
        status = $1,
        payment_status = $2,
        admin_notes = COALESCE(admin_notes, '') || $3
       WHERE id = $4`,
      [
        isFullRefund ? 'refunded' : order.status,
        isFullRefund ? 'refunded' : 'partially_refunded',
        `\nErstattung: ${refundAmount}€ - Grund: ${reason || 'Keine Angabe'}`,
        id
      ]
    );

    // Reverse commissions
    await client.query(
      `UPDATE commissions SET 
        status = 'reversed',
        cancelled_at = CURRENT_TIMESTAMP
       WHERE order_id = $1 AND status IN ('pending', 'held', 'released')`,
      [id]
    );

    // Restore stock
    const itemsResult = await client.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [id]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        'UPDATE products SET stock = stock + $1 WHERE id = $2 AND track_stock = true',
        [item.quantity, item.product_id]
      );
    }

    // Update partner sales count
    if (order.partner_id) {
      await client.query(
        'UPDATE users SET own_sales_count = GREATEST(own_sales_count - 1, 0) WHERE id = $1',
        [order.partner_id]
      );
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'order_refunded', 'order', id, JSON.stringify({ amount: refundAmount, reason })]
    );
  });

  res.json({ message: 'Erstattung erfolgreich' });
});

/**
 * Get partner referred orders
 */
export const getPartnerReferredOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const countResult = await query(
    'SELECT COUNT(*) FROM orders WHERE partner_id = $1',
    [req.user.id]
  );
  const total = parseInt(countResult.rows[0].count);

  const ordersResult = await query(
    `SELECT o.id, o.order_number, o.customer_first_name, o.customer_last_name,
            o.total, o.status, o.payment_status, o.created_at,
            (SELECT SUM(amount) FROM commissions WHERE order_id = o.id AND user_id = $1) as commission_earned
     FROM orders o
     WHERE o.partner_id = $1
     ORDER BY o.created_at DESC
     LIMIT $2 OFFSET $3`,
    [req.user.id, parseInt(limit), offset]
  );

  res.json({
    orders: ordersResult.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

/**
 * Generate invoice PDF
 */
export const generateInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const orderResult = await query(
    `SELECT o.*, c.email as customer_email_db
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     WHERE o.id = $1`,
    [id]
  );

  if (orderResult.rows.length === 0) {
    throw new AppError('Bestellung nicht gefunden', 404);
  }

  const order = orderResult.rows[0];

  // Check authorization
  if (req.user.role !== 'admin' && req.user.role !== 'support') {
    if (order.partner_id !== req.user.id) {
      throw new AppError('Keine Berechtigung', 403);
    }
  }

  // Get order items
  const itemsResult = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [order.id]
  );

  order.items = itemsResult.rows;

  // Generate PDF
  const pdfBuffer = await generateInvoicePDF(order);

  // Set headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${order.order_number}.pdf"`);
  res.send(pdfBuffer);
});