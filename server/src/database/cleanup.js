/**
 * CLYR Database FULL Cleanup
 * Usage: cd server && node src/database/cleanup.js
 */

import { query } from '../config/database.js';

async function cleanup() {
  console.log('');
  console.log('============================================');
  console.log('CLYR DATABASE — FULL CLEANUP');
  console.log('============================================');
  console.log('');

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
    'subscriptions',
    'discount_codes',
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
      if (!e.message.includes('does not exist')) {
        console.log(`  ⚠ ${table}: ${e.message.substring(0, 80)}`);
      }
    }
  }

  // Delete ALL users EXCEPT admin
  try {
    const users = await query("DELETE FROM users WHERE role != 'admin' RETURNING email");
    if (users.rowCount > 0) {
      console.log(`  ✓ users: ${users.rowCount} non-admin users deleted`);
      users.rows.forEach(u => console.log(`    - ${u.email}`));
      totalDeleted += users.rowCount;
    }
  } catch (e) {
    console.log(`  ⚠ users: ${e.message.substring(0, 80)}`);
  }

  // Delete test product
  try {
    const tp = await query("DELETE FROM products WHERE slug = 'testprodukt' RETURNING name");
    if (tp.rowCount > 0) console.log('  ✓ Removed test product');
  } catch (e) {}

  console.log('');
  console.log(`Total: ${totalDeleted} rows deleted`);
  console.log('');
  console.log('KEPT: Admin (Theresa), products, settings, legal, categories, ranks');
  console.log('REMOVED: All orders, invoices, commissions, partners, customers, stats');
  console.log('');

  process.exit(0);
}

cleanup();