// server/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
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

// Import NEW routes
import brandingRoutes from './routes/branding.routes.js';
import settingsRoutes from './routes/settings.routes.js';

// Import error middleware
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/academy', academyRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/import', importRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/creditnotes', creditnoteRoutes);
app.use('/api/vatreports', vatreportRoutes);

// NEW Routes
app.use('/api', brandingRoutes);
app.use('/api', settingsRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;