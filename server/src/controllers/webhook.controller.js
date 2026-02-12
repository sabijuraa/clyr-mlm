import Stripe from 'stripe';
import { query, transaction } from '../config/database.js';
import { calculateCommissions } from '../services/commission.service.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Handle Stripe webhooks
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;

      case 'charge.dispute.created':
        await handleDispute(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * Handle completed Stripe Checkout Session
 */
const handleCheckoutSessionCompleted = async (session) => {
  const orderId = session.metadata?.orderId;
  if (!orderId) {
    console.log('No orderId in checkout session metadata');
    return;
  }

  const orderResult = await query(
    'SELECT * FROM orders WHERE id = $1 OR stripe_payment_intent_id = $2',
    [orderId, session.id]
  );

  if (orderResult.rows.length === 0) {
    console.log('No order found for checkout session:', session.id);
    return;
  }

  const order = orderResult.rows[0];

  if (order.payment_status === 'paid') return;

  await transaction(async (client) => {
    await client.query(
      `UPDATE orders SET 
        payment_status = 'paid',
        payment_method = 'stripe',
        stripe_payment_intent_id = $1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [session.payment_intent || session.id, order.id]
    );

    if (order.partner_id) {
      await calculateCommissions(client, order.id, order.partner_id, parseFloat(order.subtotal));
    }

    await client.query(
      `INSERT INTO activity_log (action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4)`,
      ['payment_received', 'order', order.id, JSON.stringify({ sessionId: session.id, amount: session.amount_total })]
    );
  });

  // Auto-generate invoice
  try {
    const { generateInvoice } = await import('../services/invoice.service.js');
    await generateInvoice(order.id);
  } catch (e) {
    console.error('Invoice generation after payment failed:', e.message);
  }

  // Send confirmation email
  try {
    const { sendOrderConfirmation } = await import('../services/email.service.js');
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    const partnerEmail = order.partner_id ? (await query('SELECT email FROM users WHERE id = $1', [order.partner_id])).rows[0]?.email : null;
    await sendOrderConfirmation({ ...order, payment_status: 'paid', partner_email: partnerEmail }, itemsResult.rows);
  } catch (e) {
    console.error('Confirmation email failed:', e.message);
  }

  console.log('Checkout session completed for order:', order.order_number);
};

/**
 * Handle successful payment
 */
const handlePaymentSucceeded = async (paymentIntent) => {
  const { id: paymentIntentId } = paymentIntent;

  // Find order by payment intent
  const orderResult = await query(
    'SELECT * FROM orders WHERE stripe_payment_intent_id = $1',
    [paymentIntentId]
  );

  if (orderResult.rows.length === 0) {
    console.log('No order found for payment intent:', paymentIntentId);
    return;
  }

  const order = orderResult.rows[0];

  // Skip if already paid
  if (order.payment_status === 'paid') {
    return;
  }

  await transaction(async (client) => {
    // Update order payment status
    await client.query(
      `UPDATE orders SET 
        payment_status = 'paid',
        stripe_charge_id = $1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [paymentIntent.latest_charge, order.id]
    );

    // Calculate commissions if partner exists
    if (order.partner_id) {
      await calculateCommissions(client, order.id, order.partner_id, parseFloat(order.subtotal));

      // Update partner sales count
      await client.query(
        'UPDATE users SET own_sales_count = own_sales_count + 1 WHERE id = $1',
        [order.partner_id]
      );
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_log (action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4)`,
      ['payment_received', 'order', order.id, JSON.stringify({ paymentIntentId, amount: paymentIntent.amount })]
    );
  });

  console.log('Payment succeeded for order:', order.order_number);
};

/**
 * Handle failed payment
 */
const handlePaymentFailed = async (paymentIntent) => {
  const { id: paymentIntentId, last_payment_error } = paymentIntent;

  // Find order
  const orderResult = await query(
    'SELECT * FROM orders WHERE stripe_payment_intent_id = $1',
    [paymentIntentId]
  );

  if (orderResult.rows.length === 0) return;

  const order = orderResult.rows[0];

  // Update order
  await query(
    `UPDATE orders SET 
      payment_status = 'failed',
      admin_notes = COALESCE(admin_notes, '') || $1,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [`\nZahlungsfehler: ${last_payment_error?.message || 'Unbekannt'}`, order.id]
  );

  // Restore stock
  const itemsResult = await query(
    'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
    [order.id]
  );

  for (const item of itemsResult.rows) {
    await query(
      'UPDATE products SET stock = stock + $1 WHERE id = $2 AND track_stock = true',
      [item.quantity, item.product_id]
    );
  }

  // Log activity
  await query(
    `INSERT INTO activity_log (action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4)`,
    ['payment_failed', 'order', order.id, JSON.stringify({ paymentIntentId, error: last_payment_error?.message })]
  );

  console.log('Payment failed for order:', order.order_number);
};

/**
 * Handle refund
 */
const handleRefund = async (charge) => {
  const { payment_intent: paymentIntentId, amount_refunded } = charge;

  // Find order
  const orderResult = await query(
    'SELECT * FROM orders WHERE stripe_payment_intent_id = $1',
    [paymentIntentId]
  );

  if (orderResult.rows.length === 0) return;

  const order = orderResult.rows[0];
  const refundAmount = amount_refunded / 100; // Convert from cents

  await transaction(async (client) => {
    const isFullRefund = refundAmount >= parseFloat(order.total);

    // Update order
    await client.query(
      `UPDATE orders SET 
        status = $1,
        payment_status = $2,
        admin_notes = COALESCE(admin_notes, '') || $3,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        isFullRefund ? 'refunded' : order.status,
        isFullRefund ? 'refunded' : 'partially_refunded',
        `\nStripe Erstattung: ${refundAmount}€`,
        order.id
      ]
    );

    // Reverse commissions if full refund
    if (isFullRefund) {
      await client.query(
        `UPDATE commissions SET 
          status = 'reversed',
          cancelled_at = CURRENT_TIMESTAMP
         WHERE order_id = $1 AND status IN ('pending', 'held', 'released')`,
        [order.id]
      );

      // Restore stock
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [order.id]
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
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_log (action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4)`,
      ['refund_processed', 'order', order.id, JSON.stringify({ amount: refundAmount, isFullRefund })]
    );
  });

  console.log('Refund processed for order:', order.order_number);
};

/**
 * Handle dispute (chargeback)
 */
const handleDispute = async (dispute) => {
  const { payment_intent: paymentIntentId, amount, reason } = dispute;

  // Find order
  const orderResult = await query(
    'SELECT * FROM orders WHERE stripe_payment_intent_id = $1',
    [paymentIntentId]
  );

  if (orderResult.rows.length === 0) return;

  const order = orderResult.rows[0];

  await transaction(async (client) => {
    // Update order
    await client.query(
      `UPDATE orders SET 
        status = 'disputed',
        admin_notes = COALESCE(admin_notes, '') || $1,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [`\n⚠️ CHARGEBACK: ${reason} - Betrag: ${amount / 100}€`, order.id]
    );

    // Put commissions on hold
    await client.query(
      `UPDATE commissions SET 
        status = 'held',
        description = COALESCE(description, '') || ' (Dispute)'
       WHERE order_id = $1 AND status = 'released'`,
      [order.id]
    );

    // Deduct from wallet if already released
    const releasedCommissions = await client.query(
      `SELECT user_id, SUM(amount) as total
       FROM commissions
       WHERE order_id = $1 AND status = 'held' AND released_at IS NOT NULL
       GROUP BY user_id`,
      [order.id]
    );

    for (const comm of releasedCommissions.rows) {
      await client.query(
        'UPDATE users SET wallet_balance = GREATEST(wallet_balance - $1, 0) WHERE id = $2',
        [comm.total, comm.user_id]
      );
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_log (action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4)`,
      ['dispute_created', 'order', order.id, JSON.stringify({ amount: amount / 100, reason })]
    );
  });

  console.log('Dispute created for order:', order.order_number);
};