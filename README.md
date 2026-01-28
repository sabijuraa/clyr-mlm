# 💧 CLYR - Premium Water Systems MLM Platform

A full-stack MLM (Multi-Level Marketing) e-commerce platform for CLYR premium water systems and aroma showers.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

## 🎯 Features

### Customer Shop
- ✅ Product catalog with categories & filtering
- ✅ Shopping cart with referral code tracking
- ✅ Checkout with Stripe payments
- ✅ Country-specific VAT (DE 19%, AT 20%, CH 0%)
- ✅ Order confirmation & tracking
- ✅ Multi-language support (DE/EN)
- ✅ Customer invoice generation (PDF)

### Partner Dashboard
- ✅ Real-time commission tracking
- ✅ Team management with tree visualization
- ✅ Referral link generation
- ✅ Customer management
- ✅ Wallet & payout requests
- ✅ Rank progress tracking
- ✅ Commission statements (PDF)
- ✅ CLYR Academy training content

### Admin Panel
- ✅ Order management
- ✅ Partner approval & management
- ✅ Commission processing & payouts
- ✅ Sales reports & analytics
- ✅ CSV exports
- ✅ System settings
- ✅ Stock management
- ✅ SEPA payout batch generation

## 🏗 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TailwindCSS, Framer Motion |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Payments | Stripe |
| Auth | JWT (Access + Refresh tokens) |
| PDF | PDFKit |
| Scheduling | node-cron |

## 📁 Project Structure

```
clyr-mlm/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── common/        # Navbar, Footer, Buttons
│   │   │   ├── dashboard/     # Partner dashboard components
│   │   │   └── shop/          # Shop components
│   │   ├── config/            # Brand & app configuration
│   │   ├── context/           # React contexts (Auth, Cart, Brand)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── layouts/           # Page layouts (Public, Dashboard, Admin)
│   │   ├── pages/             # Route components
│   │   │   ├── admin/         # Admin panel pages
│   │   │   ├── auth/          # Login, Register, Verify
│   │   │   ├── dashboard/     # Partner dashboard pages
│   │   │   ├── legal/         # Legal pages
│   │   │   └── public/        # Shop pages
│   │   ├── services/          # API services
│   │   └── utils/             # Utilities
│   └── public/                # Static assets
│
├── server/                    # Express Backend
│   ├── src/
│   │   ├── config/            # Database config
│   │   ├── controllers/       # Route handlers (11 controllers)
│   │   ├── database/          # Schema, migrations, seeds
│   │   ├── middleware/        # Auth, validation, upload
│   │   ├── routes/            # API route definitions
│   │   └── services/          # Business logic
│   │       ├── commission.service.js  # Full MLM commission engine
│   │       ├── payout.service.js      # SEPA payout system
│   │       ├── invoice.service.js     # PDF generation
│   │       └── email.service.js       # Email notifications
│   └── uploads/               # File uploads
│
├── DEPLOYMENT.md              # Production deployment guide
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Stripe account (for payments)
- SMTP email service

### 1. Install Dependencies

```bash
cd clyr-mlm

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

```bash
# Server environment
cd server
cp .env.example .env
# Edit .env with your values

# Client environment
cd ../client
cp .env.example .env
# Edit .env with your values
```

### 3. Setup Database

```bash
cd server

# Run migrations (creates 21 tables)
npm run db:migrate

# Seed initial data (products, admin user, settings)
npm run db:seed
```

### 4. Start Development

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

Access the application:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

## 🔐 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | theresa@clyr.at | Admin123! |
| Demo Partner | demo@partner.com | Partner123! |

## 📦 Products

| Product | Net Price | SKU |
|---------|-----------|-----|
| CLYR Home Soda - Standard | €3,332.50 | CLYR-SODA-STD |
| CLYR Home Soda - Premium | €3,332.50 | CLYR-SODA-PRM |
| CLYR Aroma Dusche - Zitrus | €126.00 | CLYR-SHOWER-CIT |
| CLYR Aroma Dusche - Lavendel | €126.00 | CLYR-SHOWER-LAV |
| CLYR Aroma Dusche - Eukalyptus | €126.00 | CLYR-SHOWER-EUC |
| Professionelle Installation | €400.00 | CLYR-INSTALL |
| Filter-Abo (jährlich) | €149.00 | CLYR-FILTER-ABO |

## 💰 Commission Structure

### Direct Commission (by Rank)

| Rank | Rate | Own Sales | Team Sales | Direct Partners |
|------|------|-----------|------------|-----------------|
| Starter | 8% | 0 | 0 | 0 |
| Berater | 22% | 1* | 0 | 0 |
| Senior Berater | 26% | 5 | 10 | 2 |
| Teamleiter | 30% | 10 | 30 | 5 |
| Manager | 33% | 20 | 75 | 10 |
| Verkaufsleiter | 36% | 35 | 150 | 15 |

*Auto-upgrade to Berater if partner owns a CLYR system

### Additional Earnings
- **Admin Commission:** 50% on all sales (paid to Theresa)
- **Difference Commission:** Upline earns (their_rate - seller_rate) if active
- **Leadership Bonus:** 1% of team sales (requires 3+ active partners)
- **Team Volume Bonus:** 1% if team has 10+ sales/month
- **Rank Bonuses:** €500 (Teamleiter), €1,000 (Manager), €2,000 (Verkaufsleiter)

### Active Partner Requirement
- 2 sales per quarter to remain active
- Inactive partners: commissions pass through to next active upline

### Commission Flow
1. Order placed → Commissions calculated
2. 14-day hold period (for returns)
3. Released to wallet
4. Monthly payout (1st of month, min €50) via SEPA

## 🌍 Tax Rules

### Customer Invoices (Issued by MUTIMBAUCH Vertriebs GmbH - Germany)

| Customer Location | VAT Rate | Notes |
|-------------------|----------|-------|
| Germany | 19% | Standard |
| Austria | 20% | Standard |
| Austria + VAT ID | 0% | Reverse Charge |
| Switzerland | 0% | Export |

### Commission Statements (Issued by FreshLiving - Austria)

| Affiliate Location | VAT Treatment | Notes |
|-------------------|---------------|-------|
| Germany | Net (0%) | Reverse Charge §13b UStG, VAT ID required |
| Austria + VAT ID | Net (0%) | Reverse Charge |
| Austria (Kleinunternehmer) | Exempt | §6 Abs.1 Z 27 UStG |

## 📦 Shipping Costs

| Country | Flat Rate |
|---------|-----------|
| Germany | €50 |
| Austria | €69 |
| Switzerland | €180 |

*No free shipping threshold*

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh-token
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me
```

### Products
```
GET  /api/products
GET  /api/products/featured
GET  /api/products/categories
GET  /api/products/:slug
```

### Orders
```
POST /api/orders
POST /api/orders/calculate
POST /api/orders/create-payment-intent
GET  /api/orders/confirmation/:orderNumber
```

### Partner
```
GET  /api/partners/dashboard
GET  /api/partners/team
GET  /api/partners/wallet
GET  /api/partners/customers
```

### Commissions
```
GET  /api/commissions
GET  /api/commissions/summary
GET  /api/commissions/breakdown
```

### Payouts
```
GET  /api/payouts
POST /api/payouts/request
GET  /api/payouts/:id/statement
```

### Academy
```
GET  /api/academy/content
GET  /api/academy/progress
POST /api/academy/progress
```

### Subscriptions
```
GET  /api/subscriptions
POST /api/subscriptions
DELETE /api/subscriptions/:id
```

### Admin
```
GET  /api/admin/dashboard
GET  /api/admin/partners
GET  /api/admin/orders
GET  /api/admin/reports/sales
POST /api/admin/payouts/approve
POST /api/admin/payouts/process
```

### Webhooks
```
POST /api/webhooks/stripe
```

## ⏰ Scheduled Tasks

| Task | Schedule | Description |
|------|----------|-------------|
| Commission Release | Daily 02:00 | Release held commissions after 14 days |
| Monthly Payouts | 1st of month 06:00 | Create payout requests for eligible partners |
| Quarterly Reset | Q1/Q2/Q3/Q4 start | Reset quarterly sales counters |
| Subscription Renewals | Daily 03:00 | Process filter subscription renewals |

*All times in Europe/Vienna timezone*

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete production deployment guide including:
- Vercel/Railway deployment
- Database setup
- Stripe webhook configuration
- Email service setup
- SSL/Domain configuration
- Security checklist

## 🛠 Development Notes

### Adding New Features

1. **New API endpoint:**
   - Add route in `server/src/routes/`
   - Add controller in `server/src/controllers/`
   - Add service logic in `server/src/services/`
   - Register route in `server/src/index.js`

2. **New frontend page:**
   - Create component in `client/src/pages/`
   - Add route in `client/src/App.jsx`
   - Add to navigation if needed

### Database Changes

```bash
# Edit schema
nano server/src/database/schema.sql

# Reset database (WARNING: deletes all data)
npm run db:reset
npm run db:migrate
npm run db:seed
```

## 📄 Legal Entities

| Entity | Role | Country |
|--------|------|---------|
| MUTIMBAUCH Vertriebs GmbH | Product fulfillment, Customer invoices | Germany |
| FreshLiving - Theresa Struger | Affiliate payouts, Commission statements | Austria |
| CLYR | Brand name | - |

## 📞 Support

- **Email:** info@clyr.at
- **Phone:** +43 660 123 4567
- **Website:** https://clyr.at

---

© 2026 CLYR / FreshLiving. All rights reserved.
