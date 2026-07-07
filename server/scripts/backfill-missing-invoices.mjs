// server/scripts/backfill-missing-invoices.mjs
//
// One-off repair script for the "payment_intent.succeeded arrived before
// checkout.session.completed" race (fixed in webhook.controller.js /
// order.controller.js on 2026-07-07). Finds every paid order with no
// customer invoice, generates the invoice, and resends the order
// confirmation email (with PDF attached) so the customer/admin/partner
// actually receive it.
//
// Usage (from server/ directory, with DB env vars available):
//   node scripts/backfill-missing-invoices.mjs            # dry run (default)
//   node scripts/backfill-missing-invoices.mjs --apply     # actually do it
//   node scripts/backfill-missing-invoices.mjs --apply --order=FL26070001   # single order

import pool from '../src/config/database.js';
import { generateInvoice } from '../src/services/invoice.service.js';
import { sendOrderConfirmation } from '../src/services/email.service.js';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const onlyOrderArg = args.find(a => a.startsWith('--order='));
const onlyOrderNumber = onlyOrderArg ? onlyOrderArg.split('=')[1] : null;

async function main() {
  const params = [];
  let orderFilter = '';
  if (onlyOrderNumber) {
    params.push(onlyOrderNumber);
    orderFilter = 'AND o.order_number = $1';
  }

  const { rows: candidates } = await pool.query(
    `SELECT o.id, o.order_number, o.created_at, o.payment_status, o.total, o.partner_id
     FROM orders o
     LEFT JOIN invoices i ON i.order_id = o.id AND i.type = 'customer'
     WHERE o.payment_status IN ('paid','partially_refunded')
       AND o.status NOT IN ('cancelled','refunded','disputed')
       AND i.id IS NULL
       ${orderFilter}
     ORDER BY o.created_at ASC`,
    params
  );

  console.log(`Found ${candidates.length} paid order(s) with no invoice.`);
  if (candidates.length === 0) return;

  for (const order of candidates) {
    console.log(`\n${order.order_number} (${order.created_at.toISOString()}) — total €${order.total}`);

    if (!APPLY) {
      console.log('  [dry run] would generate invoice + resend confirmation email');
      continue;
    }

    try {
      const invoice = await generateInvoice(order.id);
      console.log(`  invoice generated: ${invoice.invoice_number}`);

      const { rows: fullOrderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [order.id]);
      const fullOrder = fullOrderRows[0];
      const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      const partnerEmail = fullOrder.partner_id
        ? (await pool.query('SELECT email FROM users WHERE id = $1', [fullOrder.partner_id])).rows[0]?.email
        : null;

      await sendOrderConfirmation(
        { ...fullOrder, partner_email: partnerEmail, invoice_number: invoice.invoice_number },
        items
      );
      console.log('  confirmation email sent (with PDF attached)');
    } catch (e) {
      console.error(`  FAILED for ${order.order_number}:`, e.message);
    }
  }

  if (!APPLY) {
    console.log('\nThis was a dry run — nothing was changed or sent. Re-run with --apply to execute.');
  }
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    pool.end();
    process.exit(1);
  });
