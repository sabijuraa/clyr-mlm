/**
 * CLYR Database FULL Cleanup
 * Wipes ALL test/dummy data
 * KEEPS ONLY: Admin (Theresa), products, settings, legal pages, categories, ranks
 * 
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

  // Delete ALL users EXCEPT admin (Theresa)
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

  // Reset product metadata (remove fake ratings/reviews)
  try {
    await query("UPDATE products SET metadata = '{}'::jsonb WHERE metadata IS NOT NULL");
    console.log('  ✓ Reset product ratings/reviews');
  } catch (e) {
    try {
      await query("UPDATE products SET metadata = NULL");
      console.log('  ✓ Reset product metadata');
    } catch (e2) {}
  }

  console.log('');
  console.log(`Total: ${totalDeleted} rows deleted`);
  console.log('');
  console.log('============================================');
  console.log('KEPT:');
  console.log('  ✓ Admin account (Theresa) — login unchanged');
  console.log('  ✓ 9 products (ratings cleared)');
  console.log('  ✓ Settings, legal pages, categories, ranks');
  console.log('');
  console.log('REMOVED:');
  console.log('  ✗ Max Mustermann & all demo partners');
  console.log('  ✗ All orders, invoices & commissions');
  console.log('  ✗ All customers & newsletter subscribers');
  console.log('  ✗ Fake product ratings');
  console.log('  ✗ All stats & activity logs');
  console.log('============================================');
  console.log('');

  process.exit(0);
}

cleanup();