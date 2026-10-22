// Checkout Session metadata is not automatically copied to its PaymentIntent.
// Resolve legacy payments through Stripe when the database still holds cs_ IDs.
export const findOrderForPaymentIntent = async (db, stripe, paymentIntent) => {
  const direct = await db.query(
    'SELECT * FROM orders WHERE stripe_payment_intent_id = $1',
    [paymentIntent.id]
  );
  if (direct.rows.length) return direct.rows[0];

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntent.id,
    limit: 100,
  });
  for (const session of sessions.data) {
    const result = await db.query(
      'SELECT * FROM orders WHERE stripe_payment_intent_id = $1',
      [session.id]
    );
    if (result.rows.length) return result.rows[0];
  }

  // Metadata also recovers payments whose session-ID database write failed.
  const orderIds = new Set([
    paymentIntent.metadata?.orderId,
    ...sessions.data.map(session => session.metadata?.orderId),
  ].filter(Boolean));
  if (orderIds.size !== 1) return null;
  const [orderId] = orderIds;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) return null;
  const result = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  return result.rows[0] || null;
};

export const assertOrderPaymentAmount = (order, amount, currency) => {
  const expected = Math.round(Number(order.total) * 100);
  if (!Number.isSafeInteger(expected) || expected <= 0 || amount !== expected || currency !== 'eur') {
    throw new Error(`Stripe payment amount/currency does not match order ${order.id}`);
  }
};
