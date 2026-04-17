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
    // Step 3: Fix admin ranks (Theresa + any other admins)
    // ========================================
    console.log('\nStep 3: Fixing admin ranks to Sales Manager (R6, 31%)...\n');

    // Get Sales Manager rank id
    const smRank = await client.query("SELECT id FROM ranks WHERE slug = 'sales-manager'");
    if (smRank.rows.length === 0) {
      console.error('Sales Manager rank not found!');
      process.exit(1);
    }
    const smId = smRank.rows[0].id;
    console.log('Sales Manager rank id: ' + smId);

    // Find ALL admin users (not just hardcoded email)
    const allAdmins = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.rank_id, r.name as rank_name, r.level, r.commission_rate
      FROM users u
      LEFT JOIN ranks r ON u.rank_id = r.id
      WHERE u.role = 'admin'
      ORDER BY u.created_at ASC
    `);

    if (allAdmins.rows.length === 0) {
      console.log('NO ADMIN USERS FOUND - cannot proceed with rank fix');
    } else {
      console.log(`Found ${allAdmins.rows.length} admin user(s):`);
      for (const a of allAdmins.rows) {
        console.log(`  - ${a.first_name} ${a.last_name} <${a.email}> | current rank: ${a.rank_name || 'NONE'} (level ${a.level || '?'}, ${a.commission_rate || '?'}%)`);
      }
      
      // Force update ALL admins to Sales Manager
      const upd = await client.query(
        `UPDATE users SET rank_id = $1 WHERE role = 'admin' RETURNING email`,
        [smId]
      );
      console.log(`\nUPDATED ${upd.rowCount} admin user(s) to Sales Manager (rank_id=${smId})`);

      // Verify
      const verify = await client.query(`
        SELECT u.email, r.name, r.level, r.commission_rate 
        FROM users u JOIN ranks r ON u.rank_id = r.id 
        WHERE u.role = 'admin'
      `);
      console.log('\nVERIFIED admins after update:');
      verify.rows.forEach(v => 
        console.log(`  ${v.email} → "${v.name}" (R${v.level}, ${v.commission_rate}%)`)
      );
    }

    // Fix any partners who got Direktor rank by accident
    const starterRank = await client.query("SELECT id FROM ranks WHERE slug = 'starter'");
    const direktorRank = await client.query("SELECT id FROM ranks WHERE slug = 'direktor'");
    if (starterRank.rows.length > 0 && direktorRank.rows.length > 0) {
      const fixResult = await client.query(
        "UPDATE users SET rank_id = $1 WHERE rank_id = $2 AND role = 'partner'",
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
      // Variant tracking on order line items - REQUIRED for admin/partner views
      { table: 'order_items', column: 'variant_description', type: 'TEXT' },
      { table: 'order_items', column: 'variant_data', type: 'JSONB' },
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

    // Step: Add sort_order to products for manual ordering
    console.log('\nStep: Adding sort_order to products...');
    try {
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER');
      // Set main products (Soda machine & Shower) to sort first
      await client.query(`UPDATE products SET sort_order = 1 WHERE LOWER(name) LIKE '%soda%' OR LOWER(name) LIKE '%home soda%' OR LOWER(name) LIKE '%clyr home%'`);
      await client.query(`UPDATE products SET sort_order = 2 WHERE LOWER(name) LIKE '%dusche%' OR LOWER(name) LIKE '%shower%' OR LOWER(name) LIKE '%aroma%'`);
      console.log('  sort_order column OK, main products set to top');
    } catch(e) { console.log('  sort_order already exists or error:', e.message); }

    // Step: Ensure branding table exists (CRITICAL - needed by branding controller)
    console.log('\nStep: Ensuring branding table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS branding (
        id SERIAL PRIMARY KEY,
        logo_light_url VARCHAR(500),
        logo_dark_url VARCHAR(500),
        favicon_url VARCHAR(500),
        brochure_url VARCHAR(500),
        primary_color VARCHAR(50) DEFAULT '#0EA5E9',
        secondary_color VARCHAR(50) DEFAULT '#1E293B',
        accent_color VARCHAR(50) DEFAULT '#F59E0B',
        font_heading VARCHAR(100) DEFAULT 'Inter',
        font_body VARCHAR(100) DEFAULT 'Inter',
        facebook_url VARCHAR(500),
        instagram_url VARCHAR(500),
        linkedin_url VARCHAR(500),
        twitter_url VARCHAR(500),
        youtube_url VARCHAR(500),
        company_name VARCHAR(255),
        tagline VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Add brochure_url column if table existed without it
    try { await client.query('ALTER TABLE branding ADD COLUMN IF NOT EXISTS brochure_url VARCHAR(500)'); } catch(e) {}
    try { await client.query('ALTER TABLE branding ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)'); } catch(e) {}
    try { await client.query('ALTER TABLE branding ADD COLUMN IF NOT EXISTS tagline VARCHAR(255)'); } catch(e) {}
    // Insert default row
    await client.query(`INSERT INTO branding (id) VALUES (1) ON CONFLICT DO NOTHING`);
    console.log('  branding table OK');

    // Step: Ensure company_settings table exists (used by AdminSettingsPage company tab)
    console.log('\nStep: Ensuring company_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) DEFAULT 'CLYR Solutions GmbH',
        company_legal_name VARCHAR(255),
        company_name_short VARCHAR(100) DEFAULT 'CLYR',
        address_line1 VARCHAR(255) DEFAULT 'Pappelweg 4b',
        address_line2 VARCHAR(255),
        postal_code VARCHAR(20) DEFAULT '9524',
        city VARCHAR(100) DEFAULT 'Villach',
        state VARCHAR(100) DEFAULT 'Kärnten',
        country VARCHAR(2) DEFAULT 'AT',
        email VARCHAR(255) DEFAULT 'service@clyr.shop',
        support_email VARCHAR(255),
        phone VARCHAR(50),
        website VARCHAR(255) DEFAULT 'www.clyr.shop',
        tax_id VARCHAR(50),
        vat_id VARCHAR(50) DEFAULT 'ATU83027635',
        registration_number VARCHAR(100),
        commercial_register VARCHAR(100),
        court VARCHAR(100) DEFAULT 'Landesgericht Villach',
        iban VARCHAR(50),
        bic VARCHAR(20),
        bank_name VARCHAR(100),
        account_holder VARCHAR(255) DEFAULT 'CLYR Solutions GmbH',
        managing_director VARCHAR(255) DEFAULT 'Theresa Struger',
        jurisdiction VARCHAR(255) DEFAULT 'Landesgericht Villach',
        applicable_law VARCHAR(100) DEFAULT 'Österreichisches Recht',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Ensure missing columns are added if table existed before
    const companyCols = [
      'company_legal_name VARCHAR(255)',
      'support_email VARCHAR(255)',
      'registration_number VARCHAR(100)',
      'vat_id VARCHAR(50)',
      'tax_id VARCHAR(50)',
      'iban VARCHAR(50)',
      'bic VARCHAR(20)',
      'bank_name VARCHAR(100)',
    ];
    for (const col of companyCols) {
      const [colName] = col.split(' ');
      try {
        await client.query(`ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS ${col}`);
      } catch(e) {}
    }
    await client.query(`INSERT INTO company_settings (id) VALUES (1) ON CONFLICT DO NOTHING`);
    console.log('  company_settings table OK');

    // Step: Ensure shipping_costs settings key exists
    console.log('\nStep: Ensuring default shipping costs setting...');
    try {
      const defaultShipping = JSON.stringify({
        AT: { large: 55, small: 9.90 },
        DE: { large: 70, small: 14.90 },
        CH: { large: 180, small: 35 }
      });
      await client.query(`
        INSERT INTO settings (key, value, description)
        VALUES ('shipping_costs', $1, 'Shipping costs per country')
        ON CONFLICT (key) DO NOTHING
      `, [defaultShipping]);
      console.log('  shipping_costs setting OK');
    } catch(e) { console.log('  shipping_costs setting error:', e.message); }

    // Step: Ensure all admin users get Sales Manager rank (level 6, 31%)
    // IMPORTANT: Per actual March 2026 commission payouts, Theresa earns 31% (Sales Manager),
    // NOT 34% (Direktor). The R7 Direktor rank exists conceptually but is not used for
    // commission calculations. Admins sell at R6 (Sales Manager, 31%) just like any partner
    // who has reached that level.
    console.log('\nStep: Setting admin users to Sales Manager rank (R6, 31%)...');
    try {
      const smResult = await client.query("SELECT id FROM ranks WHERE slug = 'sales-manager' OR level = 6 LIMIT 1");
      if (smResult.rows.length > 0) {
        const smId = smResult.rows[0].id;
        const updated = await client.query(
          `UPDATE users SET rank_id = $1 WHERE role = 'admin' RETURNING email`,
          [smId]
        );
        console.log(`  Updated ${updated.rowCount} admin user(s) to Sales Manager rank (31%)`);
      } else {
        console.log('  Warning: Sales Manager rank not found in ranks table');
      }
    } catch(e) { console.log('  Admin rank update error:', e.message); }

    // Step: Link any orphaned partners (NULL upline_id) to Theresa as root
    // This ensures the MLM tree visualization shows them under the Director properly
    console.log('\nStep: Linking orphaned partners to Theresa (root)...');
    try {
      const adminResult = await client.query(
        "SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1"
      );
      if (adminResult.rows.length > 0) {
        const adminId = adminResult.rows[0].id;
        const linked = await client.query(
          `UPDATE users SET upline_id = $1 
           WHERE role = 'partner' AND upline_id IS NULL AND id != $1
           RETURNING email`,
          [adminId]
        );
        console.log(`  Linked ${linked.rowCount} orphaned partner(s) to admin`);
      }
    } catch(e) { console.log('  Orphaned partner linking error:', e.message); }

    // Step: Recalculate team_sales_count and team_sales_volume for all partners
    // These are computed by walking down the upline tree
    console.log('\nStep: Recalculating team stats...');
    try {
      // Reset everyone's team stats to 0 first
      await client.query(`UPDATE users SET team_sales_count = 0, team_sales_volume = 0 WHERE role IN ('admin', 'partner')`);
      
      // For each partner with sales, walk up the upline chain and add to each upline's team stats
      await client.query(`
        WITH RECURSIVE upline_chain AS (
          SELECT id, upline_id, own_sales_count, own_sales_volume, id as bottom_id, 
                 own_sales_count as bottom_sales, own_sales_volume as bottom_volume
          FROM users WHERE role = 'partner' AND own_sales_count > 0
          UNION ALL
          SELECT u.id, u.upline_id, u.own_sales_count, u.own_sales_volume, uc.bottom_id, uc.bottom_sales, uc.bottom_volume
          FROM users u
          JOIN upline_chain uc ON u.id = uc.upline_id
          WHERE uc.upline_id IS NOT NULL
        ),
        team_totals AS (
          SELECT upline_id, SUM(bottom_sales) as total_count, SUM(bottom_volume) as total_vol
          FROM upline_chain
          WHERE upline_id IS NOT NULL
          GROUP BY upline_id
        )
        UPDATE users u SET 
          team_sales_count = COALESCE(tt.total_count, 0),
          team_sales_volume = COALESCE(tt.total_vol, 0)
        FROM team_totals tt WHERE u.id = tt.upline_id
      `);
      console.log('  Team stats recalculated');
    } catch(e) { console.log('  Team stats recalc error:', e.message); }

    // Step: Ensure aroma variants exist for Aroma Kartuschen product
    // Without these, "2 different aromas in cart" doesn't work because
    // the product has no variants → cartKey is the same regardless of selection
    console.log('\nStep: Ensuring aroma variants are linked...');
    try {
      // Check Aroma Kartuschen product
      const aromaProduct = await client.query("SELECT id FROM products WHERE sku = 'CLYR-AK' OR slug = 'aroma-kartuschen' LIMIT 1");
      if (aromaProduct.rows.length === 0) {
        console.log('  Aroma Kartuschen product not found - skipping variant seed');
      } else {
        const aromaId = aromaProduct.rows[0].id;
        
        // Check existing variants for this product
        const existingVariants = await client.query(
          'SELECT COUNT(*) as cnt FROM product_variants WHERE product_id = $1', 
          [aromaId]
        );
        
        if (parseInt(existingVariants.rows[0].cnt) === 0) {
          console.log('  No variants linked to Aroma Kartuschen - seeding now...');
          
          // Ensure variant_options table has the 5 scent options
          const aromaVariants = [
            { type: 'duft', name: 'Lavendel', sort: 1 },
            { type: 'duft', name: 'Zitrone', sort: 2 },
            { type: 'duft', name: 'Waldduft', sort: 3 },
            { type: 'duft', name: 'Babypuder', sort: 4 },
            { type: 'duft', name: 'OceanBlue', sort: 5 },
          ];
          
          for (const v of aromaVariants) {
            // Insert variant_option if missing
            const opt = await client.query(`
              INSERT INTO variant_options (type, name, price_modifier, image_url, sort_order, is_active)
              VALUES ($1, $2, 0, '', $3, true)
              ON CONFLICT DO NOTHING
              RETURNING id
            `, [v.type, v.name, v.sort]);
            
            let optId;
            if (opt.rows.length > 0) {
              optId = opt.rows[0].id;
            } else {
              const existing = await client.query(
                "SELECT id FROM variant_options WHERE type = $1 AND name = $2 LIMIT 1",
                [v.type, v.name]
              );
              optId = existing.rows[0]?.id;
            }
            
            // Link to Aroma Kartuschen product
            if (optId) {
              await client.query(`
                INSERT INTO product_variants (product_id, option_id, price_modifier, is_default, sort_order)
                VALUES ($1, $2, 0, $3, $4)
                ON CONFLICT DO NOTHING
              `, [aromaId, optId, v.sort === 1, v.sort]);
            }
          }
          console.log('  Aroma variants seeded successfully');
        } else {
          console.log(`  Aroma Kartuschen already has ${existingVariants.rows[0].cnt} variants - OK`);
        }
      }
    } catch(e) { console.log('  Aroma variant seeding error:', e.message); }

    // Step: Ensure Aromaduschkopf has color variants (Schwarz/Edelstahl)
    console.log('\nStep: Ensuring Aromaduschkopf color variants...');
    try {
      const dkProduct = await client.query("SELECT id FROM products WHERE sku = 'CLYR-AROMA-DK' OR slug = 'clyr-aroma-duschkopf' LIMIT 1");
      if (dkProduct.rows.length > 0) {
        const dkId = dkProduct.rows[0].id;
        const existing = await client.query(
          'SELECT COUNT(*) as cnt FROM product_variants WHERE product_id = $1', 
          [dkId]
        );
        
        if (parseInt(existing.rows[0].cnt) === 0) {
          console.log('  Seeding Aromaduschkopf colors...');
          const colors = [
            { name: 'Schwarz', sort: 1 },
            { name: 'Edelstahl', sort: 2 },
          ];
          for (const c of colors) {
            const opt = await client.query(`
              INSERT INTO variant_options (type, name, price_modifier, image_url, sort_order, is_active)
              VALUES ('farbe', $1, 0, '', $2, true) ON CONFLICT DO NOTHING RETURNING id
            `, [c.name, c.sort]);
            let optId = opt.rows[0]?.id;
            if (!optId) {
              const ex = await client.query("SELECT id FROM variant_options WHERE type='farbe' AND name=$1 LIMIT 1", [c.name]);
              optId = ex.rows[0]?.id;
            }
            if (optId) {
              await client.query(`
                INSERT INTO product_variants (product_id, option_id, price_modifier, is_default, sort_order)
                VALUES ($1, $2, 0, $3, $4) ON CONFLICT DO NOTHING
              `, [dkId, optId, c.sort === 1, c.sort]);
            }
          }
          console.log('  Aromaduschkopf colors seeded');
        } else {
          console.log(`  Aromaduschkopf already has ${existing.rows[0].cnt} variants - OK`);
        }
      } else {
        console.log('  Aromaduschkopf product not found - skipping');
      }
    } catch(e) { console.log('  Aromaduschkopf variant error:', e.message); }

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
