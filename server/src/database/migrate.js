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

    // Fix any partners who got Direktor rank by accident (rank_id=1 = Direktor)
    const starterRank = await client.query("SELECT id FROM ranks WHERE slug = 'starter'");
    const direktorRank = await client.query("SELECT id FROM ranks WHERE slug = 'direktor'");
    if (starterRank.rows.length > 0 && direktorRank.rows.length > 0) {
      const fixResult = await client.query(
        "UPDATE users SET rank_id = $1 WHERE rank_id = $2 AND role = 'partner' AND email != 'theresa@clyr.at'",
        [starterRank.rows[0].id, direktorRank.rows[0].id]
      );
      if (fixResult.rowCount > 0) {
        console.log('\nFixed ' + fixResult.rowCount + ' partner(s) who had Direktor rank by accident → set to Starter');
      }
    }

    // ========================================
    // Step 4: Ensure missing columns exist
    // ========================================
    console.log('\nStep 4: Ensuring all columns exist...\n');

    const columnsToAdd = [
      { table: 'users', column: 'terms_accepted_at', type: 'TIMESTAMP' },
      { table: 'users', column: 'has_own_machine', type: 'BOOLEAN DEFAULT false' },
      { table: 'users', column: 'passport_url', type: 'TEXT' },
      { table: 'users', column: 'bank_card_url', type: 'TEXT' },
      { table: 'users', column: 'trade_license_url', type: 'TEXT' },
      { table: 'users', column: 'subscription_status', type: "VARCHAR(20) DEFAULT 'unpaid'" },
      { table: 'users', column: 'subscription_amount', type: 'DECIMAL(10,2)' },
      { table: 'users', column: 'subscription_prorated', type: 'DECIMAL(10,2)' },
      { table: 'users', column: 'annual_fee_paid_at', type: 'TIMESTAMP' },
      { table: 'users', column: 'annual_fee_expires_at', type: 'TIMESTAMP' },
      { table: 'products', column: 'is_service', type: 'BOOLEAN DEFAULT false' },
    ];

    for (const col of columnsToAdd) {
      try {
        await client.query(`ALTER TABLE ${col.table} ADD COLUMN IF NOT EXISTS ${col.column} ${col.type}`);
        console.log('  Column OK: ' + col.table + '.' + col.column);
      } catch (e) {
        console.log('  Column exists: ' + col.table + '.' + col.column);
      }
    }

    // Mark product flags for shipping
    console.log('\n  Marking product shipping flags...');
    const largeMark = await client.query("UPDATE products SET is_large_item = true WHERE LOWER(name) LIKE '%soda%' OR LOWER(name) LIKE '%home soda%' OR price > 1000");
    console.log('  Marked ' + largeMark.rowCount + ' products as large (Soda)');
    const serviceMark = await client.query("UPDATE products SET is_service = true WHERE LOWER(name) LIKE '%montage%' OR LOWER(name) LIKE '%installation%' OR LOWER(name) LIKE '%einbau%'");
    console.log('  Marked ' + serviceMark.rowCount + ' products as service (Montage)');

    // Update shipping costs in settings
    await client.query(`
      INSERT INTO settings (key, value, description) VALUES ('shipping_costs', $1, 'Shipping costs per country')
      ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
    `, [JSON.stringify({ DE: { large: 70, small: 14.90 }, AT: { large: 55, small: 9.90 }, CH: { large: 180, small: 35 } })]);
    console.log('  Shipping costs updated in settings');

    // ========================================
    // Step 5: Ensure subscription_payments table
    // ========================================
    console.log('\nStep 5: Ensuring subscription_payments table...\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'stripe',
        payment_reference VARCHAR(255),
        stripe_session_id VARCHAR(255),
        period_start TIMESTAMP,
        period_end TIMESTAMP,
        status VARCHAR(20) DEFAULT 'paid',
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  subscription_payments table OK');

    // Ensure discount_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS discount_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) DEFAULT 'fixed' CHECK (type IN ('fixed', 'percentage')),
        value DECIMAL(10,2) NOT NULL,
        partner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        max_uses_per_customer INTEGER DEFAULT 1,
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        applicable_products JSONB,
        applicable_categories JSONB,
        starts_at TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  discount_codes table OK');

    // Ensure discount columns on orders
    try { await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50)"); } catch(e) {}
    try { await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0"); } catch(e) {}
    console.log('  orders discount columns OK');

    // ========================================
    // Step 6: Ensure legal_pages table and seed VP-Vertrag
    // ========================================
    console.log('\nStep 6: Seeding legal pages...\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS legal_pages (
        id SERIAL PRIMARY KEY,
        page_key VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        title_en VARCHAR(255),
        content_en TEXT,
        last_updated_by UUID REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const { legalContent } = await import('./legal-content.js');
    
    for (const [key, page] of Object.entries(legalContent)) {
      await client.query(
        `INSERT INTO legal_pages (page_key, title, content) VALUES ($1, $2, $3) ON CONFLICT (page_key) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = CURRENT_TIMESTAMP`,
        [key, page.title, page.content]
      );
      console.log('  Seeded: ' + key + ' (' + page.title + ')');
    }

    // Step: Ensure bank columns exist on users table
    console.log('\nStep: Ensuring bank columns exist on users...');
    const bankCols = [
      'iban VARCHAR(50)',
      'bic VARCHAR(20)',
      'bank_name VARCHAR(100)',
      'bank_card_url VARCHAR(500)',
      'account_holder VARCHAR(200)',
      'subscription_status VARCHAR(20)',
      'subscription_amount DECIMAL(10,2)',
      'subscription_prorated DECIMAL(10,2)',
      'annual_fee_paid_at TIMESTAMP',
      'annual_fee_expires_at TIMESTAMP'
    ];
    for (const col of bankCols) {
      const colName = col.split(' ')[0];
      try {
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col}`);
        console.log('  Column OK: ' + colName);
      } catch(e) { /* already exists */ }
    }

    // Step: Ensure subscription_payments table exists
    console.log('\nStep: Ensuring subscription_payments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'stripe',
        payment_reference VARCHAR(255),
        stripe_session_id VARCHAR(255),
        period_start TIMESTAMP,
        period_end TIMESTAMP,
        status VARCHAR(20) DEFAULT 'paid',
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  subscription_payments table OK');

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
