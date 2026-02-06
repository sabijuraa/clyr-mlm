const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  try {
    console.log('Seeding database...');

    // Ranks
    const ranks = [
      { name: 'Starter', nameDe: 'Starter', percent: 8, minPersonal: 0, minTeam: 0, months: 0, bonus: 0, sort: 1 },
      { name: 'Berater', nameDe: 'Berater', percent: 19, minPersonal: 1, minTeam: 0, months: 0, bonus: 0, sort: 2 },
      { name: 'Fachberater', nameDe: 'Fachberater', percent: 21, minPersonal: 11, minTeam: 0, months: 0, bonus: 0, sort: 3 },
      { name: 'Teamleiter', nameDe: 'Teamleiter', percent: 25, minPersonal: 5, minTeam: 15, months: 3, bonus: 500, sort: 4 },
      { name: 'Manager', nameDe: 'Manager', percent: 28, minPersonal: 0, minTeam: 30, months: 3, bonus: 1000, sort: 5 },
      { name: 'Sales Manager', nameDe: 'Sales Manager', percent: 31, minPersonal: 0, minTeam: 50, months: 3, bonus: 2000, sort: 6 },
      { name: 'Admin', nameDe: 'Admin', percent: 36, minPersonal: 0, minTeam: 0, months: 0, bonus: 0, sort: 7 },
    ];
    for (const r of ranks) {
      await db.query(`INSERT INTO ranks (name, name_de, commission_percent, min_personal_sales, min_team_sales_monthly, consecutive_months, one_time_bonus, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (name) DO UPDATE SET commission_percent=EXCLUDED.commission_percent, min_personal_sales=EXCLUDED.min_personal_sales, min_team_sales_monthly=EXCLUDED.min_team_sales_monthly, consecutive_months=EXCLUDED.consecutive_months, one_time_bonus=EXCLUDED.one_time_bonus`, [r.name, r.nameDe, r.percent, r.minPersonal, r.minTeam, r.months, r.bonus, r.sort]);
    }
    console.log('✓ Ranks seeded');

    // Admin user (Theresa)
    const adminEmail = process.env.ADMIN_EMAIL || 'theresa@clyr.shop';
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    let adminUserId;
    if (!existing.rows.length) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe123!', 12);
      const adminResult = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1,$2,$3,$4,'admin') RETURNING id`,
        [adminEmail, hash, process.env.ADMIN_FIRST_NAME || 'Theresa', process.env.ADMIN_LAST_NAME || 'Admin']
      );
      adminUserId = adminResult.rows[0].id;
      await db.query(`INSERT INTO partners (user_id, referral_code, rank_id, tc_accepted, tc_accepted_at)
        VALUES ($1, 'CLYR0001', 7, true, NOW())`, [adminUserId]);
      console.log('✓ Admin user created');
    } else {
      adminUserId = existing.rows[0].id;
      console.log('✓ Admin user exists');
    }

    // Product categories
    const categories = [
      { name: 'Water Filtration', nameDe: 'Osmoseanlagen', slug: 'osmoseanlagen', sort: 1 },
      { name: 'Water Softening', nameDe: 'Enthärtungsanlagen', slug: 'enthaertungsanlagen', sort: 2 },
      { name: 'Shower Systems', nameDe: 'Duschsysteme', slug: 'duschsysteme', sort: 3 },
      { name: 'Accessories', nameDe: 'Zubehör', slug: 'zubehoer', sort: 4 },
    ];
    for (const c of categories) {
      await db.query(`INSERT INTO product_categories (name, name_de, slug, sort_order) VALUES ($1,$2,$3,$4) ON CONFLICT (slug) DO NOTHING`,
        [c.name, c.nameDe, c.slug, c.sort]);
    }
    console.log('✓ Categories seeded');

    // Products
    const catIds = {};
    const catResult = await db.query('SELECT id, slug FROM product_categories');
    catResult.rows.forEach(c => catIds[c.slug] = c.id);

    const products = [
      {
        name: 'CLYR Soda', slug: 'clyr-soda', sku: 'CLYR-SODA-001', categoryId: catIds['osmoseanlagen'],
        descShort: 'Die kompakteste Untertisch-Osmoseanlage am Markt mit 9 Filterstufen und integriertem Thermokarbonator.',
        descLong: 'Die kompakteste Untertisch-Osmoseanlage am Markt. Nahezu vollständig aus hochwertigem Edelstahl gefertigt. 9 Filterstufen, integrierte Kühlung, Thermokarbonator für Sprudelwasser direkt aus dem Wasserhahn. Made in Italy. Inklusive 5-Wege-Armatur, CO2 Flasche, Anschlussmaterial, Druckminderer, Vorfilter Set und Installationsanleitung.',
        features: JSON.stringify(['Kompakteste Anlage am Markt','9 Filterstufen','Integrierte Kühlung','Thermokarbonator','Keine Plastikeinbauteile','Automatische Spülfunktion','Geringer Wasser- & Stromverbrauch','Geräuschlos im Standby','Strukturiertes Wasser','Bio Tuner integriert','Sprudelwasser aus dem Wasserhahn','2 Jahre Garantie','Made in Italy']),
        specs: JSON.stringify({weight:'16,0 kg',pressure:'2,0 - 5,0 bar',membrane:'1x 500 GPD',flow:'1,3 L/min',power:'200-240 V / 50/60 Hz',dimensions:'B 46 x H 10 x T 50 cm',standby:'2,5 W',maxPower:'220W',warranty:'2 Jahre'}),
        priceAt: 3999.00, priceDe: 3965.70, priceCh: null, weight: 16.0, dims: 'B 46 x H 10 x T 50 cm',
        featured: true, warranty: '2 Jahre bei jährlichem Filterwechsel',
        setIncludes: JSON.stringify(['Untertisch-Anlage','Externer Aquastop','5-Wege-Armatur (schwarz oder chrom)','CO2 Flasche','Anschlussmaterial','Druckminderer','Vorfilter Set','Installationsanleitung'])
      },
      {
        name: 'CLYR Pure Soft', slug: 'clyr-pure-soft', sku: 'CLYR-PURESOFT-001', categoryId: catIds['enthaertungsanlagen'],
        descShort: 'Kompakte Wasserenthärtungsanlage für kalkfreies Wasser im gesamten Haus.',
        descLong: 'Kompakte Wasserenthärtungsanlage für kalkfreies Wasser im gesamten Haus. Innovatives High-End-Gerät mit Farbdisplay und intuitivem, deutschsprachigen Menü. Reguliert den Kalzium- und Magnesiumgehalt des Wassers. Integrierter Vorfilter macht Installation kinderleicht.',
        features: JSON.stringify(['Farbdisplay','Integrierter Sedimentfilter','Hohe Durchflussrate','Einfache Programmierung','2-in-1 System','Automatische Spülung','Touch Steuerung','Bis zu 2,3 m³/h Durchfluss']),
        specs: JSON.stringify({flow:'2,3 m³/h',display:'Farb-Touch-Display',language:'Deutsch'}),
        priceAt: 2989.00, priceDe: 2964.20, priceCh: null, weight: null, dims: null,
        featured: true, warranty: null, setIncludes: JSON.stringify(['Wasserenthärtungsanlage','Panzerschläuche','Stromadapter'])
      },
      {
        name: 'CLYR Aroma Duschkopf', slug: 'clyr-aroma-duschkopf', sku: 'CLYR-DUSCH-001', categoryId: catIds['duschsysteme'],
        descShort: 'Innovativer Duschkopf mit Vitamin-C Filter und verschiedenen Düften.',
        descLong: 'Innovativer Duschkopf mit Vitamin-C Filter und verschiedenen Düften. Mikroloch-Technologie für bis zu 50% Wasser- und Energieersparnis. Ideal bei trockener Haut, Frizz und coloriertem Haar. Passt auf jeden Standardanschluss.',
        features: JSON.stringify(['Vitamin-C Filter','Verschiedene Düfte','Mikroloch-Technologie','Bis zu 50% Wasserersparnis','Ideal bei trockener Haut','Leicht zu reinigen','Standardanschluss','Weniger Kalk & Bakterien']),
        specs: JSON.stringify({connection:'Standard','waterSaving':'bis zu 50%'}),
        priceAt: 150.00, priceDe: 148.75, priceCh: null, weight: null, dims: null,
        featured: false, warranty: null, setIncludes: null
      },
      {
        name: 'Aroma Sense Einsatz', slug: 'aroma-sense-einsatz', sku: 'CLYR-AROMA-001', categoryId: catIds['zubehoer'],
        descShort: 'Austauschbarer Dufteinsatz für den CLYR Aroma Duschkopf.',
        descLong: 'Austauschbarer Dufteinsatz für den CLYR Aroma Duschkopf. Erhältlich in drei erfrischenden Düften: Eukalyptus, Zitrone und Kräuter.',
        features: JSON.stringify(['3 Duftvarianten','Einfach austauschbar','Vitamin-C angereichert']),
        specs: null, priceAt: null, priceDe: null, priceCh: null, weight: null, dims: null,
        featured: false, warranty: null, setIncludes: null, hasVariants: true
      },
      {
        name: 'Filterset', slug: 'filterset', sku: 'CLYR-FILTER-001', categoryId: catIds['zubehoer'],
        descShort: 'Externe Vorfiltereinheit PURE START für die CLYR Soda Osmoseanlage.',
        descLong: 'Externe Vorfiltereinheit PURE START für die CLYR Soda Osmoseanlage. Einfacher Filterwechsel. Enthält PPC-Filter, UF-Membran und TC/T33 Nachkohlefilter.',
        features: JSON.stringify(['PPC Filter','UF Membran','TC/T33 Nachkohlefilter','Einfacher Wechsel']),
        specs: JSON.stringify({dimensions:'28,5 x 26,4 x 9,9 cm'}),
        priceAt: null, priceDe: null, priceCh: null, weight: null, dims: '28,5 x 26,4 x 9,9 cm',
        featured: false, warranty: null, setIncludes: null
      },
      {
        name: 'Sangokoralle', slug: 'sangokoralle', sku: 'CLYR-SANGO-001', categoryId: catIds['zubehoer'],
        descShort: 'Mineralisierungseinsatz für die CLYR Soda Osmoseanlage.',
        descLong: 'Sangokoralle Mineralisierungseinsatz für die CLYR Soda Osmoseanlage. Reichert das gefilterte Wasser mit wertvollen Mineralien an.',
        features: JSON.stringify(['Remineralisierung','Wertvolle Mineralien','Einfache Installation']),
        specs: null, priceAt: null, priceDe: null, priceCh: null, weight: null, dims: null,
        featured: false, warranty: null, setIncludes: null
      },
      {
        name: 'BioTuner', slug: 'biotuner', sku: 'CLYR-BIOTUNER-001', categoryId: catIds['zubehoer'],
        descShort: 'Vortex Wasserverwirbler nach Viktor Schauberger Prinzipien.',
        descLong: 'Der Vortex BioTuner verwandelt Leitungswasser durch ein einzigartiges Wirbelkammersystem in energiereiches Quellwasser. Ohne den Einsatz von Chemikalien renaturiert und revitalisiert er das Wasser.',
        features: JSON.stringify(['Wirbelkammersystem','Keine Chemikalien','Revitalisierung','Viktor Schauberger Prinzip']),
        specs: null, priceAt: null, priceDe: null, priceCh: null, weight: null, dims: null,
        featured: false, warranty: null, setIncludes: null
      }
    ];

    for (const p of products) {
      await db.query(`INSERT INTO products (name, slug, sku, category_id, description_short, description_long, features, specifications, price_at, price_de, price_ch, weight_kg, dimensions, has_variants, is_featured, warranty_info, set_includes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (sku) DO NOTHING`,
        [p.name, p.slug, p.sku, p.categoryId, p.descShort, p.descLong, p.features, p.specs, p.priceAt, p.priceDe, p.priceCh, p.weight, p.dims, p.hasVariants || false, p.featured, p.warranty, p.setIncludes]);
    }
    console.log('✓ Products seeded');

    // Aroma Sense variants
    const aromaProduct = await db.query("SELECT id FROM products WHERE sku = 'CLYR-AROMA-001'");
    if (aromaProduct.rows[0]) {
      const variants = [
        { name: 'Eukalyptus', sku: 'CLYR-AROMA-EUK' },
        { name: 'Zitrone', sku: 'CLYR-AROMA-ZIT' },
        { name: 'Kräuter', sku: 'CLYR-AROMA-KRA' },
      ];
      for (const v of variants) {
        await db.query(`INSERT INTO product_variants (product_id, name, sku) VALUES ($1,$2,$3) ON CONFLICT (sku) DO NOTHING`,
          [aromaProduct.rows[0].id, v.name, v.sku]);
      }
      console.log('✓ Aroma variants seeded');
    }

    // Brand config
    const brandConfig = [
      ['company_name', 'CLYR Solutions GmbH', 'text'],
      ['company_address', 'Pappelweg 4b, 9524 St. Magdalen', 'text'],
      ['distribution_address', 'Holz 33, 5211 Lengau', 'text'],
      ['email', 'service@clyr.shop', 'text'],
      ['website', 'www.clyr.shop', 'text'],
      ['phone', '', 'text'],
      ['tagline', 'Mehr als Wasser', 'text'],
      ['primary_color', '#2D3436', 'color'],
      ['accent_color', '#5DADE2', 'color'],
      ['logo_url', '/uploads/logo-clyr.png', 'image'],
      ['vat_at', '20', 'text'],
      ['vat_de', '19', 'text'],
      ['vat_ch', '8.1', 'text'],
      ['shipping_free_at', '69', 'text'],
      ['shipping_free_de', '50', 'text'],
      ['shipping_free_ch', '180', 'text'],
      ['return_days', '14', 'text'],
      ['currency', 'EUR', 'text'],
    ];
    for (const [key, value, type] of brandConfig) {
      await db.query(`INSERT INTO brand_config (key, value, type) VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET value=$2`, [key, value, type]);
    }
    console.log('✓ Brand config seeded');

    // CMS - Homepage sections
    const homeSections = [
      { key: 'hero', title: 'Mehr als Wasser', subtitle: 'Erleben Sie reinstes, vitalisiertes Wasser direkt aus Ihrem Wasserhahn. CLYR Soda - die kompakteste Osmoseanlage am Markt.', content: '', buttonText: 'Jetzt entdecken', buttonUrl: '/shop', sort: 1 },
      { key: 'features', title: 'Warum CLYR?', subtitle: '9 Filterstufen, integrierte Kühlung und Sprudelwasser - alles in einem kompakten Gerät.', content: '', sort: 2 },
      { key: 'products', title: 'Unsere Produkte', subtitle: 'Hochwertige Wasseraufbereitungssysteme für Ihr Zuhause', content: '', sort: 3 },
      { key: 'about', title: 'Über CLYR', subtitle: '', content: 'CLYR Solutions GmbH steht für innovative Wasseraufbereitungstechnologie. Unsere Produkte werden in Italien gefertigt und vereinen höchste Qualität mit elegantem Design.', sort: 4 },
      { key: 'partner', title: 'Werde CLYR Partner', subtitle: 'Starte dein eigenes Business mit unserem attraktiven Partnerprogramm', content: '', buttonText: 'Partner werden', buttonUrl: '/partner/register', sort: 5 },
      { key: 'newsletter', title: 'Newsletter', subtitle: 'Bleiben Sie informiert über Neuigkeiten und Angebote', content: '', sort: 6 },
    ];
    for (const s of homeSections) {
      await db.query(`INSERT INTO cms_sections (page_slug, section_key, title, subtitle, content, button_text, button_url, sort_order)
        VALUES ('homepage', $1, $2, $3, $4, $5, $6, $7) ON CONFLICT (page_slug, section_key) DO UPDATE SET title=$2, subtitle=$3`,
        [s.key, s.title, s.subtitle, s.content, s.buttonText || null, s.buttonUrl || null, s.sort]);
    }
    console.log('✓ CMS sections seeded');

    // CMS Legal pages
    const legalPages = [
      { slug: 'impressum', title: 'Impressum', content: '<h2>Impressum</h2><p><strong>CLYR Solutions GmbH</strong><br>Pappelweg 4b<br>9524 St. Magdalen<br>Österreich</p><p>E-Mail: service@clyr.shop<br>Web: www.clyr.shop</p>' },
      { slug: 'datenschutz', title: 'Datenschutzerklärung', content: '<h2>Datenschutzerklärung</h2><p>Verantwortlicher: CLYR Solutions GmbH, Pappelweg 4b, 9524 St. Magdalen</p>' },
      { slug: 'agb', title: 'Allgemeine Geschäftsbedingungen', content: '<h2>AGB</h2><p>Stand: Februar 2026</p>' },
      { slug: 'widerruf', title: 'Widerrufsbelehrung', content: '<h2>Widerrufsbelehrung</h2><p>Sie haben das Recht, binnen 14 Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.</p>' },
    ];
    for (const p of legalPages) {
      await db.query(`INSERT INTO cms_pages (slug, title, content) VALUES ($1,$2,$3) ON CONFLICT (slug) DO NOTHING`, [p.slug, p.title, p.content]);
    }
    console.log('✓ Legal pages seeded');

    // FAQ
    const faqs = [
      { q: 'Was ist die CLYR Soda Osmoseanlage?', a: 'Die CLYR Soda ist die kompakteste Untertisch-Osmoseanlage am Markt. Sie filtert Ihr Leitungswasser durch 9 Stufen und kann sogar Sprudelwasser direkt aus dem Wasserhahn liefern.', cat: 'Produkte' },
      { q: 'Wie oft müssen die Filter gewechselt werden?', a: 'Die Filter sollten alle 12 Monate gewechselt werden. Die Membrane hat eine Lebensdauer von 4 Jahren.', cat: 'Wartung' },
      { q: 'Wie werde ich CLYR Partner?', a: 'Registrieren Sie sich über unsere Partner-Registrierungsseite. Sie erhalten sofort Ihren persönlichen Empfehlungscode und können mit dem Verkauf beginnen.', cat: 'Partner' },
      { q: 'Wie funktioniert das Provisionsmodell?', a: 'Als Partner erhalten Sie eine Provision auf jeden Verkauf. Je höher Ihr Rang, desto höher Ihre Provision (8% bis 36%). Zusätzlich verdienen Sie an Teamverkäufen durch Differenzprovisionen.', cat: 'Partner' },
      { q: 'Wie lange ist die Widerrufsfrist?', a: 'Sie können Ihre Bestellung innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen.', cat: 'Bestellung' },
    ];
    for (let i = 0; i < faqs.length; i++) {
      await db.query(`INSERT INTO cms_faq (question, answer, category, sort_order) VALUES ($1,$2,$3,$4)`,
        [faqs[i].q, faqs[i].a, faqs[i].cat, i + 1]);
    }
    console.log('✓ FAQ seeded');

    console.log('\n✅ All seeds completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}
seed();
