import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false } 
    : false,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('Step 1: Checking database state...\n');

    // Check if ranks table exists
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Tables found:', tablesRes.rows.map(r => r.table_name).join(', '));

    // Check ranks
    const ranksExist = tablesRes.rows.some(r => r.table_name === 'ranks');
    if (!ranksExist) {
      console.log('\nRanks table does not exist! Creating...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS ranks (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          level INTEGER NOT NULL DEFAULT 1,
          commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
          min_own_sales INTEGER NOT NULL DEFAULT 0,
          min_team_sales INTEGER NOT NULL DEFAULT 0,
          min_direct_partners INTEGER NOT NULL DEFAULT 0,
          one_time_bonus DECIMAL(10,2) DEFAULT 0,
          color VARCHAR(50) DEFAULT '#6B7280',
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Ranks table created');
    }

    // ========================================
    // Step 2: Ensure all 7 ranks exist
    // ========================================
    console.log('\nStep 2: Ensuring ranks exist...\n');

    const ranks = [
      { name: 'Starter', slug: 'starter', level: 1, commission_rate: 8, min_own_sales: 0, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#94A3B8', description: 'Einstiegsrang' },
      { name: 'Berater', slug: 'berater', level: 2, commission_rate: 19, min_own_sales: 1, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#60A5FA', description: '1-10 Verkaufe' },
      { name: 'Fachberater', slug: 'fachberater', level: 3, commission_rate: 21, min_own_sales: 11, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#34D399', description: '11-20 Verkaufe' },
      { name: 'Teamleiter', slug: 'teamleiter', level: 4, commission_rate: 25, min_own_sales: 5, min_team_sales: 15, min_direct_partners: 0, one_time_bonus: 500, color: '#FBBF24', description: 'Team-Verkaufe' },
      { name: 'Manager', slug: 'manager', level: 5, commission_rate: 28, min_own_sales: 0, min_team_sales: 30, min_direct_partners: 0, one_time_bonus: 1000, color: '#F97316', description: '30 Team-Verkaufe/Monat' },
      { name: 'Sales Manager', slug: 'sales-manager', level: 6, commission_rate: 31, min_own_sales: 0, min_team_sales: 50, min_direct_partners: 0, one_time_bonus: 2000, color: '#EF4444', description: '50 Team-Verkaufe/Monat' },
      { name: 'Direktor', slug: 'direktor', level: 7, commission_rate: 34, min_own_sales: 0, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#7C3AED', description: 'Administratorrang' },
    ];

    for (const rank of ranks) {
      await client.query(`
        INSERT INTO ranks (name, slug, level, commission_rate, min_own_sales, min_team_sales, min_direct_partners, one_time_bonus, color, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          commission_rate = EXCLUDED.commission_rate,
          level = EXCLUDED.level,
          one_time_bonus = EXCLUDED.one_time_bonus,
          color = EXCLUDED.color,
          description = EXCLUDED.description
      `, [rank.name, rank.slug, rank.level, rank.commission_rate, rank.min_own_sales, rank.min_team_sales, rank.min_direct_partners, rank.one_time_bonus, rank.color, rank.description]);
    }

    // Verify ranks
    const allRanks = await client.query('SELECT id, slug, level, commission_rate FROM ranks ORDER BY level');
    console.log('Ranks in database:');
    allRanks.rows.forEach(r => console.log('  R' + r.level + ' ' + r.slug + ' = ' + r.commission_rate + '% (id: ' + r.id + ')'));

    // ========================================
    // Step 3: Fix Theresa's rank
    // ========================================
    console.log('\nStep 3: Fixing Theresa rank...\n');

    // Get Sales Manager rank id
    const smRank = await client.query("SELECT id FROM ranks WHERE slug = 'sales-manager'");
    if (smRank.rows.length === 0) {
      console.error('Sales Manager rank not found!');
      process.exit(1);
    }
    const smId = smRank.rows[0].id;
    console.log('Sales Manager rank id: ' + smId);

    // Check Theresa
    const theresa = await client.query(`
      SELECT u.id, u.email, u.rank_id, u.role, r.name as rank_name, r.level, r.commission_rate
      FROM users u
      LEFT JOIN ranks r ON u.rank_id = r.id
      WHERE u.email = 'theresa@clyr.at'
    `);

    if (theresa.rows.length === 0) {
      console.log('Theresa user not found in database!');
    } else {
      const t = theresa.rows[0];
      console.log('Current: rank_id=' + t.rank_id + ', rank="' + t.rank_name + '", level=' + t.level + ', rate=' + t.commission_rate + '%');

      // Force update regardless
      await client.query('UPDATE users SET rank_id = $1 WHERE email = $2', [smId, 'theresa@clyr.at']);
      console.log('UPDATED to Sales Manager (id: ' + smId + ')');

      // Verify
      const verify = await client.query(`
        SELECT r.name, r.level, r.commission_rate 
        FROM users u JOIN ranks r ON u.rank_id = r.id 
        WHERE u.email = 'theresa@clyr.at'
      `);
      if (verify.rows.length > 0) {
        const v = verify.rows[0];
        console.log('\nVERIFIED: Theresa is now "' + v.name + '" (R' + v.level + ', ' + v.commission_rate + '%)');
      }
    }

    console.log('\nDone!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
