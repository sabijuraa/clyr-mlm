import { query, pool } from '../config/database.js';

async function reset() {
  console.log('⚠️  Resetting database...\n');
  
  try {
    // Drop entire schema and recreate
    await query('DROP SCHEMA public CASCADE');
    console.log('  Dropped schema');
    
    await query('CREATE SCHEMA public');
    console.log('  Created schema');
    
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('  Created uuid extension');
    
    console.log('\n✅ Database reset completed!\n');
    console.log('Now run: npm run migrate');
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

reset();