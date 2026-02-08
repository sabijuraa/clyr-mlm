# CLYR MLM Platform

A complete MLM (Multi-Level Marketing) platform built with Node.js, React, and PostgreSQL.

## Features

- 🛒 **Online Shop** - Product catalog, cart, checkout with Stripe
- 👥 **MLM System** - Unilevel compensation plan, 6 ranks
- 💰 **Commission Management** - Automatic calculations, holding period, reversals
- 📊 **Partner Dashboard** - Team overview, sales tracking, referral links
- 🔐 **Admin Panel** - Full control over products, orders, partners
- 📄 **PDF Generation** - Invoices, commission statements, credit notes
- 🌍 **Multi-Language** - German & English
- 🇩🇪🇦🇹🇨🇭 **DACH Region** - Proper VAT handling for DE/AT/CH
- 📧 **Email System** - Order confirmations, notifications
- 🔒 **GDPR Compliant** - Data export, deletion, cookie consent

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL
- **Frontend:** React, Vite, TailwindCSS
- **Payments:** Stripe
- **PDF:** PDFKit
- **Auth:** JWT

---

## 🚀 Quick Deploy to DigitalOcean

### Option 1: DigitalOcean App Platform (Recommended)

1. **Fork/Push to GitHub**
   ```bash
   git clone https://github.com/YOUR_USERNAME/clyr-mlm.git
   cd clyr-mlm
   ```

2. **Go to DigitalOcean App Platform**
   - Visit: https://cloud.digitalocean.com/apps
   - Click "Create App"
   - Select "GitHub" and authorize
   - Choose your `clyr-mlm` repository

3. **Configure Services**
   The app will auto-detect the `app.yaml` spec file, or configure manually:

   **API Service:**
   - Source Directory: `/server`
   - Build Command: `npm install`
   - Run Command: `npm start`
   - HTTP Port: `5000`
   - Route: `/api`

   **Static Site (Frontend):**
   - Source Directory: `/client`
   - Build Command: `npm install && npm run build`
   - Output Directory: `dist`
   - Route: `/`

4. **Add Environment Variables**
   In the DigitalOcean dashboard, add these secrets:

   | Variable | Description |
   |----------|-------------|
   | `DATABASE_URL` | PostgreSQL connection string |
   | `JWT_SECRET` | Random 32+ char string |
   | `STRIPE_SECRET_KEY` | Your Stripe secret key |
   | `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
   | `SMTP_HOST` | Email server host |
   | `SMTP_USER` | Email username |
   | `SMTP_PASS` | Email password |

5. **Add Database**
   - In Resources, click "Add Resource"
   - Select "Database" → PostgreSQL
   - The `DATABASE_URL` will be auto-injected

6. **Deploy!**
   Click "Create Resources" and wait for deployment.

### Option 2: DigitalOcean Droplet (Manual)

1. **Create a Droplet**
   - Ubuntu 22.04
   - Basic plan ($6/mo minimum)
   - Add your SSH key

2. **SSH into your droplet**
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Install dependencies**
   ```bash
   # Update system
   apt update && apt upgrade -y

   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs

   # Install PostgreSQL
   apt install -y postgresql postgresql-contrib

   # Install nginx
   apt install -y nginx

   # Install PM2
   npm install -g pm2

   # Install certbot for SSL
   apt install -y certbot python3-certbot-nginx
   ```

4. **Setup PostgreSQL**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE clyr_mlm;
   CREATE USER clyr_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE clyr_mlm TO clyr_user;
   \q
   ```

5. **Clone and setup application**
   ```bash
   cd /var/www
   git clone https://github.com/YOUR_USERNAME/clyr-mlm.git
   cd clyr-mlm

   # Setup backend
   cd server
   cp .env.example .env
   nano .env  # Edit with your values
   npm install
   npm run migrate
   npm run seed

   # Setup frontend
   cd ../client
   cp .env.example .env
   nano .env  # Set VITE_API_URL
   npm install
   npm run build
   ```

6. **Configure Nginx**
   ```bash
   nano /etc/nginx/sites-available/clyr
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Frontend
       location / {
           root /var/www/clyr-mlm/client/dist;
           try_files $uri $uri/ /index.html;
       }

       # API Proxy
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   ```bash
   ln -s /etc/nginx/sites-available/clyr /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

7. **Start with PM2**
   ```bash
   cd /var/www/clyr-mlm/server
   pm2 start src/index.js --name clyr-api
   pm2 save
   pm2 startup
   ```

8. **Setup SSL**
   ```bash
   certbot --nginx -d your-domain.com
   ```

---

## 📁 Project Structure

```
clyr-mlm/
├── server/                 # Backend API
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, validation
│   │   ├── database/       # Schema, migrations
│   │   └── index.js        # Entry point
│   ├── uploads/            # File storage
│   └── package.json
│
├── client/                 # Frontend React App
│   ├── src/
│   │   ├── components/     # Reusable UI
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   ├── hooks/          # Custom hooks
│   │   └── App.jsx         # Main app
│   └── package.json
│
├── app.yaml               # DigitalOcean App spec
├── docker-compose.yml     # Docker deployment
└── README.md
```

---

## 🔧 Environment Variables

### Server (.env)

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=password
SMTP_FROM=noreply@clyr.de
FRONTEND_URL=https://your-domain.com
```

### Client (.env)

```env
VITE_API_URL=https://your-domain.com/api
```

---

## 📝 Initial Setup After Deployment

1. **Run database migrations**
   ```bash
   cd server
   npm run migrate
   ```

2. **Seed initial data (ranks, settings)**
   ```bash
   npm run seed
   ```

3. **Create admin account**
   - Visit: `https://your-domain.com/admin-setup`
   - Create your first admin user

4. **Configure Stripe Webhook**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `charge.refunded`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

---

## 🛡️ Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use strong database password
- [ ] Enable SSL/HTTPS
- [ ] Configure CORS for your domain
- [ ] Set up rate limiting
- [ ] Enable firewall (ufw)
- [ ] Regular backups

---

## 📞 Support

For issues or questions, please open a GitHub issue.

---

## 📄 License

MIT License - feel free to use for your own projects.
