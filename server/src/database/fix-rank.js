// server/src/database/fix-rank.js
// Run: cd server && node src/database/fix-rank.js
// This directly sets Theresa's rank to Sales Manager (31%)

import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

async function fixRank() {
  const client = await pool.connect();
  try {
    // 1. Check current ranks
    const ranks = await client.query('SELECT id, slug, level, commission_rate FROM ranks ORDER BY level');
    console.log('Current ranks:');
    ranks.rows.forEach(r => console.log(`  R${r.level} ${r.slug} (${r.commission_rate}%) id=${r.id}`));
    
    // 2. Find Sales Manager rank
    const smRank = ranks.rows.find(r => r.slug === 'sales-manager');
    if (!smRank) {
      console.error('ERROR: Sales Manager rank not found! Run seed first.');
      process.exit(1);
    }
    console.log(`\nSales Manager rank: id=${smRank.id}, level=${smRank.level}, rate=${smRank.commission_rate}%`);

    // 3. Check Theresa's current rank
    const theresa = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.rank_id, 
             r.name as rank_name, r.level as rank_level, r.commission_rate
      FROM users u 
      LEFT JOIN ranks r ON u.rank_id = r.id 
      WHERE u.email = 'theresa@clyr.at'
    `);
    
    if (theresa.rows.length === 0) {
      console.error('ERROR: Theresa user not found!');
      process.exit(1);
    }
    
    const t = theresa.rows[0];
    console.log(`\nTheresa current: rank_id=${t.rank_id}, rank="${t.rank_name}" (R${t.rank_level}, ${t.commission_rate}%)`);

    // 4. Update to Sales Manager
    if (t.rank_id === smRank.id) {
      console.log('\n✅ Theresa already has correct rank (Sales Manager). No change needed.');
    } else {
      await client.query(
        'UPDATE users SET rank_id = $1 WHERE email = $2',
        [smRank.id, 'theresa@clyr.at']
      );
      console.log(`\n✅ FIXED: Updated Theresa from "${t.rank_name}" (R${t.rank_level}) → Sales Manager (R${smRank.level}, ${smRank.commission_rate}%)`);
    }

    // 5. Verify
    const verify = await client.query(`
      SELECT u.rank_id, r.name as rank_name, r.level, r.commission_rate
      FROM users u JOIN ranks r ON u.rank_id = r.id
      WHERE u.email = 'theresa@clyr.at'
    `);
    const v = verify.rows[0];
    console.log(`\nVerified: Theresa is now "${v.rank_name}" (R${v.level}, ${v.commission_rate}%)`);

  } finally {
    client.release();
    await pool.end();
  }
}

fixRank().catch(err => {
  console.error('Fix failed:', err);
  process.exit(1);
});
