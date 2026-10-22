import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findOrderForPaymentIntent, assertOrderPaymentAmount } from '../src/services/stripe-order.service.js';

const order = { id: 'eec23d93-6fd2-4d12-ae50-412282bde434', total: '405.00' };
const payment = { id: 'pi_paid', metadata: {} };
const stripeWith = (sessions) => ({ checkout: { sessions: { list: async (params) => {
  assert.equal(params.payment_intent, payment.id);
  return { data: sessions };
} } } });

test('existing PaymentIntent reference needs no Stripe lookup', async () => {
  const db = { query: async (_, params) => {
    assert.deepEqual(params, [payment.id]);
    return { rows: [order] };
  } };
  assert.equal(await findOrderForPaymentIntent(db, null, payment), order);
});

test('legacy payment with empty metadata resolves the stored Checkout Session', async () => {
  const db = { query: async (_, [reference]) => ({ rows: reference === 'cs_legacy' ? [order] : [] }) };
  assert.equal(await findOrderForPaymentIntent(db, stripeWith([{ id: 'cs_legacy', metadata: {} }]), payment), order);
});

test('session metadata recovers a failed session-ID database write', async () => {
  const db = { query: async (_, [reference]) => ({ rows: reference === order.id ? [order] : [] }) };
  assert.equal(await findOrderForPaymentIntent(db, stripeWith([{ id: 'cs_legacy', metadata: { orderId: order.id } }]), payment), order);
});

test('PaymentIntent metadata recovers an order without a session reference', async () => {
  const db = { query: async (_, [reference]) => ({ rows: reference === order.id ? [order] : [] }) };
  assert.equal(await findOrderForPaymentIntent(db, stripeWith([]), { ...payment, metadata: { orderId: order.id } }), order);
});

test('unrelated payments are ignored rather than matched by amount', async () => {
  const db = { query: async () => ({ rows: [] }) };
  assert.equal(await findOrderForPaymentIntent(db, stripeWith([]), payment), null);
});

test('conflicting metadata cannot select an arbitrary order', async () => {
  const db = { query: async () => ({ rows: [] }) };
  assert.equal(await findOrderForPaymentIntent(db, stripeWith([{ id: 'cs_other', metadata: { orderId: order.id } }]), {
    ...payment, metadata: { orderId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  }), null);
});

test('only the full EUR order amount is accepted', () => {
  assert.doesNotThrow(() => assertOrderPaymentAmount(order, 40500, 'eur'));
  assert.throws(() => assertOrderPaymentAmount(order, 50, 'eur'));
  assert.throws(() => assertOrderPaymentAmount(order, 40500, 'usd'));
  assert.throws(() => assertOrderPaymentAmount({ ...order, total: 'invalid' }, 40500, 'eur'));
});

test('Stripe lookup failures propagate so webhook delivery is retried', async () => {
  const db = { query: async () => ({ rows: [] }) };
  const stripe = { checkout: { sessions: { list: async () => { throw new Error('Stripe unavailable'); } } } };
  await assert.rejects(findOrderForPaymentIntent(db, stripe, payment), /Stripe unavailable/);
});
