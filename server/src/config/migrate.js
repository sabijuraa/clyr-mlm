const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('./database');

async function migrate() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, '../../../database/schema.sql'), 'utf8');
    await db.query(schema);
    console.log('Database migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}
migrate();
