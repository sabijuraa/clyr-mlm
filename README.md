# CLYR MLM Platform

**A full-stack MLM (Multi-Level Marketing) e-commerce platform** built for [CLYR Solutions GmbH](https://clyr.shop) — an Austrian company selling premium home soda systems and wellness products across the DACH region (Germany, Austria, Switzerland).

🔗 **Live Site:** [https://clyr.shop](https://clyr.shop)



## Overview

CLYR is a production-grade platform that combines a customer-facing online shop with a complete partner/affiliate management system. Partners earn commissions through a 6-rank unilevel compensation plan, track their teams, and manage referral codes — all through a dedicated dashboard.

The platform handles real Stripe payments, automated PDF invoice generation, EU-compliant VAT calculations (including Reverse Charge for B2B), and multi-language support in German and English.



## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL |
| **Payments** | Stripe (Checkout, Klarna, EPS) |
| **PDF Engine** | PDFKit |
| **Auth** | JWT (access + refresh tokens) |
| **Email** | Brevo (Sendinblue) SMTP |
| **Hosting** | DigitalOcean App Platform |



## Key Features

### Shop & Checkout
- Product catalog with categories, image galleries, and search
- Cart with country-based shipping and VAT calculation
- Stripe Checkout with card, Klarna, and EPS (Austrian bank transfer)
- Automatic customer invoice PDF generation and email delivery
- Voucher/discount code system

### Partner System
- Self-service partner registration with Stripe-powered annual fee (pro-rated)
- 6-rank compensation plan: Starter → Berater → Fachberater → Teamleiter → Manager → Sales Manager
- Direct commission + difference commission across the upline chain
- Activity-based eligibility (inactive uplines are skipped, not paid)
- Referral code management with custom editable codes
- Team tree visualization

### Admin Dashboard
- Order management with payment status tracking
- Partner management: rank assignment, sponsor/upline changes, status control
- Product CRUD with drag-and-drop image uploads and manual sort ordering
- Commission oversight with hold periods and manual release
- Invoice browser: customer invoices, commission statements, partner fee receipts
- Newsletter system with double opt-in confirmation
- Branding settings (logo, company info reflected on all PDFs)
- Sales, commission, and partner reports with CSV export

### Tax & Compliance
- Austrian company selling to DE/AT/CH — full VAT logic:
  - Austria: 20% MwSt.
  - Germany B2C: 19% MwSt. / B2B with VAT ID: 0% Reverse Charge
  - Switzerland: 8.1% MwSt.
- Three commission billing types (DE Reverse Charge, AT with USt-IdNr, AT Kleinunternehmer)
- GDPR-compliant: data export, account deletion, cookie consent
- Imprint and privacy policy CMS



## Project Structure


clyr-mlm/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level pages (public, dashboard, admin)
│   │   ├── context/         # Auth, Language, Cart providers
│   │   ├── config/          # App config, rank definitions, VAT rules
│   │   └── services/        # API client (axios)
│   └── public/              # Static assets, logo, images
│
├── server/                  # Express API
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic (commissions, invoices, email)
│   │   ├── routes/          # REST API routes
│   │   ├── middleware/       # Auth, error handling, file uploads
│   │   ├── config/          # Database connection, app config
│   │   └── database/        # Schema, migrations, seeds
│   ├── public/              # Generated PDFs, downloads, brochure
│   └── uploads/             # User-uploaded files (products, documents)
│
├── app.yaml                 # DigitalOcean App Platform spec
└── README.md
```



## Environment Variables

### Server

env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-random-secret
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=smtp-password
SMTP_FROM=service@clyr.shop
FRONTEND_URL=https://clyr.shop


### Client

env
VITE_API_URL=https://clyr.shop/api




## Local Development

# Clone
git clone https://github.com/sabijuraa/clyr-mlm.git
cd clyr-mlm

# Backend
cd server
cp .env.example .env       # configure your local DB, Stripe test keys, etc.
npm install
node src/database/migrate.js
npm run dev

# Frontend (new terminal)
cd client
npm install
npm run dev


The frontend runs on `http://localhost:5173` and proxies API requests to `http://localhost:5000`.



## Deployment (DigitalOcean App Platform)

1. Push code to GitHub
2. Create a new App on [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
3. Add a managed PostgreSQL database
4. Configure environment variables in the dashboard
5. Set up Stripe webhook → `https://your-domain.com/api/webhooks/stripe`
6. Run migrations: `cd server && node src/database/migrate.js`



## Screenshots

> Visit the live site to explore: [https://clyr.shop](https://clyr.shop)



## Author

Built by **Saba** — full-stack developer.

This project was developed as a freelance engagement for CLYR Solutions GmbH and serves as a portfolio piece demonstrating end-to-end product development: from database schema and payment integration to responsive UI and PDF generation.

---

## License

This project is proprietary software built for CLYR Solutions GmbH. 
