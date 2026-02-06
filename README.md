# CLYR Solutions GmbH — MLM E-Commerce Platform

Full-stack MLM/Network Marketing e-commerce platform for CLYR water filtration products.

## Tech Stack
- **Frontend:** React 18 + Vite + Tailwind CSS + Lucide Icons
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL with UUID primary keys
- **Payments:** Stripe Checkout + Bank Transfer (Vorkasse)
- **PDF:** PDFKit (invoices, commission statements)
- **Email:** Nodemailer (SMTP)

## Features

### Shop & E-Commerce
- Product catalog with categories, multi-image, variants
- Country-specific pricing (AT/DE/CH) with correct tax rates
- Shopping cart with shipping thresholds (AT €69, DE €50, CH CHF180)
- Stripe checkout + bank transfer payment
- Order management with status workflow
- Invoice PDF generation with CLYR branding
- GDPR cookie consent banner

### Partner/MLM System
- Partner registration with sponsor code
- 7-rank commission system (8%–36%, NO 50% admin override)
- Direct sale commission (always paid)
- Difference commission (passes through inactive uplines)
- Leadership bonus (1%) + Team volume bonus (1%)
- Activity requirement: 2+ sales/quarter for team commissions
- Automatic rank promotion based on qualification criteria
- 12-month rank decay for inactive partners (reset to R2)
- One-time rank bonuses (R4: €500, R5: €1000, R6: €2000)
- Commission statement PDF (Provisionsgutschrift)
- Team tree visualization (7 levels deep)

### Admin Panel
- Dashboard with stats
- Product CRUD with multi-image upload + variant management
- Order management with status updates
- Partner management with rank changes
- Commission approval (individual + bulk)
- CMS: homepage sections, legal pages, FAQ
- Document management (upload/visibility)
- User management

### Auth & Security
- JWT access token (15min) + refresh token (7 days) with rotation
- Role-based access: customer, partner, admin
- Password reset via email
- Rate limiting on auth routes
- Customer profile management

### Email Notifications
- Order confirmation
- Partner welcome with referral code
- Commission notifications
- Password reset

### Design
- CLYR branding (#2D3436, #5DADE2, #D5E8F0)
- Inter font, glassmorphism dashboard cards
- CSS animations (slide-up, fade-in)
- Fully responsive (mobile + desktop)

## Setup

```bash
# 1. Database
createdb clyr
psql clyr < database/schema.sql

# 2. Server
cd server
cp .env.example .env  # Edit with your credentials
npm install
npm run seed
npm start

# 3. Client
cd client
npm install
npm run dev
```

## Environment Variables
See `server/.env.example` for all required variables.

## Company Info
- **CLYR Solutions GmbH**
- Pappelweg 4b, 9524 St. Magdalen, Austria
- Distribution: Holz 33, 5211 Lengau
- service@clyr.shop | www.clyr.shop
