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
    
    // Get rank_id for Sales Manager (level 6, 31% commission)
    const salesManagerRank = await client.query("SELECT id FROM ranks WHERE slug = 'sales-manager'");
    const salesManagerRankId = salesManagerRank.rows.length > 0 ? salesManagerRank.rows[0].id : 6;

    await client.query(`
      INSERT INTO users (
        email, password_hash, first_name, last_name, role, status,
        referral_code, country, rank_id, email_verified
      ) VALUES (
        'theresa@clyr.at', $1, 'Theresa', 'Struger', 'admin', 'active',
        'THERESA', 'AT', $2, true
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        rank_id = $2
    `, [adminPassword, salesManagerRankId]);

    // ========================================
    // 4. SEED PRODUCTS - NEW CLYR PRODUCTS
    // ========================================
    console.log('Seeding CLYR products...');
    
    const products = [
      // MAIN PRODUCT 1: CLYR Soda (single card, faucet choice on detail page)
      {
        name: 'CLYR Soda - Komplett-Set',
        name_en: 'CLYR Soda - Complete Set',
        slug: 'clyr-soda',
        sku: 'CLYR-SODA',
        description: 'Die CLYR Soda Osmoseanlage - die kompakteste Untertisch-Anlage am Markt. Nahezu vollstaendig aus hochwertigem Edelstahl gefertigt.\n\nDas Komplett-Set beinhaltet die CLYR Osmoseanlage, eine 5-Wege-Armatur (Auswahl: Spiralfeder Chrom, Spiralfeder Schwarz oder L-Auslauf), das Vorfilterset (All in One Filter), CO2-Flasche mit Druckminderer, alle Anschluesse und Schlaeuche aus medizinischem Edelstahl sowie eine Installationsanleitung.\n\n9 Filterstufen sorgen fuer reinstes Wasser. Technische Daten: Gewicht 16 kg, Wasserdruck 2-5 bar, Membranleistung 1x 500 GPD, Wasserausfluss 1,3 L/min, Masse B46 x H10 x T50 cm. 2 Jahre Garantie.',
        short_description: 'Untertisch-Osmoseanlage mit 9 Filterstufen. Armatur waehlbar: Spiralfeder Chrom, Spiralfeder Schwarz oder L-Auslauf.',
        price: 3332.50,
        category_slug: 'wassersysteme',
        stock: 20,
        images: JSON.stringify(['/images/products/clyr-soda-system.png', '/images/products/faucet-spiralfeder-chrom.png', '/images/products/faucet-spiralfeder-schwarz.png', '/images/products/faucet-l-auslauf.png']),
        features: JSON.stringify(['9 Filterstufen', 'Integrierte Kuehlung', 'Sprudelwasser', 'Kompakteste Anlage am Markt', 'Edelstahl-Konstruktion', '3 Armaturen zur Auswahl', 'All in One Filter inklusive', '2 Jahre Garantie']),
        is_featured: true, is_new: true, is_large_item: true, requires_installation: true, product_type: 'physical'
      },
      // MAIN PRODUCT 2: CLYR Aromaduschkopf
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
        images: JSON.stringify(['/images/products/aromaduschkopf.png', '/images/products/aromaduschkopf-detail.png']),
        features: JSON.stringify(['Vitamin-C Filter', 'Inkl. 1 Kartusche Zitrone', 'Mikroloch-Technologie', 'Bis zu 50% Wasserersparnis', 'Passt auf jeden Standardanschluss']),
        is_featured: true, is_new: true, is_large_item: false, requires_installation: false, product_type: 'physical'
      },
      // PLUS PRODUCTS
      {
        name: 'All in One Filter', name_en: 'All in One Filter', slug: 'all-in-one-filter', sku: 'CLYR-AIO-F',
        description: 'Der All in One Vorfilter fuer die CLYR Soda. Muss alle 6 Monate gewechselt werden. Bei Maschinenkauf bereits enthalten.',
        short_description: 'Ersatz-Vorfilter. Wechsel alle 6 Monate.',
        price: 75.00, category_slug: 'zubehoer', stock: 100,
        images: JSON.stringify(['/images/products/all-in-one-filter.png']),
        features: JSON.stringify(['Vorfilter fuer CLYR Soda', 'Wechsel alle 6 Monate', 'Im Erstset enthalten']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'Sango Koralle', name_en: 'Sango Coral', slug: 'sango-koralle', sku: 'CLYR-SANGO',
        description: 'Natuerliche Remineralisierung: wird nach der Maschine und vor dem Wasserhahn eingesetzt.',
        short_description: 'Remineralisierung des gefilterten Wassers.',
        price: 120.00, category_slug: 'zubehoer', stock: 50,
        images: JSON.stringify(['/images/products/sango-koralle.jpg']),
        features: JSON.stringify(['Natuerliche Mineralien', 'Nach Maschine, vor Hahn', 'Verbessert Geschmack']),
        is_featured: true, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'BIO Tuner - Wasserverwirbler', name_en: 'BIO Tuner - Water Vortex', slug: 'bio-tuner', sku: 'CLYR-BIOTUNER',
        description: 'Der BIO Tuner gibt dem Wasser eine natuerliche Struktur zurueck.',
        short_description: 'Wasserverwirbler fuer strukturiertes Wasser.',
        price: 250.00, category_slug: 'zubehoer', stock: 30,
        images: JSON.stringify(['/images/products/bio-tuner.png']),
        features: JSON.stringify(['Wasserstrukturierung', 'Natuerliche Verwirbelung', 'Einfache Installation']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'Externer Wasserstop', name_en: 'External Water Stop', slug: 'externer-wasserstop', sku: 'CLYR-WSTOP',
        description: 'Zusaetzliche Sicherheit fuer Ihre CLYR Soda Anlage.',
        short_description: 'Zusaetzlicher Schutz vor Wasserschaeden.',
        price: 110.00, category_slug: 'zubehoer', stock: 40,
        images: JSON.stringify(['/images/products/externer-wasserstop.jpg']),
        features: JSON.stringify(['Zusaetzliche Sicherheit', 'Schutz vor Wasserschaeden', 'Einfache Installation']),
        is_featured: false, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'Aroma Kartuschen 3er Set', name_en: 'Aroma Cartridges 3-Pack', slug: 'aroma-kartuschen', sku: 'CLYR-AK',
        description: '3er Set Aroma-Kartuschen mit Vitamin-C fuer den CLYR Aromaduschkopf. Duft waehlbar: Lavendel, Zitrone, Waldduft, Babypuder oder OceanBlue.',
        short_description: '3er Set Aroma-Kartuschen. Duft waehlbar.',
        price: 48.00, category_slug: 'duschen', stock: 100,
        images: JSON.stringify(['/images/products/aroma-kartuschen.png']),
        features: JSON.stringify(['3 Kartuschen', '5 Duefte waehlbar', 'Vitamin-C']),
        is_featured: true, is_new: false, is_large_item: false, product_type: 'physical'
      },
      {
        name: 'Filter-Abo (alle 6 Monate)', name_en: 'Filter Subscription (6 months)', slug: 'filter-abo', sku: 'CLYR-FILTER-ABO',
        description: 'Automatische Lieferung des All in One Filters alle 6 Monate.',
        short_description: 'Automatische Filterlieferung alle 6 Monate.',
        price: 75.00, category_slug: 'abonnements', stock: 999,
        images: JSON.stringify(['/images/products/all-in-one-filter.png']),
        features: JSON.stringify(['Alle 6 Monate', 'Kostenloser Versand', 'Jederzeit kuendbar']),
        is_featured: false, is_new: false, is_large_item: false, requires_installation: false, track_stock: false,
        product_type: 'subscription', subscription_interval_months: 6, is_subscription_eligible: true
      },
      // DIENSTLEISTUNG: Professionelle Montage
      {
        name: 'Professionelle Montage', name_en: 'Professional Installation', slug: 'professionelle-montage', sku: 'CLYR-MONTAGE',
        description: 'Professionelle Installation Ihrer CLYR Soda Anlage durch unsere zertifizierten Techniker. Preis auf Anfrage - kontaktieren Sie uns fuer ein individuelles Angebot.',
        short_description: 'Professionelle Installation durch zertifizierte Techniker. Preis auf Anfrage.',
        price: 0, category_slug: 'dienstleistungen', stock: 999,
        images: JSON.stringify(['/images/products/clyr-soda-system.png']),
        features: JSON.stringify(['Zertifizierte Techniker', 'Terminvereinbarung', 'Preis auf Anfrage']),
        is_featured: false, is_new: false, is_large_item: false, requires_installation: false, track_stock: false,
        product_type: 'service'
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
          DE: { flat: 70.00 },
          AT: { flat: 55.00 },
          CH: { flat: 180.00 }
        }),
        description: 'Shipping costs per country - TEST (change back: DE:70, AT:55, CH:180)'
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
        metadata: JSON.stringify({}),
        sort_order: 1
      },
      {
        section: 'testimonials',
        key: 'testimonial2',
        title: 'Thomas K.',
        subtitle: 'Wien',
        content: 'Professionelle Installation und super Service. Die Qualität ist wirklich Premium.',
        content_en: 'Professional installation and great service. The quality is truly premium.',
        metadata: JSON.stringify({}),
        sort_order: 2
      },
      {
        section: 'testimonials',
        key: 'testimonial3',
        title: 'Sandra M.',
        subtitle: 'Zürich',
        content: 'Wir haben komplett auf CLYR umgestellt. Umweltfreundlich und praktisch!',
        content_en: 'We switched completely to CLYR. Eco-friendly and practical!',
        metadata: JSON.stringify({}),
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


    await client.query('COMMIT');


    const legalPages = [
      { key: 'privacy', title: 'Datenschutzerklaerung', content: `In folgender Datenschutzerklaerung informieren wir Sie ueber die wichtigsten Aspekte der Datenverarbeitung im Rahmen unserer Webseite. Wir erheben und verarbeiten personenbezogene Daten nur auf Grundlage der gesetzlichen Bestimmungen (Datenschutzgrundverordnung, Telekommunikationsgesetz 2003).\n\nSobald Sie als Benutzer auf unsere Webseite zugreifen oder diese besuchen wird Ihre IP-Adresse, Beginn sowie Beginn und Ende der Sitzung erfasst.\n\nKontakt mit uns: Wenn Sie uns per Email kontaktieren, werden die von Ihnen uebermittelten Daten fuer sechs Monate gespeichert.\n\nCookies: Unsere Website verwendet Cookies. Sie richten keinen Schaden an.\n\nGoogle Maps & Google Fonts werden verwendet.\n\nIhre Rechte: Auskunft, Loeschung, Berichtigung, Uebertragbarkeit, Widerspruch.\n\nWebseitenbetreiber: Theresa Struger\nTelefon: +43 664 2520432\nEmail: admin@clyr.shop` },
      { key: 'imprint', title: 'Impressum', content: `CLYR Solutions GmbH\nPappelweg 4b, 9524 St. Magdalen\nGeschaeftsfuehrerin: Theresa Struger\nOesterreich\n+43 (0) 664 2520432\nadmin@clyr.shop\nwww.clyr.shop\n\nRegisternummer: (wird ergaenzt)\nRegistergericht: Handelsregister Villach\n\nEU-Streitschlichtung: https://ec.europa.eu/consumers/odr\n\nHaftung fuer Inhalte: Wir entwickeln die Inhalte staendig weiter.\nHaftung fuer Links: Wir sind fuer verlinkte Inhalte nicht verantwortlich.\nUrheberrecht: Alle Inhalte sind urheberrechtlich geschuetzt.\nBilderrechte: Shutterstock, Wix, Canva, Unsplash, Theresa Struger` },
      { key: 'terms', title: 'Allgemeine Geschaeftsbedingungen (AGB)', content: `AGB der CLYR Solutions GmbH\n\n§1 Geltungsbereich: Diese AGB gelten fuer saemtliche Vertraege der CLYR Solutions GmbH, Pappelweg 4b, 9524 St. Magdalen, Geschaeftsfuehrerin Theresa Struger.\n\n§2 Vertragsgegenstand: Verkauf von Wasseraufbereitungssystemen, Umkehrosmoseanlagen, Zubehoer und Ersatzteile. Optional Montage- und Serviceleistungen.\n\n§3 Vertragsabschluss: Die Praesentation der Produkte stellt kein bindendes Angebot dar. Der Vertrag kommt zustande durch Auftragsbestaetigung, Lieferung oder Rechnungslegung.\n\n§4 Preise: Alle Preise inklusive MwSt. zuzueglich Versandkosten. Zahlung per Vorkasse oder Bankueberweisung.\n\n§5 Lieferung: An die angegebene Adresse. Lieferzeiten unverbindlich. Teillieferungen zulaessig.\n\n§6 Montage: Optional durch zertifizierte Fachkraefte. Gesondert verrechnet.\n\n§7 Selbstmontage: Auf eigene Verantwortung. Keine Haftung bei unsachgemaesser Installation.\n\n§8 Gewaehrleistung: Gesetzliche Rechte nach AT-Recht. Verschleissteile ausgenommen. Garantie nur bei Einhaltung der Wartungsintervalle.\n\n§9 Betrieb und Wartung: Wartungsintervalle zwingend einzuhalten.\n\n§10 Eigentumsvorbehalt: Ware bleibt bis Bezahlung Eigentum der CLYR Solutions GmbH.\n\n§11 Haftung: Unbeschraenkt bei Vorsatz/grober Fahrlaessigkeit. Beschraenkt bei leichter Fahrlaessigkeit.\n\n§12 Gerichtsstand: Oesterreichisches Recht. Gerichtsstand Sitz der CLYR Solutions GmbH.\n\n§13 Salvatorische Klausel.` },
      { key: 'withdrawal', title: 'Widerrufsbelehrung', content: `Widerrufsrecht\n\nSie haben das Recht, binnen 14 Tagen ohne Angabe von Gruenden diesen Vertrag zu widerrufen.\n\nDie Widerrufsfrist betraegt 14 Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter die Waren in Besitz genommen haben.\n\nUm Ihr Widerrufsrecht auszuueben, muessen Sie uns (CLYR Solutions GmbH, Pappelweg 4b, 9524 St. Magdalen, admin@clyr.shop, +43 664 2520432) mittels einer eindeutigen Erklaerung ueber Ihren Entschluss informieren.\n\nFolgen des Widerrufs: Wir erstatten alle Zahlungen unverzueglich und spaetestens binnen 14 Tagen.` },
      { key: 'vp_vertrag', title: 'VP-Vertrag', content: 'Vertriebspartner-Vertrag. Bitte kontaktieren Sie uns fuer Details.' }
    ];

    for (const page of legalPages) {
      await client.query(
        `INSERT INTO legal_pages (page_key, title, content) VALUES ($1, $2, $3) ON CONFLICT (page_key) DO UPDATE SET title = $2, content = $3`,
        [page.key, page.title, page.content]
      );
    }
    console.log('Legal pages seeded.');

    // ============ SEED VARIANT OPTIONS ============
    console.log('Seeding variant options...');
    
    // Faucet variants for CLYR Soda
    const faucetVariants = [
      { type: 'armatur', name: 'Spiralfeder Chrom', image: '/images/products/faucet-spiralfeder-chrom.png', price: 0, sort: 1 },
      { type: 'armatur', name: 'Spiralfeder Schwarz', image: '/images/products/faucet-spiralfeder-schwarz.png', price: 0, sort: 2 },
      { type: 'armatur', name: 'L-Auslauf', image: '/images/products/faucet-l-auslauf.png', price: 0, sort: 3 },
    ];

    // Aromaduschkopf color variants
    const showerVariants = [
      { type: 'farbe', name: 'Schwarz', image: '', price: 0, sort: 1 },
      { type: 'farbe', name: 'Edelstahl', image: '', price: 0, sort: 2 },
    ];

    // Aroma Kartuschen scent variants
    const aromaVariants = [
      { type: 'duft', name: 'Lavendel', image: '', price: 0, sort: 1 },
      { type: 'duft', name: 'Zitrone', image: '', price: 0, sort: 2 },
      { type: 'duft', name: 'Waldduft', image: '', price: 0, sort: 3 },
      { type: 'duft', name: 'Babypuder', image: '', price: 0, sort: 4 },
      { type: 'duft', name: 'OceanBlue', image: '', price: 0, sort: 5 },
    ];

    // Delete old variants
    await client.query('DELETE FROM product_variants');
    await client.query('DELETE FROM variant_options');

    const allVariants = [...faucetVariants, ...showerVariants, ...aromaVariants];
    const variantIds = {};
    for (const v of allVariants) {
      const r = await client.query(
        `INSERT INTO variant_options (type, name, price_modifier, image_url, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
        [v.type, v.name, v.price, v.image, v.sort]
      );
      variantIds[v.type + ':' + v.name] = r.rows[0].id;
    }

    // Assign faucet variants to CLYR Soda
    const sodaProduct = await client.query("SELECT id FROM products WHERE sku = 'CLYR-SODA'");
    if (sodaProduct.rows.length > 0) {
      const sodaId = sodaProduct.rows[0].id;
      for (const v of faucetVariants) {
        const optId = variantIds[v.type + ':' + v.name];
        await client.query(
          `INSERT INTO product_variants (product_id, option_id, price_modifier, is_default, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [sodaId, optId, 0, v.sort === 1, v.sort]
        );
      }
    }

    // Assign color variants to Aromaduschkopf
    const showerProduct = await client.query("SELECT id FROM products WHERE sku = 'CLYR-AROMA-DK'");
    if (showerProduct.rows.length > 0) {
      const showerId = showerProduct.rows[0].id;
      for (const v of showerVariants) {
        const optId = variantIds[v.type + ':' + v.name];
        await client.query(
          `INSERT INTO product_variants (product_id, option_id, price_modifier, is_default, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [showerId, optId, 0, v.sort === 1, v.sort]
        );
      }
    }

    console.log('Variant options seeded.');

    // Assign scent variants to Aroma Kartuschen
    const aromaProduct = await client.query("SELECT id FROM products WHERE sku = 'CLYR-AK'");
    if (aromaProduct.rows.length > 0) {
      const aromaId = aromaProduct.rows[0].id;
      for (const v of aromaVariants) {
        const optId = variantIds[v.type + ':' + v.name];
        if (optId) {
          await client.query(
            `INSERT INTO product_variants (product_id, option_id, price_modifier, is_default, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [aromaId, optId, 0, v.sort === 1, v.sort]
          );
        }
      }
    }

    console.log('All variant assignments complete.');

    // ============ SEED SHIPPING SETTINGS ============
    console.log('Seeding shipping settings...');
    const shippingSettings = [
      { key: 'shipping_at', value: '55', desc: 'Versandkosten Oesterreich' },
      { key: 'shipping_de', value: '70', desc: 'Versandkosten Deutschland' },
      { key: 'shipping_ch', value: '180', desc: 'Versandkosten Schweiz' },
    ];
    for (const s of shippingSettings) {
      await client.query(
        `INSERT INTO settings (key, value, description) VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [s.key, s.value, s.desc]
      );
    }
    console.log('Shipping settings seeded.');

    console.log('');
    console.log('✅ SEEDING COMPLETE! Use these accounts to login:');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│  ADMIN ACCOUNT                                      │');
    console.log('│  Email:    theresa@clyr.at                          │');
    console.log('│  Password: Admin123!                                │');
    console.log('│  Code:     THERESA                                  │');
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