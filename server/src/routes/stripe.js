const router = require('express').Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sendOrderConfirmation } = require('../services/email');

// Create Stripe checkout session
router.post('/create-session', authenticate, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { orderId } = req.body;
    const order = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [orderId, req.user.id]);
    if (!order.rows[0]) return res.status(404).json({ error: 'Bestellung nicht gefunden' });
    const o = order.rows[0];
    const items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

    const lineItems = items.rows.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: { name: item.product_name },
        unit_amount: Math.round(parseFloat(item.unit_price) * 100),
      },
      quantity: item.quantity,
    }));

    if (parseFloat(o.shipping_cost) > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Versand' },
          unit_amount: Math.round(parseFloat(o.shipping_cost) * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cart`,
      metadata: { orderId: o.id, orderNumber: o.order_number },
      customer_email: req.user.email,
    });

    await db.query('UPDATE orders SET stripe_session_id = $1 WHERE id = $2', [session.id, o.id]);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Webhook
router.post('/webhook', async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata.orderId;
      
      await db.query(`UPDATE orders SET payment_status = 'paid', status = 'confirmed', 
        stripe_payment_intent_id = $1, updated_at = NOW() WHERE id = $2`,
        [session.payment_intent, orderId]);
      
      // Calculate commissions
      const { calculateCommissions } = require('./commissions');
      await calculateCommissions(orderId);

      // Send confirmation email (non-blocking)
      try {
        const order = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        const items = await db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
        const user = await db.query('SELECT email FROM users WHERE id = $1', [order.rows[0].user_id]);
        sendOrderConfirmation(order.rows[0], items.rows, user.rows[0].email).catch(e => console.error('Email failed:', e.message));
      } catch (emailErr) { console.error('Order email error:', emailErr.message); }
    }

    res.json({ received: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Verify session
router.get('/verify/:sessionId', authenticate, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const order = await db.query('SELECT * FROM orders WHERE stripe_session_id = $1 AND user_id = $2', [req.params.sessionId, req.user.id]);
    res.json({ session: { status: session.payment_status }, order: order.rows[0] || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
