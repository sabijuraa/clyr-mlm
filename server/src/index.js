require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── HEALTH CHECK FIRST — before anything else ─────────────────────
// DigitalOcean pings this immediately; must respond without any DB calls
app.get('/health', (req, res) => res.status(200).send('ok'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', time: new Date().toISOString() }));

// ─── MIDDLEWARE ─────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.use(cookieParser());

// CRITICAL: Stripe webhook needs raw body BEFORE express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Zu viele Anfragen' } }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/documents', express.static(path.join(__dirname, '../documents')));

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

// ─── API ROUTES ────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/cms', require('./routes/cms'));
app.use('/api/brand', require('./routes/brand'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/documents', require('./routes/documents'));

// SPA fallback (production only)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../client/dist/index.html')));
}

app.use(errorHandler);

// ─── START SERVER ──────────────────────────────────────────────────
// DigitalOcean sets PORT env var (usually 8080); bind to 0.0.0.0
const PORT = parseInt(process.env.PORT, 10) || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`CLYR Server running on 0.0.0.0:${PORT}`);

  // Start scheduled jobs AFTER server is listening
  try {
    const { startScheduledJobs } = require('./services/scheduler');
    startScheduledJobs();
  } catch (err) {
    console.error('Scheduler failed to start:', err.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});
