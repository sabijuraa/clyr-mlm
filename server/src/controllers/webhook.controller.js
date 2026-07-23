import Stripe from 'stripe';
import { query, transaction } from '../config/database.js';
import { calculateCommissions } from '../services/commission.service.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const getOrderCommissionBase = (order) => {
  const subtotal = parseFloat(order?.subtotal || 0);
  const discount = parseFloat(order?.discount_amount || 0);
  return Math.max(0, subtotal - discount);
};

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

      // Klarna (and other delayed/redirect methods like SEPA Direct Debit)
      // confirm in TWO steps. 'checkout.session.completed' fires as soon as
      // the customer finishes the Klarna flow, but payment_status on that
      // session is still 'unpaid' — the money hasn't landed yet. Stripe then
      // sends this second event once Klarna actually settles the payment.
      // Previously this event type was not handled at all (fell through to
      // 'default' and was just logged), so the app never learned the money
      // had arrived even though Stripe had it.
      case 'checkout.session.async_payment_succeeded':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      // Symmetric case: Klarna/SEPA can also fail asynchronously after
      // 'checkout.session.completed' already fired. Without this, a
      // declined async payment would leave the order stuck as 'pending'
      // forever instead of being marked failed (and stock restored).
      case 'checkout.session.async_payment_failed':
        await handleAsyncCheckoutSessionFailed(event.data.object);
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

  // For instant methods (card) session.payment_status is already 'paid' here.
  // For async methods (Klarna, SEPA Direct Debit) it's still 'unpaid' on the
  // initial 'checkout.session.completed' event — that just means the customer
  // finished the Klarna flow, not that the money has arrived. In that case we
  // deliberately do nothing yet and wait for 'checkout.session.async_payment_succeeded'
  // (handled above), which re-invokes this same function once Stripe confirms
  // payment_status is truly 'paid'.
  if (session.payment_status !== 'paid') {
    console.log(`Checkout session ${session.id} completed but payment_status='${session.payment_status}' (async method pending settlement) — order ${order.order_number} left as-is.`);
    return;
  }

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
      await calculateCommissions(client, order.id, order.partner_id, getOrderCommissionBase(order));
    }

    await client.query(
      `INSERT INTO activity_log (action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4)`,
      ['payment_received', 'order', order.id, JSON.stringify({ sessionId: session.id, amount: session.amount_total })]
    );
  });

  // Auto-generate invoice (with one retry — invoice creation must succeed before
  // the confirmation email goes out, otherwise email and billing numbers diverge)
  let generatedInvoice = null;
  try {
    const { generateInvoice } = await import('../services/invoice.service.js');
    generatedInvoice = await generateInvoice(order.id);
  } catch (e) {
    console.error('Invoice generation after payment failed (attempt 1):', order.id, e.message, e.stack);
    try {
      const { generateInvoice } = await import('../services/invoice.service.js');
      generatedInvoice = await generateInvoice(order.id);
    } catch (e2) {
      console.error('Invoice generation after payment failed (attempt 2 - giving up):', order.id, e2.message, e2.stack);
      await query(
        `INSERT INTO activity_log (action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4)`,
        ['invoice_generation_failed', 'order', order.id, JSON.stringify({ error: e2.message })]
      ).catch(() => {});
    }
  }

  // Send confirmation email
  try {
    const { sendOrderConfirmation } = await import('../services/email.service.js');
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    const partnerEmail = order.partner_id ? (await query('SELECT email FROM users WHERE id = $1', [order.partner_id])).rows[0]?.email : null;
    const invoiceNumber = generatedInvoice?.invoice_number || null;
    await sendOrderConfirmation({ ...order, payment_status: 'paid', partner_email: partnerEmail, invoice_number: invoiceNumber }, itemsResult.rows);
  } catch (e) {
    console.error('Confirmation email failed:', order.id, e.message);
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
    // NOTE: calculateCommissions already increments own_sales_count internally — do NOT double-increment here
    if (order.partner_id) {
      await calculateCommissions(client, order.id, order.partner_id, getOrderCommissionBase(order));
    }

    // Log activity
    await client.query(
      `INSERT INTO activity_log (action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4)`,
      ['payment_received', 'order', order.id, JSON.stringify({ paymentIntentId, amount: paymentIntent.amount })]
    );
  });

  // Auto-generate invoice + send confirmation email — mirrors handleCheckoutSessionCompleted.
  // This was previously missing here, so whenever Stripe delivered 'payment_intent.succeeded'
  // before 'checkout.session.completed', this handler would mark the order paid and the other
  // handler would then see payment_status === 'paid' and skip, meaning NEITHER path ever
  // generated an invoice or sent the confirmation email for that order.
  let generatedInvoice = null;
  try {
    const { generateInvoice } = await import('../services/invoice.service.js');
    generatedInvoice = await generateInvoice(order.id);
  } catch (e) {
    console.error('Invoice generation after payment_intent.succeeded failed:', order.id, e.message, e.stack);
    await query(
      `INSERT INTO activity_log (action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4)`,
      ['invoice_generation_failed', 'order', order.id, JSON.stringify({ error: e.message })]
    ).catch(() => {});
  }

  try {
    const { sendOrderConfirmation } = await import('../services/email.service.js');
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    const partnerEmail = order.partner_id ? (await query('SELECT email FROM users WHERE id = $1', [order.partner_id])).rows[0]?.email : null;
    const invoiceNumber = generatedInvoice?.invoice_number || null;
    await sendOrderConfirmation({ ...order, payment_status: 'paid', partner_email: partnerEmail, invoice_number: invoiceNumber }, itemsResult.rows);
  } catch (e) {
    console.error('Confirmation email failed (payment_intent.succeeded):', order.id, e.message);
  }

  console.log('Payment succeeded for order:', order.order_number);
};

/**
 * Handle an async payment method (Klarna, SEPA Direct Debit, etc.) that
 * ultimately failed/was declined after 'checkout.session.completed' had
 * already fired. Without this, those orders were left as 'pending' forever
 * with no stock restored and no record of why.
 */
const handleAsyncCheckoutSessionFailed = async (session) => {
  const orderId = session.metadata?.orderId;

  const orderResult = await query(
    'SELECT * FROM orders WHERE id = $1 OR stripe_payment_intent_id = $2',
    [orderId, session.id]
  );

  if (orderResult.rows.length === 0) {
    console.log('No order found for failed async checkout session:', session.id);
    return;
  }

  const order = orderResult.rows[0];
  if (order.payment_status === 'paid') return;

  await query(
    `UPDATE orders SET 
      payment_status = 'failed',
      admin_notes = COALESCE(admin_notes, '') || $1,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [`\nAsync-Zahlung fehlgeschlagen (${session.payment_method_types?.join(', ') || 'Klarna/SEPA'})`, order.id]
  );

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

  await query(
    `INSERT INTO activity_log (action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4)`,
    ['async_payment_failed', 'order', order.id, JSON.stringify({ sessionId: session.id })]
  );

  console.log('Async payment failed for order:', order.order_number);
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
