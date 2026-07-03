// server/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import existing routes
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import customerRoutes from './routes/customer.routes.js';
import partnerRoutes from './routes/partner.routes.js';
import adminRoutes from './routes/admin.routes.js';
import commissionRoutes from './routes/commission.routes.js';
import payoutRoutes from './routes/payout.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import cmsRoutes from './routes/cms.routes.js';
import academyRoutes from './routes/academy.routes.js';
import gdprRoutes from './routes/gdpr.routes.js';
import importRoutes from './routes/import.routes.js';
import newsletterRoutes from './routes/newsletter.routes.js';
import stockRoutes from './routes/stock.routes.js';
import voucherRoutes from './routes/voucher.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import variantRoutes from './routes/variant.routes.js';
import creditnoteRoutes from './routes/creditnote.routes.js';
import vatreportRoutes from './routes/vatreport.routes.js';
import stripeConnectRoutes from './routes/stripe-connect.routes.js';

// Import NEW routes (for Theresa's WordPress-like features)
import brandingRoutes from './routes/branding.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import referralRoutes from './routes/referral.routes.js';
import faqRoutes from './routes/faq.routes.js';
import legalRoutes from './routes/legal.routes.js';
import complianceRoutes from './routes/compliance.routes.js';

// Import error middleware
import { errorHandler } from './middleware/error.middleware.js';
import { getPublicAppUrl } from './utils/public-url.js';

// Import commission service for cron jobs
import { releaseHeldCommissions, checkRankDecay, resetQuarterlySales } from './services/commission.service.js';
import { flagInactivePartners, sendInactivityWarnings } from './controllers/compliance.controller.js';
import cron from 'node-cron';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directories exist
import fs from 'fs';
['uploads', 'uploads/cms', 'uploads/branding', 'uploads/products', 'uploads/academy', 'public/invoices', 'public/images', 'public/images/products', 'public/images/branding', 'public/downloads'].forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// Auto-copy logo from client to server for invoice PDFs
const logoSrc = path.join(__dirname, '../../client/public/images/clyr-logo.jpeg');
const logoDst = path.join(__dirname, '../public/images/clyr-logo.jpeg');
if (fs.existsSync(logoSrc) && !fs.existsSync(logoDst)) {
  try { fs.copyFileSync(logoSrc, logoDst); console.log('Logo copied for invoices'); } catch (e) {}
}
const logoSrc2 = path.join(__dirname, '../../client/public/images/clyr-logo.png');
const logoDst2 = path.join(__dirname, '../public/images/clyr-logo.png');
if (fs.existsSync(logoSrc2) && !fs.existsSync(logoDst2)) {
  try { fs.copyFileSync(logoSrc2, logoDst2); console.log('Logo PNG copied for invoices'); } catch (e) {}
}

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.CLIENT_URL,
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
    ].filter(Boolean);
    
    // Allow any DigitalOcean app domain or configured origins
    if (allowedOrigins.includes(origin) || 
        origin.endsWith('.ondigitalocean.app') ||
        origin.endsWith('.clyr.shop') ||
        origin.endsWith('.clyr.at') ||
        origin.endsWith('.clyr.de') ||
        origin === 'https://clyr.shop') {
      return callback(null, true);
    }
    
    // In production, also allow same-origin (no origin header means same origin)
    return callback(null, true);
  },
  credentials: true
}));

// ========================================
// SEO: Force canonical domain (https://clyr.shop, no www)
// ========================================
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  
  const host = req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  
  // Redirect www.clyr.shop -> clyr.shop
  // Redirect http -> https
  const needsRedirect = host.startsWith('www.') || (proto !== 'https' && host.includes('clyr.shop'));
  
  if (needsRedirect && host.includes('clyr.shop')) {
    const cleanHost = host.replace(/^www\./, '');
    return res.redirect(301, `https://${cleanHost}${req.originalUrl}`);
  }
  
  next();
});

// ========================================
// SEO: robots.txt
// ========================================
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\n\nSitemap: https://clyr.shop/sitemap.xml\n`
  );
});

// ========================================
// SEO: sitemap.xml (auto-generated from products + static pages)
// ========================================
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = 'https://clyr.shop';
    const today = new Date().toISOString().split('T')[0];
    
    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/products', priority: '0.9', changefreq: 'daily' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/partner', priority: '0.8', changefreq: 'weekly' },
      { url: '/login', priority: '0.5', changefreq: 'yearly' },
      { url: '/register', priority: '0.5', changefreq: 'yearly' },
      { url: '/legal/imprint', priority: '0.3', changefreq: 'yearly' },
      { url: '/legal/privacy', priority: '0.3', changefreq: 'yearly' },
      { url: '/legal/terms', priority: '0.3', changefreq: 'yearly' },
      { url: '/legal/withdrawal', priority: '0.3', changefreq: 'yearly' },
    ];
    
    // Try to load active products dynamically
    let productEntries = [];
    try {
      const pool = (await import('./config/database.js')).default;
      const productsResult = await pool.query(
        "SELECT slug, updated_at FROM products WHERE is_active = true ORDER BY updated_at DESC LIMIT 500"
      );
      productEntries = productsResult.rows.map(p => ({
        url: `/products/${p.slug}`,
        lastmod: p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : today,
        priority: '0.8',
        changefreq: 'weekly'
      }));
    } catch (e) {
      console.warn('sitemap: could not load products', e.message);
    }
    
    const allEntries = [...staticPages.map(p => ({ ...p, lastmod: today })), ...productEntries];
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.map(e => `  <url>
    <loc>${baseUrl}${e.url}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
    
    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).type('text/plain').send('Error generating sitemap');
  }
});

// Stripe webhook needs raw body for signature verification - MUST be before express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use('/images', express.static(path.join(__dirname, '../public/images')));
app.use('/downloads', express.static(path.join(__dirname, '../public/downloads')));
app.use('/invoices', express.static(path.join(__dirname, '../public/invoices')));

// Request logging
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' || req.path.startsWith('/api/admin') || req.path.startsWith('/api/branding')) {
    console.log(`${req.method} ${req.path} [origin: ${req.headers.origin || 'none'}]`);
  }
  next();
});

// ========================================
// HEALTH CHECK
// ========================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: 'fixed-2026-03-20'
  });
});

// Also respond at /api/health for DigitalOcean health checks
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: 'fixed-2026-03-20'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'CLYR MLM API',
    version: '3.0.0',
    status: 'running'
  });
});

// ========================================
// API ROUTES
// ========================================

// Authentication & User Management
app.use('/api/auth', authRoutes);

// E-commerce
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/vouchers', voucherRoutes);

// Customer Portal
app.use('/api/customers', customerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Partner/MLM
app.use('/api/partners', partnerRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/stripe-connect', stripeConnectRoutes);
app.use('/api/referral', referralRoutes);

// Admin
app.use('/api/admin', adminRoutes);

// CMS & Content
app.use('/api/cms', cmsRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/downloads', express.static(path.join(__dirname, '../public/downloads')));
app.use('/api/newsletter', newsletterRoutes);

// Financial
app.use('/api/creditnotes', creditnoteRoutes);
app.use('/api/credit-notes', creditnoteRoutes);  // alias for frontend
app.use('/api/vatreports', vatreportRoutes);
app.use('/api/vat-reports', vatreportRoutes);    // alias for frontend

// Integrations
app.use('/api/webhooks', webhookRoutes);
app.use('/api/import', importRoutes);

// Legal & Compliance
app.use('/api/gdpr', gdprRoutes);

// NEW ROUTES - WordPress-like Admin Features
app.use('/api', brandingRoutes);        // Branding management (logo, colors)
app.use('/api/legal', legalRoutes);     // Legal pages CMS (#41, #39) - BEFORE settings to avoid conflicts
app.use('/api', settingsRoutes);        // Company settings, invoices (legal removed from here)
app.use('/api/faq', faqRoutes);         // FAQ management (#38)
app.use('/api/compliance', complianceRoutes); // Legal compliance (#50, #55, #57)

// ========================================
// SPA FALLBACK - Serve React app for non-API routes
// ========================================

// Try multiple possible locations for the built client
const possibleClientPaths = [
  path.join(__dirname, '../../client/dist'),
  path.join(__dirname, '../../../client/dist'),
  path.join(__dirname, '../../dist'),
  path.join(__dirname, '../dist'),
  '/app/client/dist',
  '/app/dist',
];
const clientDistPath = possibleClientPaths.find(p => fs.existsSync(p));

if (clientDistPath) {
  console.log('Serving static files from:', clientDistPath);
  app.use(express.static(clientDistPath));
}

// Handle old newsletter confirm URL format (frontend route -> redirect to API)
app.get('/newsletter/confirm', (req, res) => {
  const token = req.query.token;
  if (token) {
    return res.redirect(`/api/newsletter/confirm/${token}`);
  }
  res.redirect('/');
});

// For ANY non-API route, serve index.html (SPA client-side routing)
app.get('*', (req, res, next) => {
  // Skip API routes and static file routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || 
      req.path.startsWith('/downloads/') || req.path.startsWith('/images/') ||
      req.path.startsWith('/invoices/') || req.path.startsWith('/public/')) {
    return next();
  }
  
  // If we have the client dist, serve index.html
  if (clientDistPath) {
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  
  // If client dist not available (separate containers), redirect to frontend URL
  const frontendUrl = getPublicAppUrl();
  if (frontendUrl && req.path !== '/') {
    return res.redirect(frontendUrl + req.originalUrl);
  }
  
  // Last resort: serve a minimal SPA shell that handles client-side routing
  res.status(200).send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CLYR</title>
<script>
  // SPA fallback: redirect to the frontend app
  var frontendUrl = "${frontendUrl || ''}";
  if (frontendUrl && window.location.origin !== frontendUrl) {
    window.location.replace(frontendUrl + window.location.pathname + window.location.search);
  }
</script>
</head><body><p>Redirecting...</p></body></html>`);
});

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler - only for API routes
app.use((req, res) => {
  // Only return JSON 404 for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'Route not found',
      path: req.path,
      method: req.method
    });
  }
  // For non-API routes that somehow got here, redirect to frontend
  const frontendUrl = getPublicAppUrl();
  if (frontendUrl) {
    return res.redirect(frontendUrl + req.originalUrl);
  }
  res.status(404).send('Not found');
});

// Global error handler
app.use(errorHandler);

// ========================================
// CRON JOBS
// ========================================

// Clean up unpaid pending orders every 30 minutes (only orders older than 2 hours)
// NOTE: Stripe Checkout sessions (especially Klarna/EPS bank redirects) can take 30-60+ minutes.
// Deleting too early causes paid orders to disappear. 2 hours is safe for all payment methods.
cron.schedule('*/30 * * * *', async () => {
  try {
    const { query: dbQ } = await import('./config/database.js');
    await dbQ("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE payment_status = 'pending' AND created_at < NOW() - INTERVAL '2 hours')");
    await dbQ("DELETE FROM commissions WHERE order_id IN (SELECT id FROM orders WHERE payment_status = 'pending' AND created_at < NOW() - INTERVAL '2 hours')");
    const r = await dbQ("DELETE FROM orders WHERE payment_status = 'pending' AND created_at < NOW() - INTERVAL '2 hours' RETURNING id");
    if (r.rowCount > 0) console.log(`Cron: Deleted ${r.rowCount} abandoned unpaid orders (>2h old)`);
  } catch(e) {}
});

// ─────────────────────────────────────────────────────────────
// COMMISSION RELEASE: daily at midnight
// Releases any commission where 14-day hold period has passed
// ─────────────────────────────────────────────────────────────
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('⏰ Cron: Releasing held commissions (14-day hold check)...');
    const released = await releaseHeldCommissions();
    console.log(`✅ Released ${released.length} commissions`);
  } catch (err) {
    console.error('❌ Cron release failed:', err.message);
  }
});

// Check rank decay on 1st of each month at 2:00 AM
cron.schedule('0 2 1 * *', async () => {
  try {
    console.log('⏰ Cron: Checking rank decay (12-month inactivity)...');
    const decayed = await checkRankDecay();
    console.log(`✅ Rank decay: ${decayed.length} partners reset to Berater`);
  } catch (err) {
    console.error('❌ Cron rank decay failed:', err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// AUTOMATIC PAYOUTS: 1st of every month at 3:00 AM
// Partners WITH Stripe → paid automatically via transfer
// Partners WITHOUT Stripe → recorded as pending (admin sees in dashboard)
// If any partner fails → commissions stay 'released' → retried next month
// ─────────────────────────────────────────────────────────────
cron.schedule('0 3 1 * *', async () => {
  // IDEMPOTENCY LOCK: prevent double-run if server restarts during payout window
  const now = new Date();
  const cycleKey = `payout_cycle_${now.getFullYear()}_${now.getMonth() + 1}`;
  try {
    const { query: dbQ } = await import('./config/database.js');
    const lockCheck = await dbQ(
      `SELECT id FROM activity_log WHERE action = 'payout_cycle_started' AND details->>'cycleKey' = $1 LIMIT 1`,
      [cycleKey]
    );
    if (lockCheck.rows.length > 0) {
      console.log(`[PAYOUT CRON] ⚠️  Skipped — cycle ${cycleKey} already ran this month`);
      return;
    }
    // Record cycle start as idempotency lock
    await dbQ(
      `INSERT INTO activity_log (action, entity_type, entity_id, details) VALUES ('payout_cycle_started', 'system', $1, $2)`,
      [cycleKey, JSON.stringify({ cycleKey, startedAt: now.toISOString() })]
    );
  } catch (lockErr) {
    console.error('[PAYOUT CRON] Lock check failed, proceeding with caution:', lockErr.message);
  }

  console.log('========================================');
  console.log('⏰ AUTOMATIC PAYOUT CYCLE - 1st of month');
  console.log(`   Time: ${now.toISOString()}`);
  console.log(`   CycleKey: ${cycleKey}`);
  console.log('========================================');
  try {
    // Step 1: Release any held commissions that are overdue (safety net)
    console.log('[PAYOUT CRON] Step 1: Releasing any overdue held commissions...');
    const released = await releaseHeldCommissions();
    console.log(`[PAYOUT CRON] Released ${released.length} additional commissions`);

    // Step 2: Run payout
    console.log('[PAYOUT CRON] Step 2: Running payout engine...');
    const { runStripePayouts } = await import('./controllers/stripe-connect.controller.js');
    const result = await runStripePayouts();
    console.log('========================================');
    console.log(`✅ PAYOUT DONE: ${result.processed} Stripe, ${result.pending} pending, ${result.skipped} not ready, ${result.failed} errors`);
    console.log(`   Total gross paid: €${result.totalGross?.toFixed(2)}`);
    console.log('========================================');
  } catch (err) {
    console.error('❌ CRITICAL - Payout cycle threw:', err.message);
    console.error(err.stack);
  }
});

// ─────────────────────────────────────────────────────────────
// AUTOMATIC PAYOUTS: 15th of every month at 3:00 AM
// Second, intentional payout cycle per month (confirmed with Theresa,
// Jul 2026 — she runs payouts twice monthly: 1st and 15th).
// Same lock-based idempotency pattern as the 1st-of-month cron, and now
// backed by the per-day payout reference + DB unique index in
// stripe-connect.controller.js, so this can't collide with the 1st's run.
// ─────────────────────────────────────────────────────────────
cron.schedule('0 3 15 * *', async () => {
  const now = new Date();
  const cycleKey = `payout_cycle_${now.getFullYear()}_${now.getMonth() + 1}_15th`;
  try {
    const { query: dbQ } = await import('./config/database.js');
    const lockCheck = await dbQ(
      `SELECT id FROM activity_log WHERE action = 'payout_cycle_started' AND details->>'cycleKey' = $1 LIMIT 1`,
      [cycleKey]
    );
    if (lockCheck.rows.length > 0) {
      console.log(`[PAYOUT CRON 15th] ⚠️  Skipped — cycle ${cycleKey} already ran`);
      return;
    }
    await dbQ(
      `INSERT INTO activity_log (action, entity_type, entity_id, details) VALUES ('payout_cycle_started', 'system', $1, $2)`,
      [cycleKey, JSON.stringify({ cycleKey, startedAt: now.toISOString() })]
    );
  } catch (lockErr) {
    console.error('[PAYOUT CRON 15th] Lock check failed, proceeding:', lockErr.message);
  }

  console.log('========================================');
  console.log('⏰ AUTOMATIC PAYOUT CYCLE - 15th of month');
  console.log(`   Time: ${now.toISOString()}`);
  console.log('========================================');
  try {
    const { releaseHeldCommissions } = await import('./services/commission.service.js');
    const released = await releaseHeldCommissions();
    console.log(`[PAYOUT CRON 15th] Released ${released.length} commissions`);
    const { runStripePayouts } = await import('./controllers/stripe-connect.controller.js');
    const result = await runStripePayouts();
    console.log(`✅ 15th PAYOUT DONE: ${result.processed} Stripe, ${result.pending} pending, ${result.failed} errors`);
  } catch (err) {
    console.error('❌ 15th Payout cycle threw:', err.message);
  }
});

// Reset quarterly sales counts on 1st of Jan, Apr, Jul, Oct at 1:00 AM
cron.schedule('0 1 1 1,4,7,10 *', async () => {  try {
    console.log('⏰ Cron: Resetting quarterly sales counts...');
    const result = await resetQuarterlySales();
    console.log(`✅ Reset quarterly sales for ${result.length} partners`);
  } catch (err) {
    console.error('❌ Cron quarterly reset failed:', err.message);
  }
});

// Check expired subscriptions daily at 3:00 AM (#37)
cron.schedule('0 3 * * *', async () => {
  try {
    const { checkExpiredSubscriptions } = await import('./controllers/partner-subscription.controller.js');
    console.log('⏰ Cron: Checking expired subscriptions...');
    const expired = await checkExpiredSubscriptions();
    console.log(`✅ ${expired.length} partner subscriptions expired`);
  } catch (err) {
    console.error('❌ Cron subscription check failed:', err.message);
  }
});

// #57: Check inactivity - daily at 4:00 AM (warn at 10 months, terminate at 12)
cron.schedule('0 4 * * *', async () => {
  try {
    console.log('⏰ Cron: Checking partner inactivity...');
    const warnings = await sendInactivityWarnings();
    const terminated = await flagInactivePartners();
    console.log(`✅ Inactivity: ${warnings.length} warnings sent, ${terminated.length} partners terminated`);
  } catch (err) {
    console.error('❌ Cron inactivity check failed:', err.message);
  }
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, '0.0.0.0', async () => {
  console.log('='.repeat(50));
  console.log('CLYR MLM Server Started');
  console.log('='.repeat(50));
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log('='.repeat(50));

  // Auto-ensure critical tables exist
  try {
    const { query: dbQuery } = await import('./config/database.js');
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS legal_pages (
        id SERIAL PRIMARY KEY,
        page_key VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        title_en VARCHAR(255),
        content_en TEXT,
        last_updated_by INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value JSONB,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Ensure legal pages have at least placeholder content
    // Load legal content from separate file
    const { legalContent } = await import('./database/legal-content.js');
    const legalDefaults = Object.entries(legalContent).map(([key, val]) => [key, val.title, val.content]);
    for (const [key, title, defaultContent] of legalDefaults) {
      await dbQuery(
        `INSERT INTO legal_pages (page_key, title, content) VALUES ($1, $2, $3) 
         ON CONFLICT (page_key) DO UPDATE SET 
           title = $2, 
           content = CASE 
             WHEN legal_pages.content LIKE '%admin@clyr.shop%' THEN $3
             WHEN legal_pages.content LIKE '%in Bearbeitung%' THEN $3
             WHEN legal_pages.content LIKE '%under processing%' THEN $3
             WHEN legal_pages.content NOT LIKE '%<h2>%' THEN $3 
             ELSE legal_pages.content 
           END`,
        [key, title, defaultContent]
      );
    }
    console.log('Critical tables verified.');

    // ── Update rank rates to match official compensation plan ──
    await dbQuery(`UPDATE ranks SET commission_rate = 31 WHERE slug = 'direktor'`);
    await dbQuery(`UPDATE ranks SET commission_rate = 31 WHERE slug = 'sales-manager'`);
    await dbQuery(`UPDATE ranks SET commission_rate = 28 WHERE slug = 'manager'`);
    await dbQuery(`UPDATE ranks SET commission_rate = 25 WHERE slug = 'teamleiter'`);
    await dbQuery(`UPDATE ranks SET commission_rate = 21 WHERE slug = 'fachberater'`);
    await dbQuery(`UPDATE ranks SET commission_rate = 19 WHERE slug = 'berater'`);
    await dbQuery(`UPDATE ranks SET commission_rate = 8 WHERE slug = 'starter'`);
    // Update Theresa's rank to Direktor with correct 36% rate
    await dbQuery(`
      UPDATE users SET rank_id = (SELECT id FROM ranks WHERE slug = 'direktor')
      WHERE email = 'theresa@clyr.at'
    `);
    // Disable admin commission — no longer part of compensation plan
    await dbQuery(`
      UPDATE settings SET value = '{"rate": 0, "enabled": false}'::jsonb
      WHERE key = 'admin_commission_rate'
    `);
    console.log('Rank rates and compensation plan updated.');

    // Ensure branding table exists (needed for Admin → Branding settings)
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS branding (
        id INTEGER PRIMARY KEY DEFAULT 1,
        logo_light_url VARCHAR(500),
        logo_dark_url VARCHAR(500),
        favicon_url VARCHAR(500),
        primary_color VARCHAR(20) DEFAULT '#0ea5e9',
        secondary_color VARCHAR(20) DEFAULT '#171717',
        accent_color VARCHAR(20) DEFAULT '#f59e0b',
        font_heading VARCHAR(100) DEFAULT 'Inter',
        font_body VARCHAR(100) DEFAULT 'Inter',
        facebook_url VARCHAR(500),
        instagram_url VARCHAR(500),
        linkedin_url VARCHAR(500),
        twitter_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbQuery(`INSERT INTO branding (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);

    // Ensure company_settings table exists
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        company_name VARCHAR(255) DEFAULT 'CLYR Solutions GmbH',
        company_legal_name VARCHAR(255),
        tax_id VARCHAR(100),
        registration_number VARCHAR(100),
        address_line1 VARCHAR(255),
        city VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(10) DEFAULT 'AT',
        phone VARCHAR(50),
        email VARCHAR(255) DEFAULT 'service@clyr.shop',
        support_email VARCHAR(255),
        bank_name VARCHAR(255),
        iban VARCHAR(50),
        bic VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbQuery(`INSERT INTO company_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
    console.log('Branding and company_settings tables verified.');

    // Newsletter tables
    await dbQuery(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL, first_name VARCHAR(100), last_name VARCHAR(100),
      status VARCHAR(50) DEFAULT 'pending', source VARCHAR(100) DEFAULT 'website',
      language VARCHAR(10) DEFAULT 'de', preferences JSONB DEFAULT '{}',
      confirmation_token VARCHAR(255), confirmed_at TIMESTAMP, unsubscribed_at TIMESTAMP,
      ip_address VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await dbQuery(`CREATE TABLE IF NOT EXISTS email_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL, subject VARCHAR(255) NOT NULL, subject_en VARCHAR(255),
      content_html TEXT DEFAULT '', content_html_en TEXT, content_text TEXT,
      target_audience VARCHAR(50) DEFAULT 'newsletter', target_filter JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'draft', total_recipients INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0, open_count INTEGER DEFAULT 0,
      scheduled_at TIMESTAMP, sent_at TIMESTAMP, created_by UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('Newsletter tables verified.');

    // VAT reports table
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS vat_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        country VARCHAR(10) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER,
        quarter INTEGER,
        net_sales DECIMAL(10,2) DEFAULT 0,
        vat_collected DECIMAL(10,2) DEFAULT 0,
        reverse_charge_sales DECIMAL(10,2) DEFAULT 0,
        export_sales DECIMAL(10,2) DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'draft',
        report_data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('VAT reports table verified.');

    // Fix wallet balances — recalculate from released commissions only
    await dbQuery(`
      UPDATE users u SET wallet_balance = COALESCE((
        SELECT SUM(amount) FROM commissions
        WHERE user_id = u.id AND status = 'released'
      ), 0) WHERE u.role IN ('partner','admin')
    `);
    console.log('Wallet balances recalculated.');

    // Ensure Filter category exists — insert if slug not present
    // Uses name match as fallback in case slug differs
    const filterExists = await dbQuery(
      `SELECT id FROM categories WHERE slug = 'filter' OR LOWER(name) = 'filter' LIMIT 1`
    );
    if (filterExists.rowCount === 0) {
      await dbQuery(
        `INSERT INTO categories (name, slug, sort_order, is_active)
         VALUES ('Filter', 'filter', 0, true)`
      );
      console.log('✅ Filter category created in DB');
    } else {
      console.log('✅ Filter category already exists');
    }

    // Add all potentially missing columns
    const alterations = [
      // commissions table
      `ALTER TABLE commissions ADD COLUMN IF NOT EXISTS source_user_id UUID`,
      `ALTER TABLE commissions ADD COLUMN IF NOT EXISTS payout_id UUID`,
      `ALTER TABLE commissions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`,
      `ALTER TABLE commissions ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10,2)`,
      `ALTER TABLE commissions ADD COLUMN IF NOT EXISTS rate NUMERIC(5,2)`,
      `ALTER TABLE commissions ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE commissions ADD COLUMN IF NOT EXISTS held_until TIMESTAMP`,
      // orders table
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_first_name VARCHAR(100)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_last_name VARCHAR(100)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID`,
      // users table
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS upline_id UUID`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS total_earned NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS vat_id VARCHAR(50)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS iban VARCHAR(50)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS bic VARCHAR(20)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255)`,
      // payouts table
      `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255)`,
      `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS net_amount NUMERIC(10,2)`,
      `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(10,2) DEFAULT 0`,
      `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10,2)`,
      `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255)`,
      `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS statement_number VARCHAR(50)`,
      `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS period_start DATE`,
      `ALTER TABLE payouts ADD COLUMN IF NOT EXISTS period_end DATE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_kleinunternehmer BOOLEAN DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255)`,
    ];
    for (const sql of alterations) {
      try { await dbQuery(sql); } catch(e) { /* ignore if already exists */ }
    }
    console.log('Column migrations complete.');

    // CLEANUP: Remove duplicate invoices - keep only the FIRST invoice per order
    try {
      const dupResult = await dbQuery(`
        DELETE FROM invoices
        WHERE id NOT IN (
          SELECT DISTINCT ON (order_id) id
          FROM invoices
          WHERE order_id IS NOT NULL
          ORDER BY order_id, created_at ASC
        )
        AND order_id IS NOT NULL
        RETURNING invoice_number
      `);
      if (dupResult.rowCount > 0) {
        console.log(`Cleaned up ${dupResult.rowCount} duplicate invoices`);
      }
      // Fix invoice amounts to match corrected order subtotals
      await dbQuery(`
        UPDATE invoices i
        SET net_amount = o.subtotal + o.shipping_cost,
            vat_amount = o.vat_amount,
            gross_amount = o.total
        FROM orders o
        WHERE i.order_id = o.id
          AND i.type = 'customer'
          AND ABS(i.gross_amount - o.total) > 0.01
      `);
    } catch(e) { console.error('Invoice cleanup error:', e.message); }
    // Add stripe_account_id column if not exists (Stripe Connect payouts)
    await dbQuery(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255)
    `);
    // Add stripe_transfer_id to payouts table if not exists
    await dbQuery(`
      ALTER TABLE payouts ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255)
    `);
    console.log('Stripe Connect columns verified.');

    // ============================================================
    // RECOVERY: Restore 2 orders lost due to 15-min cleanup bug
    // Uses ON CONFLICT DO NOTHING — safe to run on every deploy
    // Only inserts if order_number does not already exist
    // ============================================================
    try {
      console.log('Checking for missing orders to recover...');

      // Find admin user for admin commissions
      // Find admin user for admin commissions — specifically Theresa
      const adminResult = await dbQuery(
        "SELECT id FROM users WHERE email = 'theresa@clyr.at' LIMIT 1"
      );
      // Fallback: any admin
      const adminFallback = adminResult.rows.length === 0
        ? await dbQuery("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")
        : { rows: [] };
      const adminId = adminResult.rows[0]?.id || adminFallback.rows[0]?.id;

      // Find Theresa by referral code THERESA — she referred Katrin Franke (FL26030001)
      const theresaLookup = await dbQuery(
        "SELECT id FROM users WHERE referral_code = 'THERESA' LIMIT 1"
      );
      // Fallback: find by email
      const theresaFallback = theresaLookup.rows.length === 0
        ? await dbQuery("SELECT id FROM users WHERE email = 'theresa@clyr.at' OR role = 'admin' LIMIT 1")
        : { rows: [] };
      const theresaId = theresaLookup.rows[0]?.id || theresaFallback.rows[0]?.id || adminId;

      // Get Theresa's commission rate
      let theresaRate = 31; // Direktor rate (31% - confirmed by Theresa)
      if (theresaId) {
        const theresaRankResult = await dbQuery(
          "SELECT r.commission_rate FROM users u JOIN ranks r ON u.rank_id = r.id WHERE u.id = $1",
          [theresaId]
        );
        theresaRate = parseFloat(theresaRankResult.rows[0]?.commission_rate || 34);
      }

      // Find Marcel Baumeister (MARBAU785) - partner for FL26030002
      const partnerResult = await dbQuery(
        "SELECT id FROM users WHERE referral_code = 'MARBAU785' LIMIT 1"
      );
      const fallbackResult = partnerResult.rows.length === 0
        ? await dbQuery("SELECT id FROM users WHERE role = 'partner' AND status = 'active' ORDER BY created_at ASC LIMIT 1")
        : { rows: [] };
      const partnerId = partnerResult.rows[0]?.id || fallbackResult.rows[0]?.id || null;

      // Get partner rank commission rate
      let partnerRate = 19; // default Berater rate
      if (partnerId) {
        const rankResult = await dbQuery(
          "SELECT r.commission_rate FROM users u JOIN ranks r ON u.rank_id = r.id WHERE u.id = $1",
          [partnerId]
        );
        partnerRate = parseFloat(rankResult.rows[0]?.commission_rate || 19);
      }

      // FL26030001 partner is Theresa (theresaId and theresaRate already set above)

      // ── ORDER 1: FL26030001 ──────────────────────────────────
      // Katrin Franke, Greiz, Deutschland — 6.3.2026
      // Subtotal: 3477.50, Shipping: 70.00, VAT 19%: 674.03, Total: 4221.53
      // Partner: Theresa (admin) - she referred this customer directly
      const order1 = await dbQuery(`
        INSERT INTO orders (
          order_number, customer_email, customer_first_name, customer_last_name,
          billing_street, billing_zip, billing_city, billing_country,
          shipping_street, shipping_zip, shipping_city, shipping_country,
          subtotal, shipping_cost, vat_rate, vat_amount, discount_amount, total,
          partner_id, payment_status, payment_method, status,
          admin_notes, created_at, updated_at
        ) VALUES (
          'FL26030001', 'katrin.franke@clyr.shop', 'Katrin', 'Franke',
          'Auf der Höhe 17', '07973', 'Greiz', 'DE',
          'Auf der Höhe 17', '07973', 'Greiz', 'DE',
          3477.50, 70.00, 19.00, 674.03, 0.00, 4221.53,
          $1, 'paid', 'stripe', 'processing',
          '[Wiederhergestellt: Bestellung durch 15-Minuten-Fehler gelöscht]',
          '2026-03-06 10:00:00', NOW()
        )
        ON CONFLICT (order_number) DO UPDATE SET
          partner_id = COALESCE($1, orders.partner_id),
          payment_status = 'paid',
          status = CASE WHEN orders.status = 'pending' THEN 'processing' ELSE orders.status END,
          updated_at = NOW()
        RETURNING id
      `, [theresaId]);

      // Get order ID whether inserted or updated
      const o1lookup = order1.rows.length > 0
        ? order1.rows[0]
        : (await dbQuery("SELECT id FROM orders WHERE order_number = 'FL26030001'")).rows[0];

      if (o1lookup) {
        const o1id = o1lookup.id;
        console.log('  FL26030001 order id:', o1id);

        // Insert order items if missing
        const existingItems1 = await dbQuery('SELECT id FROM order_items WHERE order_id = $1', [o1id]);
        if (existingItems1.rows.length === 0) {
          await dbQuery(`
            INSERT INTO order_items (order_id, product_name, product_price, quantity, total)
            VALUES 
              ($1, 'CLYR Soda - Komplett-Set', 3332.50, 1, 3332.50),
              ($1, 'Filter-Abo (alle 12 Monate)', 145.00, 1, 145.00)
          `, [o1id]);
        }

        // Fix commissions — only if not already paid out
        if (theresaId) {
          // Recovery should be idempotent: if a non-cancelled commission already
          // exists, keep its accounting state and timestamps intact.
          const existingCommission1 = await dbQuery(
            "SELECT COUNT(*) as cnt FROM commissions WHERE order_id = $1 AND status NOT IN ('cancelled', 'reversed')",
            [o1id]
          );
          if (parseInt(existingCommission1.rows[0].cnt) > 0) {
            console.log('  FL26030001 commissions already exist — skipping recovery');
          } else {
          // Direct commission for Theresa (31% of 3477.50)
          const directAmount = Math.round(3477.50 * (theresaRate / 100) * 100) / 100;
          await dbQuery(`
            INSERT INTO commissions (user_id, order_id, type, amount, rate, base_amount, status, held_until, description, created_at, updated_at)
            VALUES ($1, $2, 'direct', $3, $4, 3477.50, 'released', '2026-03-20 10:00:00', $5, '2026-03-06 10:00:00', NOW())
          `, [theresaId, o1id, directAmount, theresaRate,
              `Direkt-Provision (${theresaRate}%) — FL26030001`]);

          // Reset and recalculate wallet for Theresa
          const theresaTotals = await dbQuery(
            `SELECT 
               COALESCE(SUM(CASE WHEN status IN ('released','paid') THEN amount ELSE 0 END), 0) as total_earned,
               COALESCE(SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END), 0) as available
             FROM commissions WHERE user_id = $1`,
            [theresaId]
          );
          await dbQuery(
            'UPDATE users SET wallet_balance = $1, total_earned = $2 WHERE id = $3',
            [
              parseFloat(theresaTotals.rows[0].available),
              parseFloat(theresaTotals.rows[0].total_earned),
              theresaId
            ]
          );
          console.log(`  FL26030001 commissions fixed: direct €${directAmount} + admin for Theresa`);
          } // end else (not already paid)

          // Create customer account for Katrin Franke and link order
          const katrinExists = await dbQuery(
            "SELECT id FROM customers WHERE email = 'katrin.franke@clyr.shop'"
          );
          let katrinId;
          if (katrinExists.rows.length === 0) {
            const katrinResult = await dbQuery(
              `INSERT INTO customers (email, first_name, last_name, city, country, created_at)
               VALUES ('katrin.franke@clyr.shop', 'Katrin', 'Franke', 'Greiz', 'DE', NOW())
               RETURNING id`
            );
            katrinId = katrinResult.rows[0]?.id;
            console.log('  Created customer account for Katrin Franke');
          } else {
            katrinId = katrinExists.rows[0].id;
          }
          if (katrinId) {
            await dbQuery(
              "UPDATE orders SET customer_id = $1 WHERE order_number = 'FL26030001' AND customer_id IS NULL",
              [katrinId]
            );
          }
        }
      }

      // ── ORDER 2: FL26030002 ──────────────────────────────────
      // Marcel Baumeister, Bäckerbauerstr. 2, 81241 München, DE — 15.3.2026
      // Partner: Marcel Baumeister, code MARBAU785
      // Products: €126 + €150 = €276 netto, Shipping: €14.90, VAT 19%: €55.27, Total: €346.17
      // Commission base = €276.00 (netto product price only, no shipping)
      const partnerResult2 = await dbQuery(
        "SELECT id FROM users WHERE referral_code = 'MARBAU785' LIMIT 1"
      );
      const partnerId2 = partnerResult2.rows[0]?.id || partnerId;

      let partnerRate2 = 19;
      if (partnerId2) {
        const rankResult2 = await dbQuery(
          "SELECT r.commission_rate FROM users u JOIN ranks r ON u.rank_id = r.id WHERE u.id = $1",
          [partnerId2]
        );
        partnerRate2 = parseFloat(rankResult2.rows[0]?.commission_rate || 19);
      }

      const order2 = await dbQuery(`
        INSERT INTO orders (
          order_number, customer_email, customer_first_name, customer_last_name,
          billing_street, billing_zip, billing_city, billing_country,
          shipping_street, shipping_zip, shipping_city, shipping_country,
          subtotal, shipping_cost, vat_rate, vat_amount, discount_amount, total,
          partner_id, referral_code, payment_status, payment_method, status,
          admin_notes, created_at, updated_at
        ) VALUES (
          'FL26030002', 'marcelbaumeister1@freenet.de', 'Marcel', 'Baumeister',
          'Bäckerbauerstr. 2', '81241', 'München', 'DE',
          'Bäckerbauerstr. 2', '81241', 'München', 'DE',
          276.00, 14.90, 19.00, 55.27, 0.00, 346.17,
          $1, 'MARBAU785', 'paid', 'stripe', 'processing',
          '[Wiederhergestellt: Bestellung durch 15-Minuten-Fehler gelöscht]',
          '2026-03-15 10:00:00', NOW()
        )
        ON CONFLICT (order_number) DO UPDATE SET
          subtotal = 276.00,
          shipping_cost = 14.90,
          payment_status = 'paid',
          status = CASE WHEN orders.status = 'pending' THEN 'processing' ELSE orders.status END,
          updated_at = NOW()
        RETURNING id
      `, [partnerId2]);

      if (order2.rows.length > 0) {
        const o2id = order2.rows[0].id;
        console.log('  Recovered order FL26030002, id:', o2id);

        // Insert correct order items from invoice (€126 + €150 = €276 netto)
        const existingItems2 = await dbQuery(
          'SELECT id FROM order_items WHERE order_id = $1', [o2id]
        );
        if (existingItems2.rows.length === 0) {
          await dbQuery(`
            INSERT INTO order_items (order_id, product_name, product_price, quantity, total)
            VALUES
              ($1, 'CLYR Produkt 1', 126.00, 1, 126.00),
              ($1, 'CLYR Produkt 2', 150.00, 1, 150.00)
          `, [o2id]);
        }

        if (partnerId2) {
          const holdUntil = new Date();
          holdUntil.setDate(holdUntil.getDate() + 14);

          // Check if FL26030002 commissions already paid — skip if so
          const existingPaid2 = await dbQuery(
            "SELECT COUNT(*) as cnt FROM commissions WHERE order_id = $1 AND status = 'paid'",
            [o2id]
          );
          if (parseInt(existingPaid2.rows[0].cnt) > 0) {
            console.log('  FL26030002 commissions already paid — skipping recovery');
          } else {
          // Delete unpaid commissions and re-insert correctly
          await dbQuery("DELETE FROM commissions WHERE order_id = $1 AND status != 'paid'", [o2id]);

          // Direct commission for Marcel (19% of 276.00)
          const directAmount2 = Math.round(276.00 * (partnerRate2 / 100) * 100) / 100;
          await dbQuery(`
            INSERT INTO commissions (user_id, order_id, type, amount, rate, base_amount, status, held_until, description)
            VALUES ($1, $2, 'direct', $3, $4, 276.00, 'held', $5, $6)
          `, [partnerId2, o2id, directAmount2, partnerRate2, holdUntil,
              `Direkt-Provision (${partnerRate2}%) — FL26030002`]);

          // Difference commission for Theresa as upline (31% - 19% = 12%)
          if (theresaId && theresaId !== partnerId2) {
            const diffRate = Math.max(0, theresaRate - partnerRate2);
            if (diffRate > 0) {
              const diffAmount = Math.round(276.00 * (diffRate / 100) * 100) / 100;
              await dbQuery(`
                INSERT INTO commissions (user_id, order_id, type, amount, rate, base_amount, status, held_until, description)
                VALUES ($1, $2, 'difference', $3, $4, 276.00, 'released', NOW(), $5)
              `, [theresaId, o2id, diffAmount, diffRate,
                  `Differenz-Provision (${diffRate}% = ${theresaRate}%-${partnerRate2}%) — FL26030002`]);
            }
          }

          // Recalculate wallet for Theresa
          if (theresaId) {
            const theresaTotals2 = await dbQuery(
              `SELECT 
                 COALESCE(SUM(CASE WHEN status IN ('released','paid') THEN amount ELSE 0 END), 0) as total_earned,
                 COALESCE(SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END), 0) as available
               FROM commissions WHERE user_id = $1`,
              [theresaId]
            );
            await dbQuery(
              'UPDATE users SET wallet_balance = $1, total_earned = $2 WHERE id = $3',
              [
                parseFloat(theresaTotals2.rows[0].available),
                parseFloat(theresaTotals2.rows[0].total_earned),
                theresaId
              ]
            );
          }

          // Update Marcel's sales stats
          await dbQuery(`
            UPDATE users SET 
              own_sales_count = 1,
              own_sales_volume = 276.00,
              last_sale_at = '2026-03-15 10:00:00'
            WHERE id = $1
          `, [partnerId2]);

          console.log(`  FL26030002 commissions fixed: direct €${directAmount2} Marcel, diff + admin for Theresa`);
          } // end else (not already paid)

          // Create customer account for Marcel Baumeister and link order
          const marcelExists = await dbQuery(
            "SELECT id FROM customers WHERE email = 'marcelbaumeister1@freenet.de'"
          );
          let marcelId;
          if (marcelExists.rows.length === 0) {
            const marcelResult = await dbQuery(
              `INSERT INTO customers (email, first_name, last_name, city, country, created_at)
               VALUES ('marcelbaumeister1@freenet.de', 'Marcel', 'Baumeister', 'München', 'DE', NOW())
               RETURNING id`
            );
            marcelId = marcelResult.rows[0]?.id;
            console.log('  Created customer account for Marcel Baumeister');
          } else {
            marcelId = marcelExists.rows[0].id;
          }
          if (marcelId) {
            await dbQuery(
              "UPDATE orders SET customer_id = $1 WHERE order_number = 'FL26030002' AND customer_id IS NULL",
              [marcelId]
            );
          }
        }
      } else {
        console.log('  Order FL26030002 already exists — skipping');
      }

      console.log('Order recovery check complete.');

    // Recreate Wolfgang Kronsteiner account if deleted by mistake
    try {
      const wolfCheck = await dbQuery(
        "SELECT id FROM users WHERE email = 'technik@clyr.shop' LIMIT 1"
      );
      if (wolfCheck.rows.length === 0) {
        const bcrypt = await import('bcryptjs');
        const hash = await bcrypt.default.hash('Clyr123!', 10);
        await dbQuery(`
          INSERT INTO users (
            first_name, last_name, email, password_hash,
            role, status, wallet_balance,
            created_at, updated_at
          ) VALUES (
            'Wolfgang', 'Kronsteiner', 'technik@clyr.shop', $1,
            'admin', 'active', 0,
            NOW(), NOW()
          ) ON CONFLICT (email) DO NOTHING
        `, [hash]);
        console.log('Recreated Wolfgang Kronsteiner account: technik@clyr.shop');
      }
    } catch(e) { console.error('Wolfgang recreation error:', e.message); }

    // Ensure Theresa's admin account always exists and is active
    try {
      const theresaCheck = await dbQuery(
        "SELECT id, status, role FROM users WHERE email = 'theresa@clyr.at' LIMIT 1"
      );
      if (theresaCheck.rows.length > 0) {
        // Make sure account is active and is admin
        await dbQuery(
          "UPDATE users SET status = 'active', role = 'admin' WHERE email = 'theresa@clyr.at' AND (status != 'active' OR role != 'admin')"
        );
        console.log('Theresa admin account verified: theresa@clyr.at');
      } else {
        console.log('WARNING: Theresa admin account (theresa@clyr.at) not found in DB!');
      }
    } catch(e) { console.error('Theresa account check error:', e.message); }

    // Auto-retry: if any partner has pending SEPA payouts AND now has Stripe connected
    // → cancel the pending record, reset commissions to released, trigger Stripe direct payout
    //
    // ⚠️ FIXED (Jul 2026): this block runs on every server start — every deploy,
    // crash-restart, or platform restart. It used to fire unconditionally, so two
    // restarts close together (e.g. a redeploy shortly after a crash, or a couple
    // of quick redeploys while actively developing) could each independently
    // cancel-and-retry the SAME pending payout and trigger a brand new real Stripe
    // transfer both times — a duplicate payment with no admin action involved,
    // which matches what was reported. Two guards added:
    //   1) Only retry payouts that have been sitting as 'pending' for at least an
    //      hour, so back-to-back restarts within that window can't reprocess a
    //      payout that a previous startup just claimed.
    //   2) A cooldown lock (like the monthly payout_cycle lock) so this whole
    //      block runs at most once per hour regardless of how many times the
    //      process restarts in that window.
    try {
      const cooldownKey = `auto_retry_cooldown_${new Date().toISOString().slice(0, 13)}`; // per hour
      const cooldownCheck = await dbQuery(
        `SELECT id FROM activity_log WHERE action = 'auto_retry_started' AND details->>'cooldownKey' = $1 LIMIT 1`,
        [cooldownKey]
      );
      if (cooldownCheck.rows.length > 0) {
        console.log(`[AUTO-RETRY] Skipped — already ran this hour (${cooldownKey}), avoiding duplicate Stripe payouts on repeated restarts`);
      } else {
        await dbQuery(
          `INSERT INTO activity_log (action, entity_type, entity_id, details) VALUES ('auto_retry_started', 'system', $1, $2)`,
          [cooldownKey, JSON.stringify({ cooldownKey, startedAt: new Date().toISOString() })]
        );

        const pendingPayouts = await dbQuery(`
          SELECT p.id, p.user_id, p.net_amount, p.gross_amount, p.vat_amount,
                 u.first_name, u.last_name, u.email, u.stripe_account_id
          FROM payouts p
          JOIN users u ON p.user_id = u.id
          WHERE p.status = 'pending'
            AND p.method = 'sepa'
            AND u.stripe_account_id IS NOT NULL
            AND p.created_at < NOW() - INTERVAL '1 hour'
          ORDER BY p.created_at DESC
        `);

        if (pendingPayouts.rows.length > 0) {
          console.log(`[AUTO-RETRY] Found ${pendingPayouts.rows.length} pending SEPA payout(s) (>1h old) for partners with Stripe connected`);

          // Deduplicate by user — only process latest payout per user
          const seen = new Set();
          for (const p of pendingPayouts.rows) {
            if (seen.has(p.user_id)) {
              await dbQuery("UPDATE payouts SET status = 'cancelled' WHERE id = $1", [p.id]);
              continue;
            }
            seen.add(p.user_id);

            console.log(`[AUTO-RETRY]   Resetting ${p.first_name} ${p.last_name} (€${p.gross_amount}) → Stripe direct payout`);
            await dbQuery("UPDATE payouts SET status = 'cancelled' WHERE id = $1", [p.id]);
            await dbQuery(
              "UPDATE commissions SET status = 'released', paid_at = NULL, payout_id = NULL WHERE payout_id = $1",
              [p.id]
            );
            await dbQuery(
              "UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2",
              [p.net_amount, p.user_id]
            );
          }

          const { runStripePayouts } = await import('./controllers/stripe-connect.controller.js');
          const result = await runStripePayouts();
          console.log(`[AUTO-RETRY] Done: ${result.processed} paid via Stripe, ${result.failed} failed, ${result.pending + result.skipped} still pending`);
        } else {
          console.log('[AUTO-RETRY] No pending SEPA payouts (>1h old) with Stripe connected — nothing to retry.');
        }
      }
    } catch(e) {
      console.error('[AUTO-RETRY] Error:', e.message);
      console.error(e.stack);
    }

    } catch(e) {
      console.error('Order recovery error (non-fatal):', e.message);
    }


    try {
      await dbQuery("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE payment_status = 'pending' AND created_at < NOW() - INTERVAL '2 hours')");
      await dbQuery("DELETE FROM commissions WHERE order_id IN (SELECT id FROM orders WHERE payment_status = 'pending' AND created_at < NOW() - INTERVAL '2 hours')");
      const cancelled = await dbQuery(
        "DELETE FROM orders WHERE payment_status = 'pending' AND created_at < NOW() - INTERVAL '2 hours' RETURNING id"
      );
      if (cancelled.rowCount > 0) {
        console.log(`Auto-deleted ${cancelled.rowCount} unpaid orders older than 2 hours`);
      }
    } catch(e) { console.error('Auto-cancel error:', e.message); }
  } catch (err) {
    console.error('Auto-migration warning:', err.message);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Don't exit in production, just log
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

export default app;
