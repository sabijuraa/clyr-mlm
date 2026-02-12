import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🚀 Starting database migration...\n');
  
  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!\n');
    console.log('Tables created:');
    console.log('  - ranks');
    console.log('  - users');
    console.log('  - categories');
    console.log('  - products');
    console.log('  - customers');
    console.log('  - orders');
    console.log('  - order_items');
    console.log('  - commissions');
    console.log('  - payouts');
    console.log('  - discount_codes');
    console.log('  - referral_clicks');
    console.log('  - refresh_tokens');
    console.log('  - activity_log');
    console.log('  - settings');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();