// Run with: node --experimental-test-module-mocks --test scripts/verify-stripe-webhook.mjs
// All database, Stripe, invoice, and email operations are isolated test doubles.
import assert from 'node:assert/strict';
import { test, mock, beforeEach } from 'node:test';

process.env.STRIPE_SECRET_KEY = 'sk_test_webhook_regression';
let order;
let commissions;
let invoices;
let emails;
let failCommissions;
let queue = Promise.resolve();
const query = async (sql, params) => {
  if (sql.includes('FOR UPDATE')) return { rows: [{ payment_status: order.payment_status }] };
  if (sql.includes('SELECT * FROM orders WHERE stripe_payment_intent_id')) {
    return { rows: params[0] === order.stripe_payment_intent_id ? [{ ...order }] : [] };
  }
  if (sql.includes('SELECT * FROM orders WHERE id')) return { rows: [{ ...order }] };
  if (sql.includes('UPDATE orders SET')) {
    order.payment_status = 'paid';
    order.stripe_payment_intent_id = sql.includes('stripe_charge_id') ? params[2] : params[0];
  }
  return { rows: [] };
};
mock.module(new URL('../src/config/database.js', import.meta.url).href, { namedExports: {
  query,
  transaction: async callback => {
    const previous = queue;
    let release;
    queue = new Promise(resolve => { release = resolve; });
    await previous;
    const snapshot = { ...order };
    try { return await callback({ query }); }
    catch (error) { order = snapshot; throw error; }
    finally { release(); }
  },
} });
mock.module('stripe', { defaultExport: class {
  webhooks = { constructEvent: body => body };
  checkout = { sessions: { list: async () => ({ data: [{ id: 'cs_legacy', metadata: { orderId: order.id } }] }) } };
} });
mock.module(new URL('../src/services/commission.service.js', import.meta.url).href, { namedExports: {
  calculateCommissions: async () => {
    if (failCommissions) throw new Error('Commission database unavailable');
    commissions++;
  },
} });
mock.module(new URL('../src/services/invoice.service.js', import.meta.url).href, { namedExports: {
  generateInvoice: async () => { invoices++; return { invoice_number: 'RE-TEST' }; },
} });
mock.module(new URL('../src/services/email.service.js', import.meta.url).href, { namedExports: {
  sendOrderConfirmation: async () => { emails++; },
} });
const { handleStripeWebhook } = await import('../src/controllers/webhook.controller.js');
const payment = { id: 'pi_paid', amount: 40500, amount_received: 40500, currency: 'eur', metadata: {}, latest_charge: 'ch_paid' };
const session = { id: 'cs_legacy', payment_intent: 'pi_paid', payment_status: 'paid', amount_total: 40500, currency: 'eur', metadata: { orderId: 'eec23d93-6fd2-4d12-ae50-412282bde434' } };
const deliver = async (type, object) => {
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; }, send(body) { this.body = body; } };
  await handleStripeWebhook({ headers: {}, body: { type, data: { object } } }, response);
  return response;
};
beforeEach(() => {
  order = { id: session.metadata.orderId, total: '405.00', subtotal: '337.50', payment_status: 'pending', stripe_payment_intent_id: 'cs_legacy', partner_id: 'partner', discount_amount: 0 };
  commissions = invoices = emails = 0;
  failCommissions = false;
});
test('legacy successful PaymentIntent settles the order and generates its documents', async () => {
  assert.equal((await deliver('payment_intent.succeeded', payment)).statusCode, 200);
  assert.equal(order.payment_status, 'paid');
  assert.equal(order.stripe_payment_intent_id, 'pi_paid');
  assert.deepEqual([commissions, invoices, emails], [1, 1, 1]);
});
test('overlapping session and PaymentIntent success events process the order once', async () => {
  const responses = await Promise.all([deliver('payment_intent.succeeded', payment), deliver('checkout.session.completed', session)]);
  assert.ok(responses.every(response => response.statusCode === 200));
  assert.deepEqual([commissions, invoices, emails], [1, 1, 1]);
});
test('an unpaid async checkout stays pending until settlement', async () => {
  await deliver('checkout.session.completed', { ...session, payment_status: 'unpaid' });
  assert.equal(order.payment_status, 'pending');
  assert.deepEqual([commissions, invoices, emails], [0, 0, 0]);
  await deliver('checkout.session.async_payment_succeeded', session);
  assert.equal(order.payment_status, 'paid');
  assert.deepEqual([commissions, invoices, emails], [1, 1, 1]);
});
test('underpayment does not mark the order paid', async () => {
  assert.equal((await deliver('payment_intent.succeeded', { ...payment, amount_received: 50 })).statusCode, 500);
  assert.equal(order.payment_status, 'pending');
  assert.deepEqual([commissions, invoices, emails], [0, 0, 0]);
});
test('commission failure rolls back payment state and permits a successful retry', async () => {
  failCommissions = true;
  assert.equal((await deliver('payment_intent.succeeded', payment)).statusCode, 500);
  assert.equal(order.payment_status, 'pending');
  assert.deepEqual([commissions, invoices, emails], [0, 0, 0]);
  failCommissions = false;
  assert.equal((await deliver('payment_intent.succeeded', payment)).statusCode, 200);
  assert.deepEqual([commissions, invoices, emails], [1, 1, 1]);
});
