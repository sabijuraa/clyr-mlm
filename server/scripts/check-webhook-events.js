// Run this ON THE SERVER, in the same environment as the app
// (so it can read the existing STRIPE_SECRET_KEY from .env).
//
// Usage:
//   cd server
//   node ../check-webhook-events.js
//
// It lists every webhook endpoint configured in this Stripe account and
// shows exactly which event types each one is subscribed to — so you can
// confirm 'checkout.session.async_payment_succeeded' and
// 'checkout.session.async_payment_failed' are enabled, without needing
// to log into the Stripe Dashboard yourself.

import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const NEEDED_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
];

const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });

if (endpoints.data.length === 0) {
  console.log('No webhook endpoints found on this Stripe account/key.');
  process.exit(0);
}

for (const ep of endpoints.data) {
  console.log(`\nEndpoint: ${ep.url}`);
  console.log(`Status: ${ep.status}`);
  console.log('Subscribed events:');
  for (const evt of NEEDED_EVENTS) {
    const has = ep.enabled_events.includes(evt) || ep.enabled_events.includes('*');
    console.log(`  [${has ? 'x' : ' '}] ${evt}`);
  }
}
