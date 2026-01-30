import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import partnerRoutes from './routes/partner.routes.js';
import commissionRoutes from './routes/commission.routes.js';
import adminRoutes from './routes/admin.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import payoutRoutes from './routes/payout.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import academyRoutes from './routes/academy.routes.js';
import stockRoutes from './routes/stock.routes.js';
import cmsRoutes from './routes/cms.routes.js';
import variantRoutes from './routes/variant.routes.js';
import gdprRoutes from './routes/gdpr.routes.js';
import customerRoutes from './routes/customer.routes.js';
import importRoutes from './routes/import.routes.js';
import newsletterRoutes from './routes/newsletter.routes.js';
import creditNoteRoutes from './routes/creditnote.routes.js';
import vatReportRoutes from './routes/vatreport.routes.js';

// Import services for cron jobs
import * as commissionService from './services/commission.service.js';
import * as payoutService from './services/payout.service.js';

// Import middleware
import { errorHandler } from './middleware/error.middleware.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],  // Allow both ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stripe webhook needs raw body (before express.json())
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (product images, uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Public branding endpoint (no auth required)
app.get('/api/branding', async (req, res) => {
  try {
    const { query: dbQuery } = await import('./config/database.js');
    const result = await dbQuery("SELECT value FROM settings WHERE key = 'branding'");
    res.json(result.rows[0]?.value || {});
  } catch (err) {
    // Return empty object on error - frontend will use defaults
    console.error('Branding fetch error:', err.message);
    res.json({});
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/credit-notes', creditNoteRoutes);
app.use('/api/vat-reports', vatReportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// ================================================
// CRON JOBS - Scheduled Tasks
// ================================================

// Release held commissions daily at 2:00 AM
// Checks for commissions that have passed the 14-day hold period
cron.schedule('0 2 * * *', async () => {
  console.log('[CRON] Running daily commission release...');
  try {
    const result = await commissionService.releaseHeldCommissions();
    console.log(`[CRON] Released ${result.released} commissions, total: €${result.totalAmount}`);
  } catch (error) {
    console.error('[CRON] Commission release failed:', error.message);
  }
}, {
  timezone: 'Europe/Vienna'
});

// Monthly payout cycle on the 1st at 6:00 AM
// Creates payout requests for all eligible partners (balance >= €50)
cron.schedule('0 6 1 * *', async () => {
  console.log('[CRON] Running monthly payout cycle...');
  try {
    const result = await payoutService.runMonthlyPayoutCycle();
    console.log(`[CRON] Created ${result.payoutsCreated} payouts, total: €${result.totalAmount}`);
  } catch (error) {
    console.error('[CRON] Monthly payout cycle failed:', error.message);
  }
}, {
  timezone: 'Europe/Vienna'
});

// Reset quarterly sales counts on Jan 1, Apr 1, Jul 1, Oct 1 at midnight
// Resets the quarterly sales counter for active partner status
cron.schedule('0 0 1 1,4,7,10 *', async () => {
  console.log('[CRON] Resetting quarterly sales counts...');
  try {
    const result = await commissionService.resetQuarterlySales();
    console.log(`[CRON] Reset quarterly sales for ${result.partnersReset} partners`);
  } catch (error) {
    console.error('[CRON] Quarterly reset failed:', error.message);
  }
}, {
  timezone: 'Europe/Vienna'
});

// Check subscription renewals daily at 3:00 AM
// Processes auto-renewal for filter subscriptions
cron.schedule('0 3 * * *', async () => {
  console.log('[CRON] Checking subscription renewals...');
  try {
    const { query: dbQuery } = await import('./config/database.js');
    const result = await dbQuery(`
      SELECT s.*, u.email, u.first_name, u.stripe_customer_id
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'active'
        AND s.next_billing_date <= CURRENT_DATE
    `);
    console.log(`[CRON] Found ${result.rows.length} subscriptions due for renewal`);
    // Subscription renewal logic handled by subscription service
  } catch (error) {
    console.error('[CRON] Subscription check failed:', error.message);
  }
}, {
  timezone: 'Europe/Vienna'
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║                                                    ║
║   ██████╗██╗  ██╗   ██╗██████╗                     ║
║  ██╔════╝██║  ╚██╗ ██╔╝██╔══██╗                    ║
║  ██║     ██║   ╚████╔╝ ██████╔╝                    ║
║  ██║     ██║    ╚██╔╝  ██╔══██╗                    ║
║  ╚██████╗███████╗██║   ██║  ██║                    ║
║   ╚═════╝╚══════╝╚═╝   ╚═╝  ╚═╝                    ║
║                                                    ║
║   CLYR MLM Platform API                            ║
║   Port: ${PORT}                                        ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(28)}║
║                                                    ║
║   Cron Jobs Active:                                ║
║   • Daily commission release (02:00)               ║
║   • Monthly payout cycle (1st, 06:00)              ║
║   • Quarterly sales reset (Q1/Q2/Q3/Q4)            ║
║   • Subscription renewals (03:00)                  ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});

export default app;