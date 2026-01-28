import pool from '../config/database.js';

async function reset() {
  console.log('⚠️  Resetting database...\n');
  
  try {
    // Drop all tables in reverse order of dependencies
    const tables = [
      'activity_log',
      'refresh_tokens',
      'referral_clicks',
      'discount_codes',
      'payouts',
      'commissions',
      'order_items',
      'orders',
      'customers',
      'products',
      'categories',
      'users',
      'ranks',
      'settings'
    ];

    for (const table of tables) {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`  Dropped: ${table}`);
    }

    // Drop functions
    await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
    
    console.log('\n✅ Database reset completed!\n');
    console.log('Run the following commands to recreate:');
    console.log('  npm run db:migrate');
    console.log('  npm run db:seed');
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reset();