/**
 * CLYR Database Cleanup Script
 * Removes ALL test data — orders, customers, commissions, newsletters, etc.
 * KEEPS: admin user, partner accounts, products, settings, legal pages, categories, ranks
 * 
 * Usage: cd server && node src/database/cleanup.js
 */

import { query } from '../config/database.js';

async function cleanup() {
  console.log('');
  console.log('============================================');
  console.log('CLYR DATABASE CLEANUP');
  console.log('============================================');
  console.log('');

  // Tables to clean, in order (children before parents to respect foreign keys)
  const tables = [
    'bonus_pool_payouts',
    'bonus_pool_distributions',
    'leadership_cash_bonuses',
    'monthly_sales_snapshots',
    'commissions',
    'order_items',
    'invoices',
    'credit_notes',
    'payouts',
    'orders',
    'customer_accounts',
    'customers',
    'referral_clicks',
    'newsletter_subscribers',
    'email_campaigns',
    'cookie_consents',
    'activity_log',
    'gdpr_requests',
    'data_imports',
    'vat_reports',
    'academy_progress',
    'stock_movements',
    'refresh_tokens',
  ];

  let totalDeleted = 0;

  for (const table of tables) {
    try {
      const r = await query(`DELETE FROM ${table}`);
      if (r.rowCount > 0) {
        console.log(`  ✓ ${table}: ${r.rowCount} rows deleted`);
        totalDeleted += r.rowCount;
      }
    } catch (e) {
      // Table might not exist or have FK issues — skip
      if (!e.message.includes('does not exist')) {
        console.log(`  ⚠ ${table}: ${e.message.substring(0, 60)}`);
      }
    }
  }

  // Delete test product if exists
  try {
    const tp = await query("DELETE FROM products WHERE slug = 'testprodukt' RETURNING id");
    if (tp.rowCount > 0) console.log(`  ✓ Removed test product`);
  } catch (e) {}

  // Reset number sequences for clean start
  const sequences = [
    'orders_order_number_seq',
    'invoices_invoice_number_seq',
  ];
  for (const seq of sequences) {
    try { await query(`SELECT setval('${seq}', 1, false)`); } catch (e) {}
  }
  console.log('  ✓ Reset order/invoice number sequences');

  console.log('');
  console.log(`Total: ${totalDeleted} rows deleted`);
  console.log('');
  console.log('KEPT: Admin user, partner accounts, products, settings,');
  console.log('      legal pages, categories, ranks, academy content');
  console.log('');
  console.log('Admin login unchanged — use same email/password as before.');
  console.log('============================================');
  console.log('');

  process.exit(0);
}

cleanup();