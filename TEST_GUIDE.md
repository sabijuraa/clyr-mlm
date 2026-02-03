# CLYR MLM Platform - Complete Test Guide

## 📋 Table of Contents
1. [Account Creation](#account-creation)
2. [Public Pages Tests](#public-pages-tests)
3. [Shopping Flow Tests](#shopping-flow-tests)
4. [Admin Panel Tests](#admin-panel-tests)
5. [Partner Dashboard Tests](#partner-dashboard-tests)
6. [Customer Portal Tests](#customer-portal-tests)
7. [Commission System Tests](#commission-system-tests)
8. [API Tests](#api-tests)
9. [Test Summary](#test-summary)

---

## 🔐 Account Creation

### Method 1: Create Admin Account (First Time Setup)

**URL:** `https://your-domain.com/admin-setup`

This page is only available when no admin exists in the system.

| Field | Description | Example |
|-------|-------------|---------|
| Email | Admin email address | `admin@yourcompany.com` |
| Password | Min 8 chars, 1 uppercase, 1 number | `SecurePass123!` |
| First Name | Admin first name | `John` |
| Last Name | Admin last name | `Smith` |

**Steps:**
1. Open `/admin-setup` in browser
2. Fill in all fields
3. Click "Admin erstellen" (Create Admin)
4. You will be redirected to login page

**Expected Result:** ✅ Admin account created, can login at `/login`

---

### Method 2: Create Partner Account (Registration)

**URL:** `https://your-domain.com/partner-werden`

| Field | Description | Example |
|-------|-------------|---------|
| Email | Partner email | `partner@example.com` |
| Password | Min 8 chars | `Partner123!` |
| First Name | Partner first name | `Maria` |
| Last Name | Partner last name | `Mueller` |
| Phone | Phone number | `+49 170 1234567` |
| Street | Street address | `Hauptstraße 10` |
| ZIP | Postal code | `80333` |
| City | City | `München` |
| Country | DE/AT/CH | `DE` |
| Referral Code | Optional - upline's code | `THERESA` |

**Steps:**
1. Open `/partner-werden`
2. Fill in all required fields
3. Optionally enter a referral code (creates upline relationship)
4. Click "Registrieren"
5. Wait for admin approval OR auto-activate

**Expected Result:** ✅ Partner account created with status "pending" or "active"

---

### Method 3: Create Customer Account (During Checkout or Customer Portal)

**Option A: During Checkout**
1. Add products to cart
2. Go to checkout `/kasse`
3. Check "Kundenkonto erstellen" (Create customer account)
4. Complete order

**Option B: Customer Registration**
**URL:** `https://your-domain.com/kunde/login`

Click "Registrieren" and fill:
| Field | Description | Example |
|-------|-------------|---------|
| Email | Customer email | `customer@example.com` |
| Password | Min 8 chars | `Customer123!` |
| First Name | First name | `Anna` |
| Last Name | Last name | `Schmidt` |

**Expected Result:** ✅ Customer account created, can login at `/kunde/login`

---

### Method 4: Admin Creates Accounts (Admin Panel)

**For Partners:**
1. Login as Admin
2. Go to `/admin/partners`
3. Click "Neuer Partner" (New Partner)
4. Fill in partner details
5. Click "Erstellen"

**For Customers:**
1. Customers are auto-created when they place orders
2. Or import via `/admin/import`

---

## 🧪 Test Sections

---

## 1. PUBLIC PAGES TESTS

### Test 1.1: Homepage
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open `/` | Page loads without errors | ☐ |
| 2 | Check hero section | Hero banner with CTA visible | ☐ |
| 3 | Check products section | Featured products displayed | ☐ |
| 4 | Check testimonials | Customer reviews visible | ☐ |
| 5 | Check footer | Footer with links visible | ☐ |

### Test 1.2: Products Page
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open `/produkte` | Products grid loads | ☐ |
| 2 | Check product cards | Image, name, price visible | ☐ |
| 3 | Click product | Navigates to detail page | ☐ |
| 4 | Check prices | Prices show with € symbol | ☐ |

### Test 1.3: Product Detail Page
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open `/produkte/clyr-home-soda-standard` | Product details load | ☐ |
| 2 | Check images | Product images displayed | ☐ |
| 3 | Check description | Full description visible | ☐ |
| 4 | Check price | Net price + VAT info shown | ☐ |
| 5 | Check "Add to Cart" button | Button is clickable | ☐ |

### Test 1.4: Legal Pages
| Page | URL | Expected Result | Pass/Fail |
|------|-----|-----------------|-----------|
| Privacy | `/datenschutz` | Privacy policy text | ☐ |
| Imprint | `/impressum` | Company details | ☐ |
| Terms | `/agb` | Terms & conditions | ☐ |
| Withdrawal | `/widerruf` | Withdrawal policy | ☐ |

### Test 1.5: Language Toggle
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find language toggle (DE/EN) | Toggle visible in navbar | ☐ |
| 2 | Click "EN" | Page switches to English | ☐ |
| 3 | Click "DE" | Page switches to German | ☐ |

**Public Pages Score: ___ / 15**

---

## 2. SHOPPING FLOW TESTS

### Test 2.1: Add to Cart
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Go to any product | Product page loads | ☐ |
| 2 | Click "In den Warenkorb" | Success notification | ☐ |
| 3 | Check cart icon | Cart count increases | ☐ |
| 4 | Click cart icon | Navigates to cart page | ☐ |

### Test 2.2: Cart Management
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open `/warenkorb` | Cart page loads | ☐ |
| 2 | Check item displayed | Product name, price, quantity | ☐ |
| 3 | Change quantity to 2 | Subtotal doubles | ☐ |
| 4 | Click remove (X) | Item removed from cart | ☐ |
| 5 | Empty cart message | "Warenkorb ist leer" shown | ☐ |

### Test 2.3: Checkout Process
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Add item to cart | Item in cart | ☐ |
| 2 | Click "Zur Kasse" | Checkout page loads | ☐ |
| 3 | Fill customer info | Form accepts input | ☐ |
| 4 | Select country: DE | VAT 19% applied | ☐ |
| 5 | Select country: AT | VAT 20% applied | ☐ |
| 6 | Select country: CH | No VAT (0%) | ☐ |
| 7 | Check shipping cost | Shipping added to total | ☐ |

### Test 2.4: Referral Code at Checkout
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | At checkout, find referral field | Input field visible | ☐ |
| 2 | Enter valid code | Code accepted (green) | ☐ |
| 3 | Enter invalid code | Error message (red) | ☐ |

### Test 2.5: Order Completion
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Fill all checkout fields | No validation errors | ☐ |
| 2 | Click "Bestellung abschließen" | Processing indicator | ☐ |
| 3 | Wait for completion | Success page shown | ☐ |
| 4 | Check order number | Order number displayed | ☐ |

**Shopping Flow Score: ___ / 21**

---

## 3. ADMIN PANEL TESTS

**Prerequisite:** Create admin account via `/admin-setup` first

### Test 3.1: Admin Login
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open `/login` | Login form displayed | ☐ |
| 2 | Enter admin email | Email accepted | ☐ |
| 3 | Enter admin password | Password field masked | ☐ |
| 4 | Click "Anmelden" | Redirects to `/admin` | ☐ |

### Test 3.2: Admin Dashboard
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Check dashboard loads | `/admin` page shows | ☐ |
| 2 | Check stats cards | Sales, orders, partners counts | ☐ |
| 3 | Check recent activity | Activity feed visible | ☐ |
| 4 | Check charts | Sales charts render | ☐ |

### Test 3.3: Partner Management
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Partner" in sidebar | `/admin/partners` loads | ☐ |
| 2 | Check partner list | Table with partners | ☐ |
| 3 | Click "Neuer Partner" | Create partner form | ☐ |
| 4 | Fill partner form | All fields work | ☐ |
| 5 | Save partner | Partner created, in list | ☐ |
| 6 | Edit partner | Click edit, form opens | ☐ |
| 7 | Change status | Activate/deactivate works | ☐ |

### Test 3.4: Product Management
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Produkte" | `/admin/produkte` loads | ☐ |
| 2 | Check product list | All products shown | ☐ |
| 3 | Click "Neues Produkt" | Create form opens | ☐ |
| 4 | Fill product form | Name, price, description | ☐ |
| 5 | Save product | Product created | ☐ |
| 6 | Edit product | Changes save correctly | ☐ |
| 7 | Toggle active status | Product enabled/disabled | ☐ |

### Test 3.5: Order Management
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Bestellungen" | `/admin/bestellungen` loads | ☐ |
| 2 | Check order list | Orders with status shown | ☐ |
| 3 | Click order row | Order detail opens | ☐ |
| 4 | Check order items | Products, quantities, prices | ☐ |
| 5 | Change status to "Processing" | Status updates | ☐ |
| 6 | Change status to "Shipped" | Status updates | ☐ |
| 7 | Add tracking number | Tracking saved | ☐ |

### Test 3.6: Commission Management
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Provisionen" | `/admin/provisionen` loads | ☐ |
| 2 | Check commission list | Commissions with amounts | ☐ |
| 3 | Filter by status | Pending/released filter works | ☐ |
| 4 | Release commission | Click release, status changes | ☐ |
| 5 | Check partner credited | Partner wallet updated | ☐ |

### Test 3.7: CMS Management
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "CMS" | `/admin/cms` loads | ☐ |
| 2 | Edit hero section | Form with current content | ☐ |
| 3 | Change hero title | Save, check homepage | ☐ |
| 4 | Edit testimonials | Can add/edit reviews | ☐ |

### Test 3.8: Settings
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Einstellungen" | `/admin/einstellungen` loads | ☐ |
| 2 | Check company settings | Name, address, VAT ID | ☐ |
| 3 | Check shipping rates | DE/AT/CH rates shown | ☐ |
| 4 | Update shipping rate | Save, checkout reflects | ☐ |
| 5 | Check email settings | SMTP configuration | ☐ |

### Test 3.9: Import Function
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Import" | `/admin/import` loads | ☐ |
| 2 | Download template | CSV template downloads | ☐ |
| 3 | Upload test CSV | File accepted | ☐ |
| 4 | Check import results | Success/error count shown | ☐ |

### Test 3.10: VAT Reports
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "UStVA" | `/admin/ustva` loads | ☐ |
| 2 | Select month | Month selector works | ☐ |
| 3 | Generate report | Report data displayed | ☐ |
| 4 | Export PDF | PDF downloads | ☐ |

**Admin Panel Score: ___ / 47**

---

## 4. PARTNER DASHBOARD TESTS

**Prerequisite:** Create partner account via `/partner-werden`

### Test 4.1: Partner Login
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open `/login` | Login form displayed | ☐ |
| 2 | Enter partner email | Email accepted | ☐ |
| 3 | Enter partner password | Password accepted | ☐ |
| 4 | Click "Anmelden" | Redirects to `/dashboard` | ☐ |

### Test 4.2: Partner Dashboard
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Check dashboard loads | Statistics visible | ☐ |
| 2 | Check wallet balance | Current balance shown | ☐ |
| 3 | Check rank display | Current rank with icon | ☐ |
| 4 | Check sales count | Own sales number | ☐ |
| 5 | Check team sales | Team sales number | ☐ |

### Test 4.3: Referral Links
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Empfehlungen" | `/dashboard/empfehlungen` loads | ☐ |
| 2 | Check referral code | Your code displayed | ☐ |
| 3 | Check referral link | Full URL shown | ☐ |
| 4 | Click copy button | Link copied to clipboard | ☐ |
| 5 | Open copied link | Homepage with ref code in URL | ☐ |

### Test 4.4: Team View
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Team" | `/dashboard/team` loads | ☐ |
| 2 | Check team tree | Downline structure shown | ☐ |
| 3 | Check team member info | Name, rank, sales visible | ☐ |
| 4 | Expand tree node | Sub-partners shown | ☐ |

### Test 4.5: Commissions View
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Provisionen" | `/dashboard/provisionen` loads | ☐ |
| 2 | Check commission list | Date, amount, status | ☐ |
| 3 | Check pending total | Sum of pending commissions | ☐ |
| 4 | Check released total | Sum of released commissions | ☐ |

### Test 4.6: Orders View
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Bestellungen" | `/dashboard/bestellungen` loads | ☐ |
| 2 | Check orders from referrals | Order list shown | ☐ |
| 3 | Click order | Order details visible | ☐ |

### Test 4.7: Customers View
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Kunden" | `/dashboard/kunden` loads | ☐ |
| 2 | Check customer list | Referred customers shown | ☐ |
| 3 | Check customer info | Name, email, orders count | ☐ |

### Test 4.8: Profile Settings
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Click "Profil" | `/dashboard/profil` loads | ☐ |
| 2 | Check current data | Pre-filled form | ☐ |
| 3 | Update phone | New phone saves | ☐ |
| 4 | Update address | New address saves | ☐ |
| 5 | Update bank details | IBAN/BIC saves | ☐ |
| 6 | Change password | Old + new password works | ☐ |

### Test 4.9: Rank Progress
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Check rank widget | Current rank displayed | ☐ |
| 2 | Check progress bar | Progress to next rank | ☐ |
| 3 | Check requirements | What's needed for next rank | ☐ |

**Partner Dashboard Score: ___ / 35**

---

## 5. CUSTOMER PORTAL TESTS

**Prerequisite:** Create customer account or place an order

### Test 5.1: Customer Login
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Open `/kunde/login` | Login form displayed | ☐ |
| 2 | Enter customer email | Email accepted | ☐ |
| 3 | Enter customer password | Password accepted | ☐ |
| 4 | Click "Anmelden" | Redirects to dashboard | ☐ |

### Test 5.2: Customer Dashboard
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Check dashboard | Order summary visible | ☐ |
| 2 | Check profile info | Name, email shown | ☐ |
| 3 | Check order count | Number of orders | ☐ |

### Test 5.3: Order History
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | View orders section | Past orders listed | ☐ |
| 2 | Check order details | Date, total, status | ☐ |
| 3 | Click order | Full order details | ☐ |
| 4 | Check tracking | Tracking info if shipped | ☐ |

### Test 5.4: Reorder Function
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find past order | Order with items | ☐ |
| 2 | Click "Nachbestellen" | Items added to cart | ☐ |
| 3 | Go to cart | Same items in cart | ☐ |

### Test 5.5: GDPR Functions
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Find GDPR section | Data privacy options | ☐ |
| 2 | Request data export | Export initiated | ☐ |
| 3 | Download export | JSON/ZIP file downloads | ☐ |
| 4 | Request deletion | Confirmation required | ☐ |

### Test 5.6: Profile Update
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Edit profile | Form opens | ☐ |
| 2 | Change address | New address saves | ☐ |
| 3 | Change phone | New phone saves | ☐ |

**Customer Portal Score: ___ / 20**

---

## 6. COMMISSION SYSTEM TESTS

### Test 6.1: Direct Sale Commission
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Customer uses partner ref code | Code accepted at checkout | ☐ |
| 2 | Order completed | Order created | ☐ |
| 3 | Check partner commissions | Commission entry created | ☐ |
| 4 | Verify amount | Correct % of order value | ☐ |
| 5 | Check status | Status is "pending" | ☐ |

### Test 6.2: Upline Commission
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Partner A refers Partner B | B's upline is A | ☐ |
| 2 | Partner B makes a sale | Order completed | ☐ |
| 3 | Check Partner B commission | Gets their rank % | ☐ |
| 4 | Check Partner A commission | Gets differential % | ☐ |

### Test 6.3: Admin Share
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Any order placed | Order completed | ☐ |
| 2 | Check admin commissions | Admin gets 50% share | ☐ |

### Test 6.4: Commission Release
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Login as admin | Admin panel | ☐ |
| 2 | Go to commissions | List of pending | ☐ |
| 3 | Click "Freigeben" | Commission released | ☐ |
| 4 | Check partner wallet | Balance increased | ☐ |

### Test 6.5: Rank-Based Rates
| Rank | Expected Rate | Actual Rate | Pass/Fail |
|------|---------------|-------------|-----------|
| Starter | 8% | ___% | ☐ |
| Berater | 22% | ___% | ☐ |
| Senior Berater | 26% | ___% | ☐ |
| Teamleiter | 30% | ___% | ☐ |
| Manager | 33% | ___% | ☐ |
| Verkaufsleiter | 36% | ___% | ☐ |

**Commission System Score: ___ / 20**

---

## 7. API TESTS

Use browser, Postman, or curl to test these endpoints.

**Base URL:** `https://your-domain.com/api`

### Test 7.1: Public Endpoints
| Endpoint | Method | Expected Status | Expected Response | Pass/Fail |
|----------|--------|-----------------|-------------------|-----------|
| `/health` | GET | 200 | `{"status":"ok"}` | ☐ |
| `/products` | GET | 200 | Array of products | ☐ |
| `/products/clyr-home-soda-standard` | GET | 200 | Product object | ☐ |
| `/cms/homepage` | GET | 200 | CMS content | ☐ |

### Test 7.2: Auth Endpoints
| Endpoint | Method | Body | Expected | Pass/Fail |
|----------|--------|------|----------|-----------|
| `/auth/login` | POST | `{email, password}` | JWT token | ☐ |
| `/auth/register` | POST | Partner data | Created user | ☐ |
| `/auth/forgot-password` | POST | `{email}` | Reset email sent | ☐ |

### Test 7.3: Protected Endpoints (Need JWT)
| Endpoint | Method | Expected | Pass/Fail |
|----------|--------|----------|-----------|
| `/partner/stats` | GET | Partner statistics | ☐ |
| `/partner/team` | GET | Team members | ☐ |
| `/partner/commissions` | GET | Commissions list | ☐ |
| `/admin/dashboard` | GET | Admin stats | ☐ |

**API Score: ___ / 12**

---

## 📊 Test Summary

### Score Card

| Section | Tests | Passed | Failed | Score |
|---------|-------|--------|--------|-------|
| Public Pages | 15 | | | /15 |
| Shopping Flow | 21 | | | /21 |
| Admin Panel | 47 | | | /47 |
| Partner Dashboard | 35 | | | /35 |
| Customer Portal | 20 | | | /20 |
| Commission System | 20 | | | /20 |
| API Tests | 12 | | | /12 |
| **TOTAL** | **170** | | | **/170** |

### Pass Rate Calculation
```
Pass Rate = (Total Passed / Total Tests) × 100
Pass Rate = (_____ / 170) × 100 = _____%
```

### Quality Thresholds
| Rate | Status |
|------|--------|
| 95-100% | ✅ Excellent - Production Ready |
| 85-94% | ⚠️ Good - Minor fixes needed |
| 70-84% | ⚠️ Fair - Several issues to address |
| Below 70% | ❌ Needs significant work |

---

## 🐛 Bug Report Template

For any failed test, document:

```
Test ID: [e.g., 3.5.4]
Test Name: [e.g., Change status to "Shipped"]
Steps to Reproduce:
1. 
2. 
3. 

Expected Result:

Actual Result:

Screenshot: [if applicable]

Severity: [ ] Critical [ ] High [ ] Medium [ ] Low
```

---

## 📝 Notes

- Test on multiple browsers (Chrome, Firefox, Safari)
- Test on mobile devices
- Clear cache between test sessions
- Use incognito mode for fresh testing
- Test with slow network (Chrome DevTools → Network → Slow 3G)

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Platform Version:** CLYR MLM 3.0
