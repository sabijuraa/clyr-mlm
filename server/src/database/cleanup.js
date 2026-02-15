/**
 * CLYR Database FULL Cleanup
 * Removes all test/dummy data, keeps: admin, products, settings, legal, categories, ranks
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

  // Reset admin user stats to zero
  try {
    await query(`
      UPDATE users SET 
        own_sales_count = 0,
        own_sales_volume = 0,
        team_sales_count = 0,
        team_sales_volume = 0,
        direct_partners_count = 0,
        quarterly_sales_count = 0,
        wallet_balance = 0,
        total_earned = 0,
        total_paid_out = 0,
        consecutive_qualifying_months = 0
      WHERE role = 'admin'
    `);
    console.log('  ✓ Reset admin user stats to 0');
  } catch (e) {
    console.log(`  ⚠ admin stats reset: ${e.message.substring(0, 80)}`);
  }

  // Reset product review_count and average_rating if columns exist
  try {
    await query("UPDATE products SET review_count = 0, average_rating = 0 WHERE review_count > 0 OR average_rating > 0");
    console.log('  ✓ Reset product review stats');
  } catch (e) {
    // Columns may not exist
  }

  // Fix Theresa's rank to Sales Manager (level 6, 31%)
  try {
    const rank = await query("SELECT id FROM ranks WHERE slug = 'sales-manager'");
    if (rank.rows.length > 0) {
      await query("UPDATE users SET rank_id = $1 WHERE role = 'admin'", [rank.rows[0].id]);
      console.log(`  ✓ Set admin rank to Sales Manager (id: ${rank.rows[0].id})`);
    }
  } catch (e) {
    console.log(`  ⚠ rank fix: ${e.message.substring(0, 80)}`);
  }

  console.log('');
  console.log(`Total: ${totalDeleted} rows deleted`);
  console.log('');
  console.log('KEPT: Admin (Theresa), products, settings, legal, categories, ranks');
  console.log('REMOVED: All orders, invoices, commissions, partners, customers, stats');
  console.log('');
  console.log('Dashboard should now show all zeros. ✅');
  console.log('');

  process.exit(0);
}

cleanup();
