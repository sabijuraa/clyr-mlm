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
    const ranks = [
      { name: 'Starter', slug: 'starter', level: 1, commission_rate: 8, min_own_sales: 0, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#737373', description: 'Einstiegsrang für neue Partner' },
      { name: 'Berater', slug: 'berater', level: 2, commission_rate: 22, min_own_sales: 1, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#0ea5e9', description: 'Automatisch nach erstem Verkauf oder Maschinenkauf' },
      { name: 'Senior Berater', slug: 'senior-berater', level: 3, commission_rate: 26, min_own_sales: 11, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#22c55e', description: '11+ eigene Verkäufe' },
      { name: 'Teamleiter', slug: 'teamleiter', level: 4, commission_rate: 30, min_own_sales: 21, min_team_sales: 10, min_direct_partners: 2, one_time_bonus: 500, color: '#f59e0b', description: '21+ eigene, 10+ Team, 2+ direkte Partner' },
      { name: 'Manager', slug: 'manager', level: 5, commission_rate: 33, min_own_sales: 50, min_team_sales: 50, min_direct_partners: 5, one_time_bonus: 1000, color: '#f97316', description: '50+ eigene, 50+ Team, 5+ direkte Partner' },
      { name: 'Verkaufsleiter', slug: 'verkaufsleiter', level: 6, commission_rate: 36, min_own_sales: 100, min_team_sales: 200, min_direct_partners: 10, one_time_bonus: 2000, color: '#ef4444', description: '100+ eigene, 200+ Team, 10+ direkte Partner' },
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
        'THERESA', 'AT', 6, true
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        status = EXCLUDED.status
    `, [adminPassword]);

    // ========================================
    // 4. SEED PRODUCTS - NEW CLYR PRODUCTS
    // ========================================
    console.log('Seeding CLYR products...');
    
    const products = [
      // Main Product 1: CLYR Home Soda (former STILLUNDLAUT)
      {
        name: 'CLYR Home Soda - Standard Armatur',
        name_en: 'CLYR Home Soda - Standard Faucet',
        slug: 'clyr-home-soda-standard',
        sku: 'CLYR-SODA-STD',
        description: `Das CLYR Home Soda System - Ihr Premium Wassersprudler für Zuhause.

EIGENSCHAFTEN:
• Hochwertiges Edelstahl-Design
• 3-Wege-Armatur (still, medium, sprudelnd)
• Untertisch-Installation
• Direktanschluss an die Wasserleitung
• CO2-Flasche inklusive

FILTERLEISTUNG:
• 4-stufiges Hochleistungs-Filtrationssystem
• Entfernt 99,9% aller Schadstoffe
• Reduziert Kalk, Chlor und Schwermetalle
• Behält wichtige Mineralien

LIEFERUMFANG:
• CLYR Home Soda Einheit
• Standard 3-Wege-Armatur
• CO2-Flasche (425g)
• Komplettes Anschluss-Set
• Bedienungsanleitung`,
        short_description: 'Premium Wassersprudler mit Standard-Armatur für stilles, medium und sprudelndes Wasser.',
        price: 3332.50, // NET price without VAT
        category_slug: 'wassersysteme',
        stock: 20,
        images: JSON.stringify(['/images/products/home-slim.jpg', '/images/products/home-slim-angle.jpg']),
        features: JSON.stringify(['4-stufige Filtration', '3 Sprudelstufen', 'Edelstahl-Design', 'CO2 inklusive']),
        is_featured: true,
        is_new: true,
        is_large_item: true,
        requires_installation: true,
        product_type: 'physical'
      },
      {
        name: 'CLYR Home Soda - Premium Armatur',
        name_en: 'CLYR Home Soda - Premium Faucet',
        slug: 'clyr-home-soda-premium',
        sku: 'CLYR-SODA-PRM',
        description: `Das CLYR Home Soda System mit Premium-Armatur - Höchste Qualität für Ihre Küche.

EIGENSCHAFTEN:
• Designer Edelstahl-Armatur
• Touch-Bedienung
• LED-Anzeige für Füllstand
• 3-Wege-System (still, medium, sprudelnd)
• Elegantes, modernes Design

FILTERLEISTUNG:
• 4-stufiges Hochleistungs-Filtrationssystem
• Entfernt 99,9% aller Schadstoffe
• Reduziert Kalk, Chlor und Schwermetalle
• Behält wichtige Mineralien

LIEFERUMFANG:
• CLYR Home Soda Einheit
• Premium Designer-Armatur
• CO2-Flasche (425g)
• Komplettes Anschluss-Set
• Bedienungsanleitung`,
        short_description: 'Premium Wassersprudler mit Designer-Armatur und Touch-Bedienung.',
        price: 3332.50, // Same NET price
        category_slug: 'wassersysteme',
        stock: 15,
        images: JSON.stringify(['/images/products/tower-front.png']),
        features: JSON.stringify(['Touch-Bedienung', 'LED-Anzeige', 'Designer-Armatur', 'Premium-Qualität']),
        is_featured: true,
        is_new: true,
        is_large_item: true,
        requires_installation: true,
        product_type: 'physical'
      },
      // Main Product 2: Shower (Aroma Sense)
      {
        name: 'CLYR Aroma Dusche - Zitrus',
        name_en: 'CLYR Aroma Shower - Citrus',
        slug: 'clyr-aroma-dusche-zitrus',
        sku: 'CLYR-SHOWER-CIT',
        description: `Die CLYR Aroma Dusche - Verwandeln Sie Ihr Bad in ein Spa-Erlebnis.

EIGENSCHAFTEN:
• Vitamin C Filterung
• Aromatherapie-Kapseln
• Erhöhter Wasserdruck
• Wasserersparnis bis zu 30%
• Einfache Installation

AROMA: Zitrus
• Erfrischend und belebend
• Natürliche Zitrusöle
• Stärkt die Sinne

FILTERLEISTUNG:
• Entfernt Chlor aus dem Wasser
• Vitamin C angereichert
• Sanft zur Haut und Haaren

LIEFERUMFANG:
• CLYR Aroma Duschkopf
• 2x Aromatherapie-Kapseln
• Anschluss-Adapter
• Bedienungsanleitung`,
        short_description: 'Aromatherapie-Dusche mit Zitrus-Duft und Vitamin C Filterung.',
        price: 126.00, // NET price
        category_slug: 'duschen',
        stock: 50,
        images: JSON.stringify(['/images/products/compact-closed.png']),
        features: JSON.stringify(['Vitamin C Filter', 'Aromatherapie', '30% Wasserersparnis', 'Einfache Montage']),
        is_featured: true,
        is_new: false,
        is_large_item: false,
        requires_installation: false,
        product_type: 'physical'
      },
      {
        name: 'CLYR Aroma Dusche - Lavendel',
        name_en: 'CLYR Aroma Shower - Lavender',
        slug: 'clyr-aroma-dusche-lavendel',
        sku: 'CLYR-SHOWER-LAV',
        description: `Die CLYR Aroma Dusche - Entspannung pur.

EIGENSCHAFTEN:
• Vitamin C Filterung
• Aromatherapie-Kapseln
• Erhöhter Wasserdruck
• Wasserersparnis bis zu 30%
• Einfache Installation

AROMA: Lavendel
• Beruhigend und entspannend
• Natürliche Lavendelöle
• Ideal für den Abend

FILTERLEISTUNG:
• Entfernt Chlor aus dem Wasser
• Vitamin C angereichert
• Sanft zur Haut und Haaren

LIEFERUMFANG:
• CLYR Aroma Duschkopf
• 2x Aromatherapie-Kapseln
• Anschluss-Adapter
• Bedienungsanleitung`,
        short_description: 'Aromatherapie-Dusche mit Lavendel-Duft für entspannte Momente.',
        price: 126.00,
        category_slug: 'duschen',
        stock: 50,
        images: JSON.stringify(['/images/products/compact-open.png']),
        features: JSON.stringify(['Vitamin C Filter', 'Lavendel-Aroma', 'Entspannend', 'Einfache Montage']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        requires_installation: false,
        product_type: 'physical'
      },
      {
        name: 'CLYR Aroma Dusche - Eukalyptus',
        name_en: 'CLYR Aroma Shower - Eucalyptus',
        slug: 'clyr-aroma-dusche-eukalyptus',
        sku: 'CLYR-SHOWER-EUC',
        description: `Die CLYR Aroma Dusche - Für freie Atemwege.

EIGENSCHAFTEN:
• Vitamin C Filterung
• Aromatherapie-Kapseln
• Erhöhter Wasserdruck
• Wasserersparnis bis zu 30%
• Einfache Installation

AROMA: Eukalyptus
• Befreiend und erfrischend
• Natürliche Eukalyptusöle
• Ideal bei Erkältungen

LIEFERUMFANG:
• CLYR Aroma Duschkopf
• 2x Aromatherapie-Kapseln
• Anschluss-Adapter
• Bedienungsanleitung`,
        short_description: 'Aromatherapie-Dusche mit Eukalyptus-Duft für freie Atemwege.',
        price: 126.00,
        category_slug: 'duschen',
        stock: 50,
        images: JSON.stringify(['/images/products/complete-set.png']),
        features: JSON.stringify(['Vitamin C Filter', 'Eukalyptus-Aroma', 'Befreiend', 'Einfache Montage']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        requires_installation: false,
        product_type: 'physical'
      },
      // Service: Installation
      {
        name: 'Professionelle Installation',
        name_en: 'Professional Installation',
        slug: 'installation',
        sku: 'CLYR-INSTALL',
        description: `Professionelle Installation Ihres CLYR Home Soda Systems durch unsere zertifizierten Techniker.

SERVICE UMFASST:
• Terminvereinbarung nach Ihren Wünschen
• Anfahrt und Montage
• Anschluss an Wasserleitung
• Funktionstest
• Einweisung in die Bedienung

ABLAUF:
1. Bestellung der Installation
2. Terminvereinbarung innerhalb von 48h
3. Montage vor Ort (ca. 2 Stunden)
4. Einweisung und Übergabe

WICHTIG:
• Nur in Kombination mit CLYR Home Soda System
• Verfügbar in DE, AT und CH
• Standardinstallation - Sonderarbeiten nach Aufwand`,
        short_description: 'Professionelle Montage durch zertifizierte Techniker inkl. Einweisung.',
        price: 400.00, // NET price
        category_slug: 'dienstleistungen',
        stock: 999,
        images: JSON.stringify([]),
        features: JSON.stringify(['Terminvereinbarung', 'Komplette Montage', 'Funktionstest', 'Einweisung']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        requires_installation: false,
        track_stock: false,
        product_type: 'service'
      },
      // Subscription: Filter-Abo
      {
        name: 'Filter-Abo (jährlich)',
        name_en: 'Filter Subscription (yearly)',
        slug: 'filter-abo',
        sku: 'CLYR-FILTER-ABO',
        description: `Das CLYR Filter-Abo - Immer frische Filter, automatisch geliefert.

ENTHÄLT:
• Komplettes Filter-Set für Ihr CLYR System
• Kostenloser Versand
• Automatische Lieferung alle 12 Monate
• Wechselanleitung

VORTEILE:
• Nie wieder an den Filterwechsel denken
• Garantiert beste Wasserqualität
• Sparen Sie 15% gegenüber Einzelkauf
• Jederzeit kündbar

FILTERINHALT:
• 1x Sedimentfilter
• 1x Aktivkohlefilter
• 1x Membranfilter
• 1x Feinfilter`,
        short_description: 'Jährliche automatische Filterlieferung mit 15% Ersparnis.',
        price: 149.00, // NET price for annual subscription
        category_slug: 'abonnements',
        stock: 999,
        images: JSON.stringify([]),
        features: JSON.stringify(['Automatische Lieferung', '15% Ersparnis', 'Kostenloser Versand', 'Jederzeit kündbar']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        requires_installation: false,
        track_stock: false,
        product_type: 'subscription',
        subscription_interval_months: 12,
        is_subscription_eligible: true
      },
      // Accessory: CO2-Flasche
      {
        name: 'CO2-Flasche 425g',
        name_en: 'CO2 Cylinder 425g',
        slug: 'co2-flasche',
        sku: 'CLYR-CO2-425',
        description: `Original CLYR CO2-Flasche für Ihr Home Soda System.

DETAILS:
• Inhalt: 425g CO2
• Reicht für ca. 60 Liter Sprudelwasser
• Lebensmittelgeeignetes CO2
• Wiederverwendbare Flasche

TAUSCH-SERVICE:
Leere Flaschen können bei uns getauscht werden.
Tauschpreis: 29,90€ (netto)`,
        short_description: 'CO2-Flasche für ca. 60 Liter Sprudelwasser.',
        price: 39.90,
        category_slug: 'zubehoer',
        stock: 100,
        images: JSON.stringify([]),
        features: JSON.stringify(['425g CO2', '60L Sprudelwasser', 'Lebensmittelecht', 'Tauschbar']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        product_type: 'physical'
      },
      // Accessory: Aroma-Kapseln Set
      {
        name: 'Aroma-Kapseln Set (6 Stück)',
        name_en: 'Aroma Capsules Set (6 pieces)',
        slug: 'aroma-kapseln-set',
        sku: 'CLYR-AROMA-6',
        description: `Nachfüll-Set für Ihre CLYR Aroma Dusche.

ENTHÄLT:
• 2x Zitrus-Kapseln
• 2x Lavendel-Kapseln
• 2x Eukalyptus-Kapseln

HALTBARKEIT:
Jede Kapsel hält ca. 30 Duschen (abhängig von Duschzeit und Wasserdruck).`,
        short_description: 'Nachfüll-Set mit 6 Aromatherapie-Kapseln in 3 Düften.',
        price: 24.90,
        category_slug: 'zubehoer',
        stock: 200,
        images: JSON.stringify([]),
        features: JSON.stringify(['6 Kapseln', '3 Düfte', 'Ca. 180 Duschen', 'Natürliche Öle']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        product_type: 'physical'
      }
    ];

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
          CH: 0
        }),
        description: 'VAT rates per country (%)'
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
          name: 'MUTIMBAUCH Vertriebs GmbH',
          street: 'Industriestraße 123',
          zip: '80333',
          city: 'München',
          country: 'Deutschland',
          vat_id: 'DE123456789'
        }),
        description: 'Company that ships products and issues customer invoices'
      },
      {
        key: 'affiliate_company',
        value: JSON.stringify({
          name: 'Theresa Struger - FreshLiving',
          street: 'Musterstraße 1',
          zip: '1010',
          city: 'Wien',
          country: 'Österreich',
          vat_id: 'ATU12345678'
        }),
        description: 'Company that pays affiliate commissions'
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
    // 6. SEED DEMO PARTNER
    // ========================================
    console.log('Seeding demo partner...');
    const partnerPassword = await bcrypt.hash('Partner123!', 12);
    
    const adminResult = await client.query(`SELECT id FROM users WHERE email = 'theresa@clyr.at'`);
    const adminId = adminResult.rows[0]?.id;

    if (adminId) {
      await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, role, status,
          referral_code, country, rank_id, upline_id, email_verified,
          street, zip, city, iban
        ) VALUES (
          'demo@partner.com', $1, 'Max', 'Mustermann', 'partner', 'active',
          'MAXDEMO', 'DE', 2, $2, true,
          'Teststraße 1', '80331', 'München', 'DE89370400440532013000'
        )
        ON CONFLICT (email) DO NOTHING
      `, [partnerPassword, adminId]);
    }

    // ========================================
    // 7. SEED ACADEMY CONTENT
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
    console.log('💶 Commission Structure:');
    console.log('   - Admin (Theresa): 50% of all sales');
    console.log('   - Partners: 8% - 36% based on rank');
    console.log('');
    console.log('📦 Shipping Costs (Updated):');
    console.log('   - Germany: €50');
    console.log('   - Austria: €69');
    console.log('   - Switzerland: €180');
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
