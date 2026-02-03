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
import subscriptionRoutes from './routes/subscription.routes.js';
import variantRoutes from './routes/variant.routes.js';
import creditnoteRoutes from './routes/creditnote.routes.js';
import vatreportRoutes from './routes/vatreport.routes.js';

// Import NEW routes (for Theresa's WordPress-like features)
import brandingRoutes from './routes/branding.routes.js';
import settingsRoutes from './routes/settings.routes.js';

// Import error middleware
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

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

// Customer Portal
app.use('/api/customers', customerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Partner/MLM
app.use('/api/partners', partnerRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/payouts', payoutRoutes);

// Admin
app.use('/api/admin', adminRoutes);

// CMS & Content
app.use('/api/cms', cmsRoutes);
app.use('/api/academy', academyRoutes);
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
app.use('/api', settingsRoutes);        // Legal pages, company settings, invoices

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use(errorHandler);

// ========================================
// START SERVER
// ========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🚀 CLYR MLM Server Started');
  console.log('='.repeat(50));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL: http://localhost:${PORT}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log('='.repeat(50));
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