-- CLYR MLM Platform Database Schema
-- PostgreSQL - Phase 2 Complete
-- Rebranded from FreshLiving / Still und Laut

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if exist (for clean reset)
DROP TABLE IF EXISTS academy_progress CASCADE;
DROP TABLE IF EXISTS academy_content CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_products CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS referral_clicks CASCADE;
DROP TABLE IF EXISTS discount_codes CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS ranks CASCADE;

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- RANKS TABLE
-- ============================================
CREATE TABLE ranks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    min_own_sales INTEGER NOT NULL DEFAULT 0,
    min_team_sales INTEGER NOT NULL DEFAULT 0,
    min_direct_partners INTEGER NOT NULL DEFAULT 0,
    one_time_bonus DECIMAL(10,2) DEFAULT 0,
    color VARCHAR(50) DEFAULT '#6B7280',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'partner' CHECK (role IN ('admin', 'support', 'accounting', 'partner', 'team_leader')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    
    -- Partner specific
    referral_code VARCHAR(20) UNIQUE,
    upline_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rank_id INTEGER REFERENCES ranks(id) DEFAULT 1,
    
    -- Business info
    company VARCHAR(255),
    vat_id VARCHAR(50),
    is_kleinunternehmer BOOLEAN DEFAULT false, -- Austrian small business rule
    
    -- Address
    street VARCHAR(255),
    zip VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(2) DEFAULT 'DE',
    
    -- Bank details
    iban VARCHAR(50),
    bic VARCHAR(20),
    bank_name VARCHAR(100),
    account_holder VARCHAR(255),
    
    -- Documents
    passport_url VARCHAR(500),
    bank_card_url VARCHAR(500),
    trade_license_url VARCHAR(500),
    
    -- Financial
    wallet_balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0,
    total_paid_out DECIMAL(10,2) DEFAULT 0,
    
    -- Stats
    own_sales_count INTEGER DEFAULT 0,
    own_sales_volume DECIMAL(12,2) DEFAULT 0,
    team_sales_count INTEGER DEFAULT 0,
    team_sales_volume DECIMAL(12,2) DEFAULT 0,
    direct_partners_count INTEGER DEFAULT 0,
    
    -- Quarterly activity tracking
    quarterly_sales_count INTEGER DEFAULT 0,
    last_quarter_reset TIMESTAMP,
    
    -- Subscription
    annual_fee_paid_at TIMESTAMP,
    annual_fee_expires_at TIMESTAMP,
    has_own_machine BOOLEAN DEFAULT false, -- Auto-upgrade to Berater if true
    
    -- Email verification
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    
    -- Password reset
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    
    -- Stripe
    stripe_customer_id VARCHAR(255),
    
    -- Timestamps
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_upline_id ON users(upline_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_country ON users(country);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    description_en TEXT,
    image_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    sku VARCHAR(100) UNIQUE,
    description TEXT,
    description_en TEXT,
    short_description VARCHAR(500),
    short_description_en VARCHAR(500),
    
    -- Pricing (NET prices - VAT added at checkout)
    price DECIMAL(10,2) NOT NULL, -- Net price without VAT
    original_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    
    -- Category
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    product_type VARCHAR(50) DEFAULT 'physical' CHECK (product_type IN ('physical', 'digital', 'subscription', 'service')),
    
    -- Inventory
    stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0, -- Reserved for pending orders
    low_stock_threshold INTEGER DEFAULT 5,
    track_stock BOOLEAN DEFAULT true,
    allow_backorder BOOLEAN DEFAULT false,
    
    -- Media & Details
    images JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    features_en JSONB DEFAULT '[]',
    specifications JSONB DEFAULT '{}',
    
    -- Flags
    is_active BOOLEAN DEFAULT true,
    is_new BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_subscription_eligible BOOLEAN DEFAULT false,
    requires_installation BOOLEAN DEFAULT false,
    
    -- Shipping
    weight DECIMAL(10,2),
    dimensions JSONB, -- {length, width, height}
    is_large_item BOOLEAN DEFAULT false,
    
    -- Subscription specific
    subscription_interval_months INTEGER, -- For subscription products
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_type ON products(product_type);

-- ============================================
-- STOCK MOVEMENTS TABLE (Inventory tracking)
-- ============================================
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL, -- Positive for in, negative for out
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'sale', 'return', 'adjustment', 'reservation', 'release')),
    reference_type VARCHAR(50), -- 'order', 'manual', etc.
    reference_id VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(type);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    
    -- Address
    street VARCHAR(255),
    zip VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(2) DEFAULT 'DE',
    
    -- Business
    company VARCHAR(255),
    vat_id VARCHAR(50),
    
    -- Referral
    referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Auth (for customer portal)
    password_hash VARCHAR(255),
    is_registered BOOLEAN DEFAULT false,
    
    -- Stripe
    stripe_customer_id VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_referred_by ON customers(referred_by);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Customer
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_first_name VARCHAR(100),
    customer_last_name VARCHAR(100),
    customer_phone VARCHAR(50),
    customer_company VARCHAR(255),
    customer_vat_id VARCHAR(50),
    
    -- Billing Address
    billing_street VARCHAR(255),
    billing_zip VARCHAR(20),
    billing_city VARCHAR(100),
    billing_country VARCHAR(2),
    
    -- Shipping Address
    shipping_street VARCHAR(255),
    shipping_zip VARCHAR(20),
    shipping_city VARCHAR(100),
    shipping_country VARCHAR(2),
    
    -- Amounts (all stored as final amounts)
    subtotal DECIMAL(10,2) NOT NULL, -- Net total of items
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    vat_rate DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL, -- Grand total including VAT
    
    -- For reverse charge orders
    is_reverse_charge BOOLEAN DEFAULT false,
    
    -- Partner
    partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referral_code VARCHAR(20),
    discount_code VARCHAR(50),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded', 'disputed')),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
    
    -- Payment
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    -- Shipping
    tracking_number VARCHAR(100),
    shipping_carrier VARCHAR(100),
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Invoice
    invoice_number VARCHAR(50),
    invoice_url VARCHAR(500),
    invoice_generated_at TIMESTAMP,
    
    -- Proxy order (partner orders for elderly customer)
    is_proxy_order BOOLEAN DEFAULT false,
    proxy_partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Notes
    customer_notes TEXT,
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_partner_id ON orders(partner_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    
    -- Snapshot at time of order
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    product_price DECIMAL(10,2) NOT NULL, -- Net price
    product_image VARCHAR(500),
    
    quantity INTEGER NOT NULL DEFAULT 1,
    total DECIMAL(10,2) NOT NULL, -- Net total (price * quantity)
    
    -- For subscription items
    is_subscription BOOLEAN DEFAULT false,
    subscription_interval_months INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ============================================
-- COMMISSIONS TABLE
-- ============================================
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    type VARCHAR(50) NOT NULL CHECK (type IN ('admin', 'direct', 'difference', 'leadership_bonus', 'team_volume_bonus', 'rank_bonus')),
    amount DECIMAL(10,2) NOT NULL,
    rate DECIMAL(5,2), -- Commission rate used
    
    -- Base amount commission was calculated on
    base_amount DECIMAL(10,2),
    
    -- For difference commissions
    source_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'paid', 'cancelled', 'reversed')),
    
    -- Dates
    held_until TIMESTAMP,
    released_at TIMESTAMP,
    paid_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Payout reference
    payout_id UUID,
    
    -- VAT handling for commission statements
    vat_rate DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    gross_amount DECIMAL(10,2), -- amount + vat_amount
    
    description VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commissions_user ON commissions(user_id);
CREATE INDEX idx_commissions_order ON commissions(order_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_type ON commissions(type);
CREATE INDEX idx_commissions_created_at ON commissions(created_at);

-- ============================================
-- PAYOUTS TABLE
-- ============================================
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Amount
    net_amount DECIMAL(10,2) NOT NULL, -- Commission amount
    vat_amount DECIMAL(10,2) DEFAULT 0, -- VAT if applicable
    gross_amount DECIMAL(10,2) NOT NULL, -- Total payout
    
    method VARCHAR(50) DEFAULT 'sepa' CHECK (method IN ('sepa', 'stripe', 'paypal', 'manual')),
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Bank snapshot at time of payout
    iban VARCHAR(50),
    bic VARCHAR(20),
    account_holder VARCHAR(255),
    
    -- SEPA specific
    sepa_reference VARCHAR(100),
    sepa_batch_id VARCHAR(100),
    
    -- Transaction details
    transaction_id VARCHAR(255),
    reference VARCHAR(100),
    failure_reason TEXT,
    
    -- Statement
    statement_number VARCHAR(50),
    statement_url VARCHAR(500),
    statement_generated_at TIMESTAMP,
    
    -- Period
    period_start DATE,
    period_end DATE,
    
    -- Timestamps
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payouts_user ON payouts(user_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_created_at ON payouts(created_at);

-- ============================================
-- INVOICES TABLE (GoBD compliant document storage)
-- ============================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('customer', 'commission_statement')),
    
    -- Related entities
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Document
    pdf_url VARCHAR(500),
    pdf_generated_at TIMESTAMP,
    
    -- Amounts
    net_amount DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    gross_amount DECIMAL(10,2) NOT NULL,
    
    -- VAT handling
    vat_type VARCHAR(50) CHECK (vat_type IN ('standard', 'reverse_charge', 'exempt', 'zero_rated')),
    
    -- GoBD compliance
    hash VARCHAR(64), -- SHA-256 of document
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_partner ON invoices(partner_id);

-- ============================================
-- DISCOUNT CODES TABLE
-- ============================================
CREATE TABLE discount_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'fixed' CHECK (type IN ('fixed', 'percentage')),
    value DECIMAL(10,2) NOT NULL,
    
    partner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    max_uses_per_customer INTEGER DEFAULT 1,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Restrictions
    applicable_products JSONB, -- Array of product IDs, null = all
    applicable_categories JSONB, -- Array of category IDs, null = all
    
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_partner ON discount_codes(partner_id);

-- ============================================
-- REFERRAL CLICKS TABLE
-- ============================================
CREATE TABLE referral_clicks (
    id SERIAL PRIMARY KEY,
    referral_code VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    landing_url VARCHAR(500),
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    
    converted BOOLEAN DEFAULT false,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referral_clicks_code ON referral_clicks(referral_code);
CREATE INDEX idx_referral_clicks_user ON referral_clicks(user_id);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    
    -- Subscription details
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    interval_months INTEGER NOT NULL DEFAULT 12,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    
    -- Dates
    starts_at TIMESTAMP NOT NULL,
    next_billing_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Stripe
    stripe_subscription_id VARCHAR(255),
    
    -- Referral
    partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_at);

-- ============================================
-- ACADEMY CONTENT TABLE
-- ============================================
CREATE TABLE academy_content (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    description_en TEXT,
    
    type VARCHAR(50) NOT NULL CHECK (type IN ('video', 'document', 'article', 'quiz')),
    category VARCHAR(100), -- 'onboarding', 'sales', 'products', 'compliance'
    
    -- Content
    content_url VARCHAR(500), -- Video URL or document URL
    content_text TEXT, -- For articles
    duration_minutes INTEGER, -- For videos
    
    -- Access
    min_rank_level INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT false, -- Required for onboarding
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_academy_content_slug ON academy_content(slug);
CREATE INDEX idx_academy_content_category ON academy_content(category);

-- ============================================
-- ACADEMY PROGRESS TABLE
-- ============================================
CREATE TABLE academy_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES academy_content(id) ON DELETE CASCADE,
    
    status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percent INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, content_id)
);

CREATE INDEX idx_academy_progress_user ON academy_progress(user_id);

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_action ON activity_log(action);
CREATE INDEX idx_activity_created ON activity_log(created_at);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CMS CONTENT TABLE (for homepage/shop editing)
-- ============================================
CREATE TABLE cms_content (
    id SERIAL PRIMARY KEY,
    section VARCHAR(100) NOT NULL, -- 'hero', 'features', 'testimonials', 'cta', etc.
    key VARCHAR(100), -- unique identifier within section
    
    -- Content (German)
    title VARCHAR(255),
    subtitle VARCHAR(500),
    content TEXT,
    
    -- Content (English)
    title_en VARCHAR(255),
    subtitle_en VARCHAR(500),
    content_en TEXT,
    
    -- Media & Links
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    link_text VARCHAR(100),
    link_text_en VARCHAR(100),
    
    -- Extra data
    metadata JSONB DEFAULT '{}',
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cms_section ON cms_content(section);
CREATE UNIQUE INDEX idx_cms_section_key ON cms_content(section, key) WHERE key IS NOT NULL;

-- ============================================
-- VARIANT OPTIONS TABLE (e.g., faucet types)
-- ============================================
CREATE TABLE variant_options (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL, -- 'faucet', 'color', 'size', etc.
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    
    price_modifier DECIMAL(10,2) DEFAULT 0, -- Add/subtract from base price
    image_url VARCHAR(500),
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_variant_options_type ON variant_options(type);

-- ============================================
-- PRODUCT VARIANTS TABLE (links products to options)
-- ============================================
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL REFERENCES variant_options(id) ON DELETE CASCADE,
    
    price_modifier DECIMAL(10,2) DEFAULT 0, -- Override option price modifier
    stock_modifier INTEGER DEFAULT 0, -- Adjust stock for this variant
    sku_suffix VARCHAR(50), -- Append to product SKU
    
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, option_id)
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_cms_content_updated_at BEFORE UPDATE ON cms_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_variant_options_updated_at BEFORE UPDATE ON variant_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academy_content_updated_at BEFORE UPDATE ON academy_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academy_progress_updated_at BEFORE UPDATE ON academy_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON discount_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PHASE 3: GDPR, CUSTOMER PORTAL, IMPORTS
-- ============================================

-- ============================================
-- GDPR REQUESTS TABLE
-- ============================================
CREATE TABLE gdpr_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('export', 'delete', 'rectification')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    
    -- Request details
    reason TEXT,
    requested_data JSONB, -- What data was requested for export
    
    -- Processing
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    processed_at TIMESTAMP,
    export_file_url VARCHAR(500), -- For export requests
    notes TEXT,
    
    -- Verification
    verification_token VARCHAR(255),
    verified_at TIMESTAMP,
    
    expires_at TIMESTAMP, -- Export links expire
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gdpr_requests_email ON gdpr_requests(email);
CREATE INDEX idx_gdpr_requests_status ON gdpr_requests(status);

-- ============================================
-- COOKIE CONSENTS TABLE
-- ============================================
CREATE TABLE cookie_consents (
    id SERIAL PRIMARY KEY,
    visitor_id VARCHAR(255) NOT NULL, -- Browser fingerprint or cookie ID
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Consent categories
    necessary BOOLEAN DEFAULT true, -- Always required
    analytics BOOLEAN DEFAULT false,
    marketing BOOLEAN DEFAULT false,
    preferences BOOLEAN DEFAULT false,
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    consented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cookie_consents_visitor ON cookie_consents(visitor_id);

-- ============================================
-- NEWSLETTER SUBSCRIBERS TABLE
-- ============================================
CREATE TABLE newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed', 'bounced')),
    
    -- Double opt-in
    confirmation_token VARCHAR(255),
    confirmed_at TIMESTAMP,
    
    -- Preferences
    language VARCHAR(2) DEFAULT 'de',
    preferences JSONB DEFAULT '{"promotions": true, "news": true, "tips": true}',
    
    -- Tracking
    source VARCHAR(100), -- 'checkout', 'footer', 'popup', 'partner_registration'
    ip_address VARCHAR(45),
    
    unsubscribed_at TIMESTAMP,
    unsubscribe_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_status ON newsletter_subscribers(status);

-- ============================================
-- EMAIL CAMPAIGNS TABLE
-- ============================================
CREATE TABLE email_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    subject_en VARCHAR(255),
    
    content_html TEXT NOT NULL,
    content_html_en TEXT,
    content_text TEXT,
    
    -- Targeting
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'customers', 'partners', 'newsletter', 'custom')),
    target_filter JSONB, -- Custom filter criteria
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    
    -- Stats
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    unsubscribe_count INTEGER DEFAULT 0,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CREDIT NOTES TABLE
-- ============================================
CREATE TABLE credit_notes (
    id SERIAL PRIMARY KEY,
    credit_note_number VARCHAR(50) UNIQUE NOT NULL, -- GS-2025-0001
    
    -- Reference
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    
    -- Details
    reason TEXT NOT NULL, -- Reason for credit note
    line_items JSONB, -- Items being credited
    
    -- Company issuing (MUTIMBAUCH)
    issuer_name VARCHAR(255) DEFAULT 'MUTIMBAUCH Vertriebs GmbH',
    issuer_address TEXT,
    issuer_vat_id VARCHAR(50),
    
    -- Customer details (snapshot)
    customer_name VARCHAR(255),
    customer_address TEXT,
    customer_vat_id VARCHAR(50),
    customer_country VARCHAR(2),
    
    -- Tax handling
    is_reverse_charge BOOLEAN DEFAULT false,
    is_export BOOLEAN DEFAULT false,
    vat_note TEXT,
    
    -- GoBD compliance
    document_hash VARCHAR(64),
    
    status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'applied', 'cancelled')),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_notes_order ON credit_notes(order_id);
CREATE INDEX idx_credit_notes_customer ON credit_notes(customer_id);

-- ============================================
-- CUSTOMER ACCOUNTS TABLE (for customer portal login)
-- ============================================
CREATE TABLE customer_accounts (
    id SERIAL PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Verification
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    
    -- Password reset
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_accounts_email ON customer_accounts(email);
CREATE INDEX idx_customer_accounts_customer ON customer_accounts(customer_id);

-- ============================================
-- DATA IMPORTS TABLE (for bulk imports)
-- ============================================
CREATE TABLE data_imports (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('partners', 'customers', 'products', 'downlines')),
    
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Stats
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- Errors
    errors JSONB DEFAULT '[]', -- Array of {row, field, message}
    
    -- Options
    options JSONB DEFAULT '{}', -- Import options (skip_duplicates, update_existing, etc.)
    
    -- Mapping (for CSV column mapping)
    column_mapping JSONB,
    
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_imports_status ON data_imports(status);

-- ============================================
-- VAT REPORTS TABLE (for separated DE/AT reports)
-- ============================================
CREATE TABLE vat_reports (
    id SERIAL PRIMARY KEY,
    
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('monthly', 'quarterly', 'annual')),
    country VARCHAR(2) NOT NULL, -- DE, AT
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Totals
    net_sales DECIMAL(12,2) DEFAULT 0,
    vat_collected DECIMAL(12,2) DEFAULT 0,
    reverse_charge_sales DECIMAL(12,2) DEFAULT 0,
    export_sales DECIMAL(12,2) DEFAULT 0,
    
    -- Breakdown by VAT rate
    breakdown JSONB DEFAULT '{}', -- {19: {net: x, vat: y}, 20: {net: x, vat: y}}
    
    -- Commission payouts (for AT reports)
    commission_payouts_net DECIMAL(12,2) DEFAULT 0,
    commission_payouts_vat DECIMAL(12,2) DEFAULT 0,
    
    -- File
    report_file_url VARCHAR(500),
    
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'submitted')),
    finalized_at TIMESTAMP,
    
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_vat_reports_period ON vat_reports(country, report_type, period_start);

-- ============================================
-- PHASE 3 TRIGGERS
-- ============================================
CREATE TRIGGER update_gdpr_requests_updated_at BEFORE UPDATE ON gdpr_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cookie_consents_updated_at BEFORE UPDATE ON cookie_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_newsletter_subscribers_updated_at BEFORE UPDATE ON newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_accounts_updated_at BEFORE UPDATE ON customer_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_imports_updated_at BEFORE UPDATE ON data_imports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vat_reports_updated_at BEFORE UPDATE ON vat_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
