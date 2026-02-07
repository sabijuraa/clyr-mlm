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
    // R7 Direktor: 36% — Admin only (Theresa), NOT achievable by partners
    const ranks = [
      { name: 'Starter', slug: 'starter', level: 1, commission_rate: 8, min_own_sales: 0, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#94A3B8', description: 'Einstiegsrang für neue Partner' },
      { name: 'Berater', slug: 'berater', level: 2, commission_rate: 19, min_own_sales: 1, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#60A5FA', description: '1-10 kumulative persönliche Verkäufe oder Maschinenkauf' },
      { name: 'Fachberater', slug: 'fachberater', level: 3, commission_rate: 21, min_own_sales: 11, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#34D399', description: '11-20 kumulative persönliche Verkäufe' },
      { name: 'Teamleiter', slug: 'teamleiter', level: 4, commission_rate: 25, min_own_sales: 5, min_team_sales: 15, min_direct_partners: 0, one_time_bonus: 500, color: '#FBBF24', description: '≥5 persönliche + 15 Team-Verkäufe/Monat für 3 aufeinanderfolgende Monate' },
      { name: 'Manager', slug: 'manager', level: 5, commission_rate: 28, min_own_sales: 0, min_team_sales: 30, min_direct_partners: 0, one_time_bonus: 1000, color: '#F97316', description: '30 Team-Verkäufe/Monat für 3 aufeinanderfolgende Monate' },
      { name: 'Sales Manager', slug: 'sales-manager', level: 6, commission_rate: 31, min_own_sales: 0, min_team_sales: 50, min_direct_partners: 0, one_time_bonus: 2000, color: '#EF4444', description: '50 Team-Verkäufe/Monat für 3 aufeinanderfolgende Monate' },
      { name: 'Direktor', slug: 'direktor', level: 7, commission_rate: 36, min_own_sales: 0, min_team_sales: 0, min_direct_partners: 0, one_time_bonus: 0, color: '#7C3AED', description: 'Administratorrang - nur für Geschäftsführung' },
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
      // =============================================
      // MAIN PRODUCT: CLYR Soda Osmoseanlage
      // AT: 3999 inkl 20% = 3332.50 netto
      // DE: 3965.70 inkl 19% = 3332.52 netto
      // =============================================
      {
        name: 'CLYR Soda - Komplett-Set Isabella Schwarz',
        name_en: 'CLYR Soda - Complete Set Isabella Black',
        slug: 'clyr-soda-isabella-schwarz',
        sku: 'CLYR-SODA-ISB',
        description: 'Die CLYR Soda Osmoseanlage - die kompakteste Untertisch-Anlage am Markt. Nahezu vollstaendig aus hochwertigem Edelstahl gefertigt, setzt sie neue Massstaebe in der Wasseraufbereitung.\n\nDas Komplett-Set beinhaltet die CLYR Osmoseanlage, die 5-Wege-Armatur Isabella in Schwarz, das Vorfilterset, CO2-Flasche mit Druckminderer, alle Anschluesse und Schlaeuche aus medizinischem Edelstahl sowie eine Installationsanleitung.\n\n9 Filterstufen sorgen fuer reinstes Wasser: SFS Eckventil, PPC Kohleblock, UF Membran, TC Nachkohlefilter, High-Tech RO-Molekularfiltrationsmembran 500 GPD mit Edelstahlkern, Vortex-Sprudelverwirbler, LED-UVC-Lampe, Bio-Tuner und der antibakterielle 5-Wege-Wasserhahn.\n\nTechnische Daten: Gewicht 16 kg, Wasserdruck 2-5 bar, Membranleistung 1x 500 GPD, Wasserausfluss 1,3 L/min, Stromversorgung 200-240V/50-60Hz, Masse B46 x H10 x T50 cm, Standby 2,5W / Produktion max. 220W. 2 Jahre Garantie bei jaehrlichem Filterwechsel.',
        short_description: 'Untertisch-Osmoseanlage mit 9 Filterstufen, integrierter Kuehlung und Sprudelwasser. Inkl. 5-Wege-Armatur Isabella Schwarz.',
        price: 3332.50,
        category_slug: 'wassersysteme',
        stock: 20,
        images: JSON.stringify(['/images/products/clyr-soda-set.png', '/images/products/isabella-schwarz.jpg', '/images/products/clyr-kitchen-drawer.jpg', '/images/products/clyr-kitchen-undersink.jpg', '/images/products/clyr-dimensions.jpg']),
        features: JSON.stringify(['9 Filterstufen', 'Integrierte Kuehlung', 'Sprudelwasser aus dem Wasserhahn', 'Kompakteste Anlage am Markt', 'Edelstahl-Konstruktion', 'Automatische Membranspuelung', 'LED-UVC Entkeimung', 'Bio-Tuner Technologie', 'Externer Aquastop', '2 Jahre Garantie']),
        is_featured: true,
        is_new: true,
        is_large_item: true,
        requires_installation: true,
        product_type: 'physical'
      },
      {
        name: 'CLYR Soda - Komplett-Set Isabella Edelstahl',
        name_en: 'CLYR Soda - Complete Set Isabella Stainless Steel',
        slug: 'clyr-soda-isabella-edelstahl',
        sku: 'CLYR-SODA-ISE',
        description: 'Die CLYR Soda Osmoseanlage mit der eleganten 5-Wege-Armatur Isabella in Edelstahl/Chrom. Identische Technik wie das Schwarz-Modell mit 9 Filterstufen, integrierter Kuehlung und Thermokarbonator fuer Sprudelwasser direkt aus dem Wasserhahn.\n\nDas Komplett-Set beinhaltet die CLYR Osmoseanlage, die 5-Wege-Armatur Isabella in Edelstahl/Chrom, das Vorfilterset, CO2-Flasche mit Druckminderer, alle Anschluesse und Schlaeuche aus medizinischem Edelstahl sowie eine Installationsanleitung.\n\nTechnische Daten: Gewicht 16 kg, Wasserdruck 2-5 bar, Membranleistung 1x 500 GPD, Wasserausfluss 1,3 L/min, Masse B46 x H10 x T50 cm. 2 Jahre Garantie.',
        short_description: 'Untertisch-Osmoseanlage mit 9 Filterstufen, integrierter Kuehlung und Sprudelwasser. Inkl. 5-Wege-Armatur Isabella Edelstahl.',
        price: 3332.50,
        category_slug: 'wassersysteme',
        stock: 15,
        images: JSON.stringify(['/images/products/clyr-soda-set.png', '/images/products/clyr-kitchen-undersink.jpg', '/images/products/clyr-filter-open.jpg', '/images/products/clyr-dimensions.jpg']),
        features: JSON.stringify(['9 Filterstufen', 'Integrierte Kuehlung', 'Sprudelwasser aus dem Wasserhahn', 'Kompakteste Anlage am Markt', 'Edelstahl-Konstruktion', 'Automatische Membranspuelung', 'LED-UVC Entkeimung', 'Bio-Tuner Technologie']),
        is_featured: true,
        is_new: true,
        is_large_item: true,
        requires_installation: true,
        product_type: 'physical'
      },
      {
        name: 'CLYR Soda - Komplett-Set Stratos',
        name_en: 'CLYR Soda - Complete Set Stratos',
        slug: 'clyr-soda-stratos',
        sku: 'CLYR-SODA-STR',
        description: 'Die CLYR Soda Osmoseanlage mit der Premium-Armatur Stratos - dem elektronischen 5-Wege-Spiral-Wasserhahn. Identische Technik wie die anderen Soda-Modelle mit 9 Filterstufen, integrierter Kuehlung und Thermokarbonator.\n\nDas Komplett-Set beinhaltet die CLYR Osmoseanlage, die Premium 5-Wege-Armatur Stratos (elektronisch), das Vorfilterset, CO2-Flasche mit Druckminderer, alle Anschluesse und Schlaeuche aus medizinischem Edelstahl sowie eine Installationsanleitung.\n\nTechnische Daten: Gewicht 16 kg, Masse B46 x H10 x T50 cm. 2 Jahre Garantie.',
        short_description: 'Premium Untertisch-Osmoseanlage mit elektronischer 5-Wege-Spiral-Armatur Stratos.',
        price: 4290.00,
        category_slug: 'wassersysteme',
        stock: 10,
        images: JSON.stringify(['/images/products/clyr-soda-set.png', '/images/products/clyr-compact.jpg', '/images/products/clyr-kitchen-drawer.jpg']),
        features: JSON.stringify(['Elektronische Spiral-Armatur', '9 Filterstufen', 'Integrierte Kuehlung', 'Sprudelwasser aus dem Wasserhahn', 'Premium-Design', 'Automatische Membranspuelung']),
        is_featured: true,
        is_new: true,
        is_large_item: true,
        requires_installation: true,
        product_type: 'physical'
      },
      // =============================================
      // CLYR Pure Soft - Wasserenthaertungsanlage
      // AT: 2989 inkl 20% = 2490.83 netto
      // DE: 2964.20 inkl 19% = 2490.92 netto
      // =============================================
      {
        name: 'CLYR Pure Soft - Wasserenthaertungsanlage',
        name_en: 'CLYR Pure Soft - Water Softener',
        slug: 'clyr-pure-soft',
        sku: 'CLYR-PURESOFT',
        description: 'Die CLYR Pure Soft Wasserenthaertungsanlage macht es moeglich, im gesamten Haus kalkfreies Wasser zu geniessen. Weniger Putzaufwand und laengere Lebensdauer Ihrer Geraete.\n\nDie kompakte Entkalkungsanlage ist ein innovatives High-End-Geraet mit Farbdisplay und intuitivem deutschsprachigem Menu. Sie reguliert den Kalzium- und Magnesiumgehalt des Wassers und beseitigt vollstaendig das Problem mit Kalkflecken in Wasserkochern, Kaffeemaschinen, Bad- und Kuechenarmaturen.\n\nDank des integrierten Filters ist die Installation kinderleicht - ganz ohne hohe Montagekosten.\n\nInklusive Panzerschlaeuche und Stromadapter.',
        short_description: 'Zentrale Wasserenthaertungsanlage mit Farbdisplay fuer das gesamte Haus. Kalkfreies Wasser an jeder Zapfstelle.',
        price: 2490.83,
        category_slug: 'wassersysteme',
        stock: 15,
        images: JSON.stringify(['/images/products/home-slim.jpg', '/images/products/home-slim-angle.jpg']),
        features: JSON.stringify(['Farbdisplay mit Touch-Steuerung', 'Integrierter Sedimentfilter', 'Hohe Durchflussrate bis 2,3 m3/h', 'Einfache Programmierung', '2-in-1 System mit Vorfilter', 'Automatische und manuelle Spuelung', 'Visualisiertes Fenster', 'Einfache Installation']),
        is_featured: true,
        is_new: false,
        is_large_item: true,
        requires_installation: true,
        product_type: 'physical'
      },
      // =============================================
      // CLYR Aroma Duschkopf
      // AT: 150 inkl 20% = 125.00 netto
      // DE: 148.75 inkl 19% = 125.00 netto
      // =============================================
      {
        name: 'CLYR Aroma Duschkopf',
        name_en: 'CLYR Aroma Shower Head',
        slug: 'clyr-aroma-duschkopf',
        sku: 'CLYR-AROMA-DK',
        description: 'Der CLYR Aroma Duschkopf mit Vitamin-C Filter und verschiedenen Dueften. Ideal bei trockener Haut, Frizz und coloriertem Haar.\n\nDie Mikroloch-Technologie sorgt fuer bis zu 50% Wasser- und Energieersparnis. Der integrierte Filter verbessert die Luftqualitaet durch negative Ionen und sorgt fuer sauberes, kalk- und bakterienarmes Duschwasser.\n\nLeicht zu reinigen, Filter einfach austauschbar und passt auf jeden Standardanschluss.',
        short_description: 'Aromatherapie-Duschkopf mit Vitamin-C Filter, Mikroloch-Technologie und bis zu 50% Wasserersparnis.',
        price: 125.00,
        category_slug: 'duschen',
        stock: 50,
        images: JSON.stringify(['/images/products/vitamin-c-filter.jpg']),
        features: JSON.stringify(['Vitamin-C Filter', 'Verschiedene Duefte', 'Mikroloch-Technologie', 'Bis zu 50% Wasserersparnis', 'Ideal bei trockener Haut und Frizz', 'Negative Ionen fuer bessere Luftqualitaet', 'Weniger Kalk und Bakterien', 'Passt auf jeden Standardanschluss']),
        is_featured: true,
        is_new: false,
        is_large_item: false,
        requires_installation: false,
        product_type: 'physical'
      },
      // =============================================
      // ZUBEHOER
      // =============================================
      {
        name: 'Vitamin-C Filterpatrone Zitrone',
        name_en: 'Vitamin-C Filter Cartridge Lemon',
        slug: 'vitamin-c-filter-zitrone',
        sku: 'CLYR-VCF-LEM',
        description: 'Ersatz-Filterpatrone mit Zitronenduft fuer den CLYR Aroma Duschkopf. Einfach auszutauschen und sorgt fuer ein erfrischendes Duscherlebnis mit Vitamin-C Anreicherung.',
        short_description: 'Ersatz-Vitamin-C-Filterpatrone mit erfrischendem Zitronenduft fuer den CLYR Aroma Duschkopf.',
        price: 12.50,
        category_slug: 'zubehoer',
        stock: 200,
        images: JSON.stringify(['/images/products/vitamin-c-filter.jpg']),
        features: JSON.stringify(['Vitamin-C angereichert', 'Zitronenduft', 'Einfacher Wechsel', 'Ca. 60 Duschen']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        product_type: 'physical'
      },
      {
        name: 'Sangokoralle Nachfuellfilter',
        name_en: 'Sango Coral Refill Filter',
        slug: 'sangokoralle-filter',
        sku: 'CLYR-SANGO',
        description: 'Sangokoralle-Nachfuellfilter fuer die CLYR Soda Osmoseanlage. Mineralisiert das gefilterte Wasser mit natuerlichen Mineralien aus der Sangokoralle und verbessert den Geschmack.',
        short_description: 'Sangokoralle-Mineralisierungsfilter fuer die CLYR Soda Anlage.',
        price: 49.90,
        category_slug: 'zubehoer',
        stock: 100,
        images: JSON.stringify(['/images/products/sangokoralle.jpg']),
        features: JSON.stringify(['Natuerliche Mineralisierung', 'Sangokoralle', 'Verbessert Geschmack', 'Fuer CLYR Soda']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        product_type: 'physical'
      },
      {
        name: 'Whirlator Wasserwirbler',
        name_en: 'Whirlator Water Vortex',
        slug: 'whirlator',
        sku: 'CLYR-WHIRL',
        description: 'Der Whirlator Wasserwirbler fuer Dusche oder Wasserhahn. Erzeugt einen Wirbel im Wasser, der die Wasserstruktur verbessert und fuer ein angenehmes Duscherlebnis sorgt. Einfache Installation zwischen Schlauch und Armatur.',
        short_description: 'Wasserwirbler fuer Dusche oder Wasserhahn - verbessert die Wasserstruktur.',
        price: 89.00,
        category_slug: 'zubehoer',
        stock: 80,
        images: JSON.stringify(['/images/products/whirlator.jpg']),
        features: JSON.stringify(['Wasserverwirbelung', 'Verbesserte Wasserstruktur', 'Einfache Installation', 'Fuer Dusche und Wasserhahn']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        product_type: 'physical'
      },
      {
        name: 'CLYR Vorfilterset',
        name_en: 'CLYR Pre-Filter Set',
        slug: 'clyr-vorfilterset',
        sku: 'CLYR-VFS',
        description: 'Ersatz-Vorfilterset fuer die CLYR Soda Osmoseanlage. Enthaelt PPC Kompakt-Baumwolle mit Kohleblock, UF Membran und TC Nachkohlefilter. Einfacher Filterwechsel alle 12 Monate durch den Kunden moeglich.',
        short_description: 'Jahres-Vorfilterset (PPC, UF, TC) fuer die CLYR Soda Osmoseanlage.',
        price: 149.00,
        category_slug: 'zubehoer',
        stock: 100,
        images: JSON.stringify(['/images/products/clyr-filter-open.jpg']),
        features: JSON.stringify(['PPC Kohleblock-Filter', 'UF Membran 0,01 Mikron', 'TC Nachkohlefilter', 'Jaehrlicher Wechsel', 'Einfacher Selbstwechsel']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        product_type: 'physical'
      },
      {
        name: 'CO2-Flasche befuellt',
        name_en: 'CO2 Cylinder Filled',
        slug: 'co2-flasche',
        sku: 'CLYR-CO2',
        description: 'Befuellte CO2-Flasche fuer die CLYR Soda Osmoseanlage. Lebensmittelgeeignetes CO2 fuer Sprudelwasser direkt aus dem Wasserhahn. Die Flasche kann nach Verbrauch getauscht oder neu befuellt werden.',
        short_description: 'Befuellte CO2-Flasche fuer die CLYR Soda Anlage.',
        price: 39.90,
        category_slug: 'zubehoer',
        stock: 100,
        images: JSON.stringify(['/images/products/clyr-soda-set.png']),
        features: JSON.stringify(['Lebensmittelgeeignetes CO2', 'Fuer CLYR Soda', 'Tausch-Service', 'Wiederverwendbar']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        product_type: 'physical'
      },
      // =============================================
      // DIENSTLEISTUNGEN
      // =============================================
      {
        name: 'Professionelle Installation',
        name_en: 'Professional Installation',
        slug: 'installation',
        sku: 'CLYR-INSTALL',
        description: 'Professionelle Installation Ihrer CLYR Anlage durch unsere zertifizierten Techniker. Der Service umfasst Terminvereinbarung, Anfahrt, Montage, Anschluss, Funktionstest und Einweisung. Verfuegbar in AT, DE und CH.',
        short_description: 'Professionelle Montage durch zertifizierte Techniker inkl. Einweisung.',
        price: 400.00,
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
      // =============================================
      // ABONNEMENTS
      // =============================================
      {
        name: 'Filter-Abo (jaehrlich)',
        name_en: 'Filter Subscription (yearly)',
        slug: 'filter-abo',
        sku: 'CLYR-FILTER-ABO',
        description: 'Das CLYR Filter-Abo - immer frische Filter, automatisch geliefert. Enthaelt ein komplettes Vorfilterset (PPC, UF, TC) fuer Ihre CLYR Soda Anlage. Automatische Lieferung alle 12 Monate mit kostenlosem Versand.',
        short_description: 'Jaehrliche automatische Filterlieferung mit Ersparnis gegenueber Einzelkauf.',
        price: 129.00,
        category_slug: 'abonnements',
        stock: 999,
        images: JSON.stringify(['/images/products/clyr-filter-open.jpg']),
        features: JSON.stringify(['Automatische Lieferung', 'Ersparnis gegenueber Einzelkauf', 'Kostenloser Versand', 'Jederzeit kuendbar']),
        is_featured: false,
        is_new: false,
        is_large_item: false,
        requires_installation: false,
        track_stock: false,
        product_type: 'subscription',
        subscription_interval_months: 12,
        is_subscription_eligible: true
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
