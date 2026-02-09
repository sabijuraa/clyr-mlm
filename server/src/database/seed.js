import pool from '../config/database.js';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting CLYR database seeding...');
    
    await client.query('BEGIN');

    // ========================================
    // 1. SEED RANKS (same commission structure)
    // ========================================
    console.log('Seeding ranks...');
    // CORRECT commission rates per CLYR Vergütungsplan:
    // R1 Starter: 8% (€266 on €3,332.50 machine)
    // R2 Berater: 19% (€633) — 1-10 cumulative personal sales
    // R3 Fachberater: 21% (€699) — 11-20 cumulative personal sales
    // R4 Teamleiter: 25% (€833) — ≥5 personal + 15 team sales/month for 3 consecutive months
    // R5 Manager: 28% (€933) — 30 team sales/month for 3 consecutive months
    // R6 Sales Manager: 31% (€1,033) — 50 team sales/month for 3 consecutive months
    // R7 Direktor: 34% — Admin only (Theresa), NOT achievable by partners
    const ranks = [
      { name: 'Starter', slug: 'starter', level: 1, commission_rate: 8, min_own_sales: 0, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#94A3B8', description: 'Einstiegsrang für neue Partner' },
      { name: 'Berater', slug: 'berater', level: 2, commission_rate: 19, min_own_sales: 1, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#60A5FA', description: '1-10 kumulative persönliche Verkäufe oder Maschinenkauf' },
      { name: 'Fachberater', slug: 'fachberater', level: 3, commission_rate: 21, min_own_sales: 11, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#34D399', description: '11-20 kumulative persönliche Verkäufe' },
      { name: 'Teamleiter', slug: 'teamleiter', level: 4, commission_rate: 25, min_own_sales: 5, min_team_sales: 15, min_direct_partners: 0, one_time_bonus: 500, color: '#FBBF24', description: '≥5 persönliche + 15 Team-Verkäufe/Monat für 3 aufeinanderfolgende Monate' },
      { name: 'Manager', slug: 'manager', level: 5, commission_rate: 28, min_own_sales: 0, min_team_sales: 30, min_direct_partners: 0, one_time_bonus: 1000, color: '#F97316', description: '30 Team-Verkäufe/Monat für 3 aufeinanderfolgende Monate' },
      { name: 'Sales Manager', slug: 'sales-manager', level: 6, commission_rate: 31, min_own_sales: 0, min_team_sales: 50, min_direct_partners: 0, one_time_bonus: 2000, color: '#EF4444', description: '50 Team-Verkäufe/Monat für 3 aufeinanderfolgende Monate' },
      { name: 'Direktor', slug: 'direktor', level: 7, commission_rate: 34, min_own_sales: 0, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#7C3AED', description: 'Administratorrang - nur für Geschäftsführung' },
    ];

    for (const rank of ranks) {
      await client.query(`
        INSERT INTO ranks (name, slug, level, commission_rate, min_own_sales, min_team_sales, min_direct_partners, one_time_bonus, color, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (slug) DO UPDATE SET
          commission_rate = EXCLUDED.commission_rate,
          one_time_bonus = EXCLUDED.one_time_bonus,
          color = EXCLUDED.color,
          description = EXCLUDED.description
      `, [rank.name, rank.slug, rank.level, rank.commission_rate, rank.min_own_sales, rank.min_team_sales, rank.min_direct_partners, rank.one_time_bonus, rank.color, rank.description]);
    }

    // ========================================
    // 2. SEED CATEGORIES
    // ========================================
    console.log('Seeding categories...');
    const categories = [
      { name: 'Wassersysteme', name_en: 'Water Systems', slug: 'wassersysteme', description: 'Premium Soda- und Wassersysteme', description_en: 'Premium soda and water systems', sort_order: 1 },
      { name: 'Duschen', name_en: 'Showers', slug: 'duschen', description: 'Aromatherapie Duschköpfe', description_en: 'Aromatherapy shower heads', sort_order: 2 },
      { name: 'Dienstleistungen', name_en: 'Services', slug: 'dienstleistungen', description: 'Installation und Service', description_en: 'Installation and service', sort_order: 3 },
      { name: 'Abonnements', name_en: 'Subscriptions', slug: 'abonnements', description: 'Filter-Abos und Wartung', description_en: 'Filter subscriptions and maintenance', sort_order: 4 },
      { name: 'Zubehör', name_en: 'Accessories', slug: 'zubehoer', description: 'Zubehör und Ersatzteile', description_en: 'Accessories and spare parts', sort_order: 5 },
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const result = await client.query(`
        INSERT INTO categories (name, name_en, slug, description, description_en, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (slug) DO UPDATE SET 
          name = EXCLUDED.name, 
          name_en = EXCLUDED.name_en,
          description = EXCLUDED.description,
          description_en = EXCLUDED.description_en
        RETURNING id
      `, [cat.name, cat.name_en, cat.slug, cat.description, cat.description_en, cat.sort_order]);
      categoryIds[cat.slug] = result.rows[0].id;
    }

    // ========================================
    // 3. SEED ADMIN USER (Theresa)
    // ========================================
    console.log('Seeding admin user...');
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    
    await client.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, role, status,
        referral_code, country, rank_id, email_verified
      ) VALUES (
        'theresa@clyr.at', $1, 'Theresa', 'Struger', 'admin', 'active',
        'THERESA', 'AT', 7, true
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status
    `, [adminPassword]);

    // ========================================
    // 3b. SEED DEMO PARTNER
    // ========================================
    console.log('Seeding demo partner...');
    const partnerPassword = await bcrypt.hash('Partner123!', 12);
    
    await client.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, role, status,
        referral_code, country, rank_id, email_verified,
        phone, street, zip, city, iban, bic, bank_name, account_holder
      ) VALUES (
        'demo@partner.com', $1, 'Max', 'Mustermann', 'partner', 'active',
        'DEMO2025', 'DE', 2, true,
        '+49 170 1234567', 'Musterstraße 123', '80333', 'München',
        'DE89370400440532013000', 'COBADEFFXXX', 'Commerzbank', 'Max Mustermann'
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        status = EXCLUDED.status
    `, [partnerPassword]);

    // ========================================
    // 3c. SEED DEMO CUSTOMER
    // ========================================
    console.log('Seeding demo customer...');
    const customerPassword = await bcrypt.hash('Customer123!', 12);
    
    const customerResult = await client.query(`
      INSERT INTO customers (
        email, first_name, last_name, phone,
        street, zip, city, country, password_hash, is_registered
      ) VALUES (
        'demo@customer.com', 'Anna', 'Kundin', '+49 171 9876543',
        'Kundenweg 45', '10115', 'Berlin', 'DE', $1, true
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [customerPassword]);

    // ========================================
    // 4. SEED PRODUCTS - NEW CLYR PRODUCTS
    // ========================================
    console.log('Seeding CLYR products...');
    
    const products = [
      // MAIN PRODUCT 1: CLYR Soda with different faucets (Netto: 3332.50€)
      {
        name: 'CLYR Soda - Komplett-Set Spiralfeder Chrom',
        name_en: 'CLYR Soda - Complete Set Spiral Spring Chrome',
        slug: 'clyr-soda-spiralfeder-chrom',
        sku: 'CLYR-SODA-SPC',
        description: 'Die CLYR Soda Osmoseanlage - die kompakteste Untertisch-Anlage am Markt. Nahezu vollstaendig aus hochwertigem Edelstahl gefertigt.\n\nDas Komplett-Set beinhaltet die CLYR Osmoseanlage, die 5-Wege-Armatur Spiralfeder in Chrom, das Vorfilterset (All in One Filter), CO2-Flasche mit Druckminderer, alle Anschluesse und Schlaeuche aus medizinischem Edelstahl sowie eine Installationsanleitung.\n\n9 Filterstufen sorgen fuer reinstes Wasser. Technische Daten: Gewicht 16 kg, Wasserdruck 2-5 bar, Membranleistung 1x 500 GPD, Wasserausfluss 1,3 L/min, Masse B46 x H10 x T50 cm. 2 Jahre Garantie.',
        short_description: 'Untertisch-Osmoseanlage mit 9 Filterstufen inkl. Spiralfeder Armatur Chrom.',
        price: 3332.50,
        category_slug: 'wassersysteme',
        stock: 20,
        images: JSON.stringify(['/images/products/clyr-soda-set.png']),
        features: JSON.stringify(['9 Filterstufen', 'Integrierte Kuehlung', 'Sprudelwasser', 'Kompakteste Anlage am Markt', 'Edelstahl-Konstruktion', 'Spiralfeder Armatur Chrom', '2 Jahre Garantie']),
        is_featured: true, is_new: true, is_large_item: true, requires_installation: true, product_type: 'physical'
      },
      {
        name: 'CLYR Soda - Komplett-Set Spiralfeder Schwarz',
        name_en: 'CLYR Soda - Complete Set Spiral Spring Black',
        slug: 'clyr-soda-spiralfeder-schwarz',
        sku: 'CLYR-SODA-SPS',
        description: 'Die CLYR Soda Osmoseanlage mit der eleganten 5-Wege-Armatur Spiralfeder in Schwarz. Identische Technik mit 9 Filterstufen.\n\nKomplett-Set inkl. Osmoseanlage, Spiralfeder Armatur Schwarz, All in One Filter, CO2-Flasche, Anschluesse und Installationsanleitung.',
        short_description: 'Untertisch-Osmoseanlage mit 9 Filterstufen inkl. Spiralfeder Armatur Schwarz.',
        price: 3332.50,
        category_slug: 'wassersysteme',
        stock: 15,
        images: JSON.stringify(['/images/products/clyr-soda-set.png']),
        features: JSON.stringify(['9 Filterstufen', 'Integrierte Kuehlung', 'Sprudelwasser', 'Kompakteste Anlage am Markt', 'Edelstahl-Konstruktion', 'Spiralfeder Armatur Schwarz', '2 Jahre Garantie']),
        is_featured: true, is_new: true, is_large_item: true, requires_installation: true, product_type: 'physical'
      },
      {
        name: 'CLYR Soda - Komplett-Set L-Auslauf',
        name_en: 'CLYR Soda - Complete Set L-Spout',
        slug: 'clyr-soda-l-auslauf',
        sku: 'CLYR-SODA-LAU',
        description: 'Die CLYR Soda Osmoseanlage mit der klassischen 5-Wege-Armatur L-Auslauf. Identische Technik mit 9 Filterstufen.\n\nKomplett-Set inkl. Osmoseanlage, L-Auslauf Armatur, All in One Filter, CO2-Flasche, Anschluesse und Installationsanleitung.',
        short_description: 'Untertisch-Osmoseanlage mit 9 Filterstufen inkl. L-Auslauf Armatur.',
        price: 3332.50,
        category_slug: 'wassersysteme',
        stock: 10,
        images: JSON.stringify(['/images/products/clyr-soda-set.png']),
        features: JSON.stringify(['9 Filterstufen', 'Integrierte Kuehlung', 'Sprudelwasser', 'Kompakteste Anlage am Markt', 'Edelstahl-Konstruktion', 'L-Auslauf Armatur', '2 Jahre Garantie']),
        is_featured: false, is_new: true, is_large_item: true, requires_installation: true, product_type: 'physical'
      },
      // MAIN PRODUCT 2: CLYR Aromaduschkopf (Netto: 125.21€, inkl. 1 Kartusche Zitrone)
      {
        name: 'CLYR Aromaduschkopf',
        name_en: 'CLYR Aroma Shower Head',
        slug: 'clyr-aroma-duschkopf',
        sku: 'CLYR-AROMA-DK',
        description: 'Der CLYR Aromaduschkopf mit Vitamin-C Filter und Aromatherapie. Inklusive 1 Aroma-Kartusche (Zitrone).\n\nMikroloch-Technologie fuer bis zu 50% Wasser- und Energieersparnis. Passt auf jeden Standardanschluss.',
        short_description: 'Aromatherapie-Duschkopf mit Vitamin-C Filter inkl. 1 Kartusche Zitrone.',
        price: 125.21,
        category_slug: 'duschen',
        stock: 50,
        images: JSON.stringify(['/images/products/vitamin-c-filter.jpg']),
        features: JSON.stringify(['Vitamin-C Filter', 'Inkl. 1 Kartusche Zitrone', 'Mikroloch-Technologie', 'Bis zu 50% Wasserersparnis', 'Passt auf jeden Standardanschluss']),
        is_featured: true, is_new: true, is_large_item: false, requires_installation: false, product_type: 'physical'
      },
      // PLUS PRODUCTS / ZUBEHOER
      {
        name: 'All in One Filter', name_en: 'All in One Filter', slug: 'all-in-one-filter', sku: 'CLYR-AIO-F',
        description: 'Der All in One Vorfilter fuer die CLYR Soda. Muss alle 6 Monate gewechselt werden. Bei Maschinenkauf bereits enthalten.',
        short_description: 'Ersatz-Vorfilter fuer die CLYR Soda. Wechsel alle 6 Monate.',
        price: 75.00, category_slug: 'zubehoer', stock: 100,
        images: JSON.stringify(['/images/products/clyr-filter-open.jpg']),
        features: JSON.stringify(['Vorfilter fuer CLYR Soda', 'Wechsel alle 6 Monate', 'Im Erstset enthalten']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'Sango Koralle', name_en: 'Sango Coral', slug: 'sango-koralle', sku: 'CLYR-SANGO',
        description: 'Natuerliche Remineralisierung: wird nach der Maschine und vor dem Wasserhahn eingesetzt, um dem gefilterten Wasser wertvolle Mineralien zurueckzugeben.',
        short_description: 'Natuerliche Remineralisierung des gefilterten Wassers.',
        price: 120.00, category_slug: 'zubehoer', stock: 50,
        images: JSON.stringify([]),
        features: JSON.stringify(['Natuerliche Mineralien', 'Nach Maschine, vor Hahn', 'Verbessert Geschmack']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'BIO Tuner - Wasserverwirbler', name_en: 'BIO Tuner - Water Vortex', slug: 'bio-tuner', sku: 'CLYR-BIOTUNER',
        description: 'Der BIO Tuner gibt dem Wasser eine natuerliche Struktur zurueck. Fuer strukturiertes, lebendiges Wasser.',
        short_description: 'Wasserverwirbler fuer strukturiertes Wasser.',
        price: 250.00, category_slug: 'zubehoer', stock: 30,
        images: JSON.stringify([]),
        features: JSON.stringify(['Wasserstrukturierung', 'Natuerliche Verwirbelung', 'Einfache Installation']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'Externer Wasserstop', name_en: 'External Water Stop', slug: 'externer-wasserstop', sku: 'CLYR-WSTOP',
        description: 'Zusaetzliche Sicherheit fuer Ihre CLYR Soda Anlage. Schuetzt zuverlaessig vor Wasserschaeden.',
        short_description: 'Zusaetzlicher Schutz vor Wasserschaeden.',
        price: 110.00, category_slug: 'zubehoer', stock: 40,
        images: JSON.stringify([]),
        features: JSON.stringify(['Zusaetzliche Sicherheit', 'Schutz vor Wasserschaeden', 'Einfache Installation']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'Aroma Kartuschen 3er Set - Eukalyptus', name_en: 'Aroma Cartridges 3-Pack Eucalyptus', slug: 'aroma-kartuschen-eukalyptus', sku: 'CLYR-AK-EUK',
        description: '3er Set Aroma-Kartuschen mit Eukalyptus-Duft und Vitamin-C fuer den CLYR Aromaduschkopf.',
        short_description: '3er Set Aroma-Kartuschen Eukalyptus.',
        price: 48.00, category_slug: 'zubehoer', stock: 100,
        images: JSON.stringify([]),
        features: JSON.stringify(['3 Kartuschen', 'Eukalyptus-Duft', 'Vitamin-C']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'Aroma Kartuschen 3er Set - Zitrone', name_en: 'Aroma Cartridges 3-Pack Lemon', slug: 'aroma-kartuschen-zitrone', sku: 'CLYR-AK-LEM',
        description: '3er Set Aroma-Kartuschen mit Zitronen-Duft und Vitamin-C fuer den CLYR Aromaduschkopf.',
        short_description: '3er Set Aroma-Kartuschen Zitrone.',
        price: 48.00, category_slug: 'zubehoer', stock: 100,
        images: JSON.stringify([]),
        features: JSON.stringify(['3 Kartuschen', 'Zitronen-Duft', 'Vitamin-C']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'Aroma Kartuschen 3er Set - Pfefferminze', name_en: 'Aroma Cartridges 3-Pack Peppermint', slug: 'aroma-kartuschen-pfefferminze', sku: 'CLYR-AK-PFE',
        description: '3er Set Aroma-Kartuschen mit Pfefferminz-Duft und Vitamin-C fuer den CLYR Aromaduschkopf.',
        short_description: '3er Set Aroma-Kartuschen Pfefferminze.',
        price: 48.00, category_slug: 'zubehoer', stock: 100,
        images: JSON.stringify([]),
        features: JSON.stringify(['3 Kartuschen', 'Pfefferminz-Duft', 'Vitamin-C']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      // FILTER-ABO (alle 6 Monate, gleicher Preis wie All in One Filter)
      {
        name: 'Filter-Abo (alle 6 Monate)', name_en: 'Filter Subscription (6 months)', slug: 'filter-abo', sku: 'CLYR-FILTER-ABO',
        description: 'Das CLYR Filter-Abo - automatische Lieferung des All in One Filters alle 6 Monate. Nie wieder Filterwechsel vergessen.',
        short_description: 'Automatische Filterlieferung alle 6 Monate.',
        price: 75.00, category_slug: 'abonnements', stock: 999,
        images: JSON.stringify(['/images/products/clyr-filter-open.jpg']),
        features: JSON.stringify(['Alle 6 Monate', 'Kostenloser Versand', 'Jederzeit kuendbar']),
        is_featured: false, is_new: false, is_large_item: false, requires_installation: false, track_stock: false,
        product_type: 'subscription', subscription_interval_months: 6, is_subscription_eligible: true
      }
    ];

    // Delete old products that are no longer in the product list
    const validSlugs = products.map(p => p.slug);
    await client.query(`DELETE FROM products WHERE slug != ALL($1::text[])`, [validSlugs]);
    console.log('Cleaned old products');

    for (const product of products) {
      const categoryId = categoryIds[product.category_slug];
      await client.query(`
        INSERT INTO products (
          name, name_en, slug, sku, description, short_description,
          price, category_id, stock, images, features,
          is_featured, is_new, is_active, is_large_item,
          requires_installation, track_stock, product_type,
          subscription_interval_months, is_subscription_eligible
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          name_en = EXCLUDED.name_en,
          sku = EXCLUDED.sku,
          description = EXCLUDED.description,
          short_description = EXCLUDED.short_description,
          price = EXCLUDED.price,
          stock = EXCLUDED.stock,
          images = EXCLUDED.images,
          features = EXCLUDED.features,
          is_featured = EXCLUDED.is_featured,
          is_large_item = EXCLUDED.is_large_item,
          requires_installation = EXCLUDED.requires_installation,
          product_type = EXCLUDED.product_type,
          subscription_interval_months = EXCLUDED.subscription_interval_months,
          is_subscription_eligible = EXCLUDED.is_subscription_eligible
      `, [
        product.name, 
        product.name_en, 
        product.slug, 
        product.sku,
        product.description, 
        product.short_description,
        product.price, 
        categoryId, 
        product.stock, 
        product.images, 
        product.features,
        product.is_featured, 
        product.is_new, 
        product.is_large_item,
        product.requires_installation || false,
        product.track_stock !== false,
        product.product_type || 'physical',
        product.subscription_interval_months || null,
        product.is_subscription_eligible || false
      ]);
    }

    // ========================================
    // 5. SEED SETTINGS
    // ========================================
    console.log('Seeding settings...');
    
    const settings = [
      {
        key: 'shipping_costs',
        value: JSON.stringify({
          DE: { flat: 50.00 },
          AT: { flat: 69.00 },
          CH: { flat: 180.00 }
        }),
        description: 'Shipping costs per country'
      },
      {
        key: 'vat_rates',
        value: JSON.stringify({
          DE: 19,
          AT: 20,
          CH: 8.1
        }),
        description: 'VAT rates per country (%). DE: 19% B2C/0% B2B reverse charge. AT: 20% always. CH: 8.1% Swiss MwSt.'
      },
      {
        key: 'admin_commission_rate',
        value: JSON.stringify({ rate: 50 }),
        description: 'Admin commission rate (%)'
      },
      {
        key: 'commission_hold_days',
        value: JSON.stringify({ days: 14 }),
        description: 'Days to hold commission before release'
      },
      {
        key: 'min_payout_amount',
        value: JSON.stringify({ amount: 50 }),
        description: 'Minimum payout amount (EUR)'
      },
      {
        key: 'payout_day',
        value: JSON.stringify({ day: 1 }),
        description: 'Day of month for payouts'
      },
      {
        key: 'partner_annual_fee',
        value: JSON.stringify({ amount: 100, prorated: true }),
        description: 'Annual partner fee (EUR)'
      },
      {
        key: 'active_partner_requirement',
        value: JSON.stringify({ sales_per_quarter: 2 }),
        description: 'Minimum sales per quarter to be active'
      },
      {
        key: 'fulfillment_company',
        value: JSON.stringify({
          name: 'CLYR Solutions GmbH',
          street: 'Holz 33',
          zip: '5211',
          city: 'Lengau',
          country: 'Österreich',
          email: 'service@clyr.shop',
          website: 'www.clyr.shop'
        }),
        description: 'Company that ships products and issues customer invoices'
      },
      {
        key: 'affiliate_company',
        value: JSON.stringify({
          name: 'CLYR Solutions GmbH',
          street: 'Pappelweg 4b',
          zip: '9524',
          city: 'St. Magdalen',
          country: 'Österreich',
          email: 'service@clyr.shop',
          website: 'www.clyr.shop'
        }),
        description: 'Company that pays affiliate commissions'
      },
      {
        key: 'bonus_pool_rate',
        value: JSON.stringify({ rate: 2 }),
        description: 'Bonus pool percentage of total revenue for active leaders'
      },
      {
        key: 'rank_decay_months',
        value: JSON.stringify({ months: 12 }),
        description: 'Months of inactivity before rank decays to Berater (19%)'
      }
    ];

    for (const setting of settings) {
      await client.query(`
        INSERT INTO settings (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value,
          description = EXCLUDED.description
      `, [setting.key, setting.value, setting.description]);
    }

    // ========================================
    // 6. SEED ACADEMY CONTENT
    // ========================================
    console.log('Seeding academy content...');
    
    const academyContent = [
      {
        title: 'Willkommen bei CLYR',
        title_en: 'Welcome to CLYR',
        slug: 'welcome-to-clyr',
        description: 'Ihre Einführung in das CLYR Partner-Programm',
        type: 'video',
        category: 'onboarding',
        content_url: 'https://www.youtube.com/watch?v=example1',
        duration_minutes: 15,
        is_required: true,
        sort_order: 1
      },
      {
        title: 'Das CLYR Home Soda System',
        title_en: 'The CLYR Home Soda System',
        slug: 'clyr-home-soda-overview',
        description: 'Lernen Sie unser Hauptprodukt kennen',
        type: 'video',
        category: 'products',
        content_url: 'https://www.youtube.com/watch?v=example2',
        duration_minutes: 20,
        is_required: true,
        sort_order: 2
      },
      {
        title: 'Verkaufsgespräche führen',
        title_en: 'Conducting Sales Conversations',
        slug: 'sales-conversations',
        description: 'Tipps für erfolgreiche Kundengespräche',
        type: 'video',
        category: 'sales',
        content_url: 'https://www.youtube.com/watch?v=example3',
        duration_minutes: 25,
        is_required: false,
        sort_order: 3
      },
      {
        title: 'Provisionsrechner & Vergütungsplan',
        title_en: 'Commission Calculator & Compensation Plan',
        slug: 'commission-guide',
        description: 'Verstehen Sie wie Ihre Provisionen berechnet werden',
        type: 'document',
        category: 'onboarding',
        content_url: '/documents/commission-guide.pdf',
        is_required: true,
        sort_order: 4
      }
    ];

    for (const content of academyContent) {
      await client.query(`
        INSERT INTO academy_content (
          title, title_en, slug, description, type, category,
          content_url, duration_minutes, is_required, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          content_url = EXCLUDED.content_url
      `, [
        content.title, content.title_en, content.slug, content.description,
        content.type, content.category, content.content_url,
        content.duration_minutes || null, content.is_required, content.sort_order
      ]);
    }

    // ========================================
    // 10. SEED CMS CONTENT (Homepage)
    // ========================================
    console.log('Seeding CMS content...');
    
    const cmsContent = [
      // Hero Section
      {
        section: 'hero',
        key: 'main',
        title: 'Reines Wasser, Perfekt Gesprudelt',
        title_en: 'Pure Water, Perfectly Sparkling',
        subtitle: 'Das CLYR Home Soda System - Premium Wassersprudler mit 4-stufiger Filtration direkt aus Ihrer Leitung.',
        subtitle_en: 'The CLYR Home Soda System - Premium water carbonator with 4-stage filtration direct from your tap.',
        image_url: '/images/products/home-slim.jpg',
        link_url: '/produkte',
        link_text: 'Jetzt entdecken',
        link_text_en: 'Discover now',
        sort_order: 1
      },
      // Features
      {
        section: 'features',
        key: 'feature1',
        title: '4-Stufen Filtration',
        title_en: '4-Stage Filtration',
        content: 'Entfernt 99,9% aller Schadstoffe und behält wichtige Mineralien.',
        content_en: 'Removes 99.9% of all contaminants while retaining essential minerals.',
        metadata: JSON.stringify({ icon: 'filter' }),
        sort_order: 1
      },
      {
        section: 'features',
        key: 'feature2',
        title: 'Umweltfreundlich',
        title_en: 'Eco-Friendly',
        content: 'Keine Plastikflaschen mehr. Gut für Sie und die Umwelt.',
        content_en: 'No more plastic bottles. Good for you and the environment.',
        metadata: JSON.stringify({ icon: 'leaf' }),
        sort_order: 2
      },
      {
        section: 'features',
        key: 'feature3',
        title: 'Kostengünstig',
        title_en: 'Cost-Effective',
        content: 'Sparen Sie bis zu 80% im Vergleich zu Flaschenwasser.',
        content_en: 'Save up to 80% compared to bottled water.',
        metadata: JSON.stringify({ icon: 'piggybank' }),
        sort_order: 3
      },
      {
        section: 'features',
        key: 'feature4',
        title: 'Premium Design',
        title_en: 'Premium Design',
        content: 'Elegantes Edelstahl-Design passend für jede moderne Küche.',
        content_en: 'Elegant stainless steel design fitting any modern kitchen.',
        metadata: JSON.stringify({ icon: 'sparkles' }),
        sort_order: 4
      },
      // Stats
      {
        section: 'stats',
        key: 'stat1',
        title: '5.000+',
        content: 'Zufriedene Kunden',
        content_en: 'Happy Customers',
        sort_order: 1
      },
      {
        section: 'stats',
        key: 'stat2',
        title: '99,9%',
        content: 'Schadstoff-Filterung',
        content_en: 'Contaminant Filtration',
        sort_order: 2
      },
      {
        section: 'stats',
        key: 'stat3',
        title: '2 Jahre',
        content: 'Garantie',
        content_en: 'Warranty',
        sort_order: 3
      },
      {
        section: 'stats',
        key: 'stat4',
        title: '30 Tage',
        content: 'Rückgaberecht',
        content_en: 'Return Policy',
        sort_order: 4
      },
      // Testimonials
      {
        section: 'testimonials',
        key: 'testimonial1',
        title: 'Maria S.',
        subtitle: 'München',
        content: 'Das beste Investment für unsere Küche! Endlich kein Schleppen mehr und das Wasser schmeckt fantastisch.',
        content_en: 'The best investment for our kitchen! Finally no more carrying bottles and the water tastes fantastic.',
        metadata: JSON.stringify({ rating: 5 }),
        sort_order: 1
      },
      {
        section: 'testimonials',
        key: 'testimonial2',
        title: 'Thomas K.',
        subtitle: 'Wien',
        content: 'Professionelle Installation und super Service. Die Qualität ist wirklich Premium.',
        content_en: 'Professional installation and great service. The quality is truly premium.',
        metadata: JSON.stringify({ rating: 5 }),
        sort_order: 2
      },
      {
        section: 'testimonials',
        key: 'testimonial3',
        title: 'Sandra M.',
        subtitle: 'Zürich',
        content: 'Wir haben komplett auf CLYR umgestellt. Umweltfreundlich und praktisch!',
        content_en: 'We switched completely to CLYR. Eco-friendly and practical!',
        metadata: JSON.stringify({ rating: 5 }),
        sort_order: 3
      },
      // CTA Section
      {
        section: 'cta',
        key: 'main',
        title: 'Bereit für Premium Wasser?',
        title_en: 'Ready for Premium Water?',
        subtitle: 'Starten Sie heute mit CLYR und genießen Sie reines, gefiltertes Sprudelwasser.',
        subtitle_en: 'Start with CLYR today and enjoy pure, filtered sparkling water.',
        link_url: '/produkte/clyr-home-soda-standard',
        link_text: 'Jetzt bestellen',
        link_text_en: 'Order now',
        sort_order: 1
      }
    ];

    for (const content of cmsContent) {
      await client.query(`
        INSERT INTO cms_content (section, key, title, title_en, subtitle, subtitle_en, content, content_en, image_url, link_url, link_text, link_text_en, metadata, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (section, key) WHERE key IS NOT NULL DO UPDATE SET
          title = EXCLUDED.title,
          title_en = EXCLUDED.title_en,
          subtitle = EXCLUDED.subtitle,
          content = EXCLUDED.content
      `, [
        content.section, content.key, content.title, content.title_en,
        content.subtitle, content.subtitle_en, content.content, content.content_en,
        content.image_url, content.link_url, content.link_text, content.link_text_en,
        content.metadata || '{}', content.sort_order
      ]);
    }

    // ========================================
    // 11. SEED VARIANT OPTIONS (Faucet Types)
    // ========================================
    console.log('Seeding variant options...');
    
    const variantOptions = [
      // Faucet types for CLYR Home Soda
      {
        type: 'faucet',
        name: 'Standard Armatur',
        name_en: 'Standard Faucet',
        description: 'Klassische 3-Wege-Armatur in Edelstahl',
        price_modifier: 0,
        sort_order: 1
      },
      {
        type: 'faucet',
        name: 'Premium Armatur',
        name_en: 'Premium Faucet',
        description: 'Designer-Armatur mit Touch-Bedienung und LED',
        price_modifier: 200,
        sort_order: 2
      },
      {
        type: 'faucet',
        name: 'Deluxe Armatur',
        name_en: 'Deluxe Faucet',
        description: 'Exklusive Armatur mit Display und Smart-Features',
        price_modifier: 450,
        sort_order: 3
      },
      // Aroma types for Shower
      {
        type: 'aroma',
        name: 'Zitrus',
        name_en: 'Citrus',
        description: 'Erfrischend und belebend',
        price_modifier: 0,
        sort_order: 1
      },
      {
        type: 'aroma',
        name: 'Lavendel',
        name_en: 'Lavender',
        description: 'Beruhigend und entspannend',
        price_modifier: 0,
        sort_order: 2
      },
      {
        type: 'aroma',
        name: 'Eukalyptus',
        name_en: 'Eucalyptus',
        description: 'Befreiend und aktivierend',
        price_modifier: 0,
        sort_order: 3
      }
    ];

    const optionIds = {};
    for (const option of variantOptions) {
      const result = await client.query(`
        INSERT INTO variant_options (type, name, name_en, description, price_modifier, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [option.type, option.name, option.name_en, option.description, option.price_modifier, option.sort_order]);
      
      if (result.rows.length > 0) {
        optionIds[`${option.type}_${option.name}`] = result.rows[0].id;
      }
    }

    // Link variants to products (need to get product IDs first)
    const sodaProduct = await client.query("SELECT id FROM products WHERE slug = 'clyr-home-soda-standard'");
    if (sodaProduct.rows.length > 0 && optionIds['faucet_Standard Armatur']) {
      const productId = sodaProduct.rows[0].id;
      
      // Assign faucet options to soda product
      for (const faucetOption of variantOptions.filter(v => v.type === 'faucet')) {
        const optId = optionIds[`faucet_${faucetOption.name}`];
        if (optId) {
          await client.query(`
            INSERT INTO product_variants (product_id, option_id, price_modifier, is_default)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (product_id, option_id) DO NOTHING
          `, [productId, optId, faucetOption.price_modifier, faucetOption.name === 'Standard Armatur']);
        }
      }
    }

    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ CLYR Database seeded successfully!');
    console.log('');
    console.log('📧 Admin Login:');
    console.log('   Email: theresa@clyr.at');
    console.log('   Password: Admin123!');
    console.log('');
    console.log('📧 Demo Partner Login:');
    console.log('   Email: demo@partner.com');
    console.log('   Password: Partner123!');
    console.log('');
    console.log('🛒 Products Added:');
    console.log('   - CLYR Home Soda Standard (€3,332.50 net)');
    console.log('   - CLYR Home Soda Premium (€3,332.50 net)');
    console.log('   - CLYR Aroma Dusche Zitrus (€126 net)');
    console.log('   - CLYR Aroma Dusche Lavendel (€126 net)');
    console.log('   - CLYR Aroma Dusche Eukalyptus (€126 net)');
    console.log('   - Professionelle Installation (€400 net)');
    console.log('   - Filter-Abo jährlich (€149 net)');
    console.log('   - CO2-Flasche (€39.90 net)');
    console.log('   - Aroma-Kapseln Set (€24.90 net)');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('✅ SEEDING COMPLETE! Use these accounts to login:');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│  👑 ADMIN ACCOUNT                                   │');
    console.log('│  Email:    theresa@clyr.at                          │');
    console.log('│  Password: Admin123!                                │');
    console.log('│  Code:     THERESA                                  │');
    console.log('└─────────────────────────────────────────────────────┘');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│  🤝 DEMO PARTNER ACCOUNT                            │');
    console.log('│  Email:    demo@partner.com                         │');
    console.log('│  Password: Partner123!                              │');
    console.log('│  Code:     DEMO2025                                 │');
    console.log('└─────────────────────────────────────────────────────┘');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│  🛍️  DEMO CUSTOMER ACCOUNT                          │');
    console.log('│  Email:    demo@customer.com                        │');
    console.log('│  Password: Customer123!                             │');
    console.log('└─────────────────────────────────────────────────────┘');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
