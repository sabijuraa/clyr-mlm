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

// Import NEW routes (for Theresa's WordPress-like features)
import brandingRoutes from './routes/branding.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import referralRoutes from './routes/referral.routes.js';
import faqRoutes from './routes/faq.routes.js';
import legalRoutes from './routes/legal.routes.js';
import complianceRoutes from './routes/compliance.routes.js';

// Import error middleware
import { errorHandler } from './middleware/error.middleware.js';

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
    environment: process.env.NODE_ENV || 'development'
  });
});

// Also respond at /api/health for DigitalOcean health checks
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
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
app.use('/api/vatreports', vatreportRoutes);

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
  const frontendUrl = process.env.FRONTEND_URL;
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
  const frontendUrl = process.env.FRONTEND_URL || '';
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

// Release held commissions daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('⏰ Cron: Releasing held commissions...');
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

// Reset quarterly sales counts on 1st of Jan, Apr, Jul, Oct at 1:00 AM
cron.schedule('0 1 1 1,4,7,10 *', async () => {
  try {
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
        `INSERT INTO legal_pages (page_key, title, content) VALUES ($1, $2, $3) ON CONFLICT (page_key) DO UPDATE SET title = $2, content = CASE WHEN legal_pages.content NOT LIKE '%<h2>%' THEN $3 ELSE legal_pages.content END`,
        [key, title, defaultContent]
      );
    }
    console.log('Critical tables verified.');
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