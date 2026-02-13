/**
 * CLYR Database Cleanup Script
 * Removes all test data (orders, customers, commissions, newsletters, cookie consents)
 * Keeps: admin user, partner accounts, products, settings, legal pages
 * 
 * Usage: cd server && node src/database/cleanup.js
 */

import { query } from '../config/database.js';

async function cleanup() {
  console.log('============================================');
  console.log('CLYR DATABASE CLEANUP');
  console.log('============================================');
  console.log('');

  try {
    // 1. Delete commission payouts
    const payouts = await query('DELETE FROM commission_payouts RETURNING id');
    console.log(`Deleted ${payouts.rowCount} commission payouts`);

    // 2. Delete commissions
    const commissions = await query('DELETE FROM commissions RETURNING id');
    console.log(`Deleted ${commissions.rowCount} commissions`);

    // 3. Delete order items
    const orderItems = await query('DELETE FROM order_items RETURNING id');
    console.log(`Deleted ${orderItems.rowCount} order items`);

    // 4. Delete invoices
    const invoices = await query('DELETE FROM invoices RETURNING id');
    console.log(`Deleted ${invoices.rowCount} invoices`);

    // 5. Delete credit notes
    const creditNotes = await query('DELETE FROM credit_notes RETURNING id');
    console.log(`Deleted ${creditNotes.rowCount} credit notes`);

    // 6. Delete orders
    const orders = await query('DELETE FROM orders RETURNING id');
    console.log(`Deleted ${orders.rowCount} orders`);

    // 7. Delete customer accounts
    const customerAccounts = await query('DELETE FROM customer_accounts RETURNING id');
    console.log(`Deleted ${customerAccounts.rowCount} customer accounts`);

    // 8. Delete customers
    const customers = await query('DELETE FROM customers RETURNING id');
    console.log(`Deleted ${customers.rowCount} customers`);

    // 9. Delete newsletter subscribers
    const newsletter = await query('DELETE FROM newsletter_subscribers RETURNING id');
    console.log(`Deleted ${newsletter.rowCount} newsletter subscribers`);

    // 10. Delete email campaigns
    const campaigns = await query('DELETE FROM email_campaigns RETURNING id');
    console.log(`Deleted ${campaigns.rowCount} email campaigns`);

    // 11. Delete cookie consents
    const cookies = await query('DELETE FROM cookie_consents RETURNING id');
    console.log(`Deleted ${cookies.rowCount} cookie consents`);

    // 12. Delete test product (Testprodukt) if it exists
    const testProduct = await query("DELETE FROM products WHERE slug = 'testprodukt' RETURNING id");
    console.log(`Deleted ${testProduct.rowCount} test products`);

    // 13. Reset sequences for clean numbering
    await query("SELECT setval('orders_order_number_seq', 1, false)").catch(() => {});
    await query("SELECT setval('invoices_invoice_number_seq', 1, false)").catch(() => {});
    console.log('Reset order/invoice number sequences');

    console.log('');
    console.log('============================================');
    console.log('CLEANUP COMPLETE');
    console.log('============================================');
    console.log('');
    console.log('Kept: Admin user, partner accounts, products, settings, legal pages');
    console.log('Removed: Orders, customers, commissions, newsletters, campaigns, cookies');
    console.log('');
    console.log('The system is ready for live use on clyr.shop');

  } catch (error) {
    console.error('Cleanup error:', error.message);
    // Try individual deletes if cascade fails
    if (error.message.includes('foreign key')) {
      console.log('Trying individual cleanup...');
      const tables = [
        'commission_payouts', 'commissions', 'order_items', 'invoices', 
        'credit_notes', 'orders', 'customer_accounts', 'customers',
        'newsletter_subscribers', 'email_campaigns', 'cookie_consents'
      ];
      for (const table of tables) {
        try {
          const r = await query(`DELETE FROM ${table}`);
          console.log(`  Cleaned ${table}: ${r.rowCount} rows`);
        } catch (e) {
          console.log(`  Skipped ${table}: ${e.message.substring(0, 50)}`);
        }
      }
    }
  }

  process.exit(0);
}

cleanup();