# 🚀 CLYR MLM Platform - GitHub & DigitalOcean Deployment Guide

Follow these steps to push your code to GitHub and deploy on DigitalOcean.

---

## 📋 Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `clyr-mlm`
3. Set to **Private** (recommended)
4. Do NOT initialize with README (we already have one)
5. Click "Create repository"

---

## 📤 Step 2: Push Code to GitHub

After creating the repo, GitHub will show you the commands. Run these in your terminal:

```bash
# If you have the code locally already:
cd /path/to/clyr-mlm

# If you need to clone from my work:
# Download clyr-mlm-phase3-complete.zip and extract it
unzip clyr-mlm-phase3-complete.zip
cd clyr-mlm

# Initialize git (if not already)
git init

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/clyr-mlm.git

# Or if remote exists, change it:
git remote set-url origin https://github.com/YOUR_USERNAME/clyr-mlm.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 🌊 Step 3: Deploy on DigitalOcean App Platform

### 3.1 Create App

1. Go to https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Select **GitHub** as source
4. Authorize DigitalOcean to access your GitHub
5. Select the `clyr-mlm` repository
6. Branch: `main`

### 3.2 Configure Resources

DigitalOcean will auto-detect resources. Verify:

**Service 1: API (Backend)**
- Name: `api`
- Source Directory: `/server`
- Type: Web Service
- Build Command: `npm install`
- Run Command: `npm start`
- HTTP Port: `5000`
- HTTP Route: `/api`
- Instance Size: Basic ($5/mo) or Basic XXS ($0)

**Service 2: Web (Frontend)**
- Name: `web`
- Source Directory: `/client`
- Type: Static Site
- Build Command: `npm install && npm run build`
- Output Directory: `dist`
- HTTP Route: `/`

### 3.3 Add Database

1. Click **"Add Resource"**
2. Select **"Database"**
3. Choose **PostgreSQL**
4. Plan: Dev Database ($0) or Basic ($15/mo)
5. The `DATABASE_URL` will be automatically injected

### 3.4 Configure Environment Variables

Click on the **API service** → **Environment Variables** and add:

| Key | Value | Type |
|-----|-------|------|
| `NODE_ENV` | `production` | Plain |
| `JWT_SECRET` | (generate random 32+ char string) | Secret |
| `STRIPE_SECRET_KEY` | `sk_live_xxx` or `sk_test_xxx` | Secret |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` | Secret |
| `SMTP_HOST` | Your SMTP server (e.g., smtp.gmail.com) | Secret |
| `SMTP_PORT` | `587` | Plain |
| `SMTP_USER` | Your email | Secret |
| `SMTP_PASS` | Your email password or app password | Secret |
| `SMTP_FROM` | `noreply@yourdomain.com` | Plain |
| `FRONTEND_URL` | `${APP_URL}` | Plain |

Click on the **Web static site** → **Environment Variables** and add:

| Key | Value | Type |
|-----|-------|------|
| `VITE_API_URL` | `${APP_URL}/api` | Build-time |

### 3.5 Deploy

1. Review all settings
2. Click **"Create Resources"**
3. Wait 5-10 minutes for deployment

---

## 🔧 Step 4: Post-Deployment Setup

### 4.1 Run Database Migrations

In the DigitalOcean App console:
1. Go to your app → **Console** tab
2. Select the `api` component
3. Run:
```bash
npm run migrate
npm run seed
```

### 4.2 Create Admin Account

1. Open your app URL
2. Go to `/admin-setup`
3. Create your admin account

### 4.3 Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Endpoint URL: `https://your-app-url.ondigitalocean.app/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the webhook signing secret
6. Update `STRIPE_WEBHOOK_SECRET` in DigitalOcean

---

## 🌐 Step 5: Custom Domain (Optional)

### 5.1 Add Domain in DigitalOcean

1. Go to your app → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain: `clyr.de` or `www.clyr.de`
4. Follow instructions to add DNS records

### 5.2 Update DNS Records

Add these records at your domain registrar:

| Type | Name | Value |
|------|------|-------|
| A | @ | (DigitalOcean IP) |
| CNAME | www | your-app-url.ondigitalocean.app |

### 5.3 Update Environment Variables

After adding custom domain, update:
- `FRONTEND_URL` → `https://clyr.de`
- `VITE_API_URL` → `https://clyr.de/api`

---

## 💰 Estimated Costs

| Resource | Cost |
|----------|------|
| App Platform Basic | $5/mo |
| PostgreSQL Dev | $0/mo |
| **Total** | **$5/mo** |

Or with managed database:
| Resource | Cost |
|----------|------|
| App Platform Basic | $5/mo |
| PostgreSQL Basic | $15/mo |
| **Total** | **$20/mo** |

---

## 🔒 Security Checklist

- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Use production Stripe keys (sk_live_)
- [ ] Enable 2FA on GitHub and DigitalOcean
- [ ] Set repository to Private
- [ ] Never commit .env files (already in .gitignore)

---

## 🐛 Troubleshooting

### Build Fails
- Check Build Logs in DigitalOcean console
- Ensure Node.js version is 18+
- Run `npm install` locally first

### Database Connection Error
- Verify DATABASE_URL is set
- Ensure database is created
- Check if migrations ran successfully

### API Not Responding
- Check Runtime Logs
- Verify PORT is 5000
- Check health endpoint: `/api/health`

### Frontend Shows Blank
- Verify VITE_API_URL is correct
- Check browser console for errors
- Ensure catchall_document is set to `index.html`

---

## 📞 Need Help?

- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- GitHub Support: https://support.github.com/
- Create an issue in your repository

---

**Good luck with your deployment! 🚀**
