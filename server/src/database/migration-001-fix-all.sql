-- ============================================
-- CLYR MLM Platform - Comprehensive Migration
-- Fixes all missing tables, columns, and constraints
-- ============================================

-- ============================================
-- 1. BRANDING TABLE (missing - needed by branding controller)
-- ============================================
CREATE TABLE IF NOT EXISTS branding (
    id SERIAL PRIMARY KEY,
    -- Logos
    logo_light_url VARCHAR(500),
    logo_dark_url VARCHAR(500),
    favicon_url VARCHAR(500),
    -- Colors
    primary_color VARCHAR(50) DEFAULT '#0EA5E9',
    secondary_color VARCHAR(50) DEFAULT '#1E293B',
    accent_color VARCHAR(50) DEFAULT '#F59E0B',
    -- Fonts
    font_heading VARCHAR(100) DEFAULT 'Inter',
    font_body VARCHAR(100) DEFAULT 'Inter',
    -- Social
    facebook_url VARCHAR(500),
    instagram_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    twitter_url VARCHAR(500),
    youtube_url VARCHAR(500),
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default branding row if none exists
INSERT INTO branding (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================
-- 2. COMPANY_SETTINGS TABLE (missing - needed by invoice service)
-- ============================================
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) DEFAULT 'CLYR Solutions GmbH',
    company_name_short VARCHAR(100) DEFAULT 'CLYR',
    -- Address
    address_line1 VARCHAR(255) DEFAULT 'Pappelweg 4b',
    address_line2 VARCHAR(255),
    postal_code VARCHAR(20) DEFAULT '9524',
    city VARCHAR(100) DEFAULT 'Villach',
    state VARCHAR(100) DEFAULT 'Kärnten',
    country VARCHAR(2) DEFAULT 'AT',
    -- Distribution address
    distribution_address_line1 VARCHAR(255) DEFAULT 'Holz 33',
    distribution_postal_code VARCHAR(20) DEFAULT '5211',
    distribution_city VARCHAR(100) DEFAULT 'Lengau',
    -- Contact
    email VARCHAR(255) DEFAULT 'service@clyr.shop',
    phone VARCHAR(50),
    website VARCHAR(255) DEFAULT 'www.clyr.shop',
    -- Tax
    tax_id VARCHAR(50),          -- Steuernummer
    vat_id VARCHAR(50),          -- UID-Nummer
    commercial_register VARCHAR(100), -- Firmenbuchnummer
    court VARCHAR(100) DEFAULT 'Landesgericht Villach',
    -- Banking
    iban VARCHAR(50),
    bic VARCHAR(20),
    bank_name VARCHAR(100),
    account_holder VARCHAR(255) DEFAULT 'CLYR Solutions GmbH',
    -- Invoice settings
    invoice_prefix VARCHAR(20) DEFAULT 'RE',
    invoice_next_number INTEGER DEFAULT 1,
    commission_statement_prefix VARCHAR(20) DEFAULT 'PG',
    commission_statement_next_number INTEGER DEFAULT 1,
    -- Legal
    managing_director VARCHAR(255) DEFAULT 'Theresa Struger',
    jurisdiction VARCHAR(255) DEFAULT 'Landesgericht Villach',
    applicable_law VARCHAR(100) DEFAULT 'Österreichisches Recht',
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default company settings
INSERT INTO company_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================
-- 3. MONTHLY_SALES_SNAPSHOTS TABLE (missing - needed by commission service)
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_sales_snapshots (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    personal_sales_count INTEGER DEFAULT 0,
    personal_sales_volume DECIMAL(12,2) DEFAULT 0,
    team_sales_count INTEGER DEFAULT 0,
    team_sales_volume DECIMAL(12,2) DEFAULT 0,
    rank_at_snapshot INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_user ON monthly_sales_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_period ON monthly_sales_snapshots(year, month);

-- ============================================
-- 4. LEADERSHIP_CASH_BONUSES TABLE (missing - needed by commission service)
-- ============================================
CREATE TABLE IF NOT EXISTS leadership_cash_bonuses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank_level INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    commission_id UUID REFERENCES commissions(id) ON DELETE SET NULL,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, rank_level)
);

-- ============================================
-- 5. BONUS_POOL_DISTRIBUTIONS TABLE (missing - needed by commission service)
-- ============================================
CREATE TABLE IF NOT EXISTS bonus_pool_distributions (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_revenue DECIMAL(12,2) NOT NULL,
    pool_amount DECIMAL(12,2) NOT NULL,
    eligible_leaders INTEGER DEFAULT 0,
    amount_per_leader DECIMAL(10,2) DEFAULT 0,
    distributed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, month)
);

-- ============================================
-- 6. BONUS_POOL_PAYOUTS TABLE (missing - needed by commission service)
-- ============================================
CREATE TABLE IF NOT EXISTS bonus_pool_payouts (
    id SERIAL PRIMARY KEY,
    distribution_id INTEGER NOT NULL REFERENCES bonus_pool_distributions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    commission_id UUID REFERENCES commissions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. FIX COMMISSIONS TABLE - Add missing types to CHECK constraint
-- ============================================
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_type_check;
ALTER TABLE commissions ADD CONSTRAINT commissions_type_check 
    CHECK (type IN ('admin', 'direct', 'difference', 'leadership_bonus', 'team_volume_bonus', 'rank_bonus', 'leadership_cash_bonus', 'bonus_pool'));

-- ============================================
-- 8. ADD MISSING COLUMNS TO USERS TABLE
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sale_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_achieved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS highest_rank_level INTEGER DEFAULT 1;

-- ============================================
-- 9. ADD MISSING COLUMNS TO INVOICES TABLE
-- ============================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;

-- ============================================
-- 10. LEGAL PAGES TABLE (for admin-editable legal pages)
-- ============================================
CREATE TABLE IF NOT EXISTS legal_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL, -- 'privacy', 'terms', 'imprint', 'withdrawal'
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    content TEXT,
    content_en TEXT,
    is_active BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default legal pages
INSERT INTO legal_pages (slug, title, title_en) VALUES
    ('privacy', 'Datenschutzerklärung', 'Privacy Policy'),
    ('terms', 'Allgemeine Geschäftsbedingungen', 'Terms and Conditions'),
    ('imprint', 'Impressum', 'Imprint'),
    ('withdrawal', 'Widerrufsbelehrung', 'Withdrawal Policy'),
    ('partner-terms', 'Vertriebspartner-Vertrag (AGB)', 'Partner Agreement Terms')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 11. FAQ TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS faq_items (
    id SERIAL PRIMARY KEY,
    question VARCHAR(500) NOT NULL,
    question_en VARCHAR(500),
    answer TEXT NOT NULL,
    answer_en TEXT,
    category VARCHAR(100) DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11b. SHIPPING RULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_rules (
    id SERIAL PRIMARY KEY,
    country VARCHAR(2) NOT NULL,
    country_name VARCHAR(100),
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    free_shipping_threshold DECIMAL(10,2),
    estimated_days VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default shipping rules for DE/AT/CH
INSERT INTO shipping_rules (country, country_name, shipping_cost, free_shipping_threshold, estimated_days) VALUES
    ('DE', 'Deutschland', 9.90, 100, '3-5 Werktage'),
    ('AT', 'Österreich', 9.90, 100, '3-5 Werktage'),
    ('CH', 'Schweiz', 19.90, 200, '5-7 Werktage')
ON CONFLICT DO NOTHING;

-- ============================================
-- 11c. LEGAL DOCUMENTS TABLE (used by settings controller)
-- ============================================
CREATE TABLE IF NOT EXISTS legal_documents (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    content TEXT,
    content_en TEXT,
    version INTEGER DEFAULT 1,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO legal_documents (document_type, title, title_en) VALUES
    ('privacy', 'Datenschutzerklärung', 'Privacy Policy'),
    ('terms', 'Allgemeine Geschäftsbedingungen', 'Terms and Conditions'),
    ('imprint', 'Impressum', 'Imprint'),
    ('withdrawal', 'Widerrufsbelehrung', 'Withdrawal Policy'),
    ('partner-terms', 'Vertriebspartner-Vertrag (AGB)', 'Partner Agreement Terms')
ON CONFLICT (document_type) DO NOTHING;

-- ============================================
-- 12. PARTNER DOCUMENTS TABLE (for affiliate-only docs)
-- ============================================
CREATE TABLE IF NOT EXISTS partner_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    description TEXT,
    description_en TEXT,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50), -- 'pdf', 'doc', 'video', etc.
    category VARCHAR(100) DEFAULT 'general', -- 'installation', 'sales', 'training', etc.
    is_partner_only BOOLEAN DEFAULT true,
    is_customer_visible BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 13. CUSTOMER DOCUMENTS TABLE (installation guides post-purchase)
-- ============================================
CREATE TABLE IF NOT EXISTS customer_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    description TEXT,
    file_url VARCHAR(500) NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    is_post_purchase BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 14. TRIGGERS FOR NEW TABLES
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    -- Only create triggers if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_branding_updated_at') THEN
        CREATE TRIGGER update_branding_updated_at BEFORE UPDATE ON branding FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_company_settings_updated_at') THEN
        CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_monthly_snapshots_updated_at') THEN
        CREATE TRIGGER update_monthly_snapshots_updated_at BEFORE UPDATE ON monthly_sales_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_legal_pages_updated_at') THEN
        CREATE TRIGGER update_legal_pages_updated_at BEFORE UPDATE ON legal_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_faq_items_updated_at') THEN
        CREATE TRIGGER update_faq_items_updated_at BEFORE UPDATE ON faq_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- ============================================
-- 15. INVOICE NUMBER GENERATOR FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    prefix VARCHAR;
    year_str VARCHAR;
BEGIN
    SELECT invoice_prefix, invoice_next_number INTO prefix, next_num FROM company_settings WHERE id = 1;
    IF prefix IS NULL THEN prefix := 'RE'; END IF;
    IF next_num IS NULL THEN next_num := 1; END IF;
    
    year_str := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    UPDATE company_settings SET invoice_next_number = next_num + 1 WHERE id = 1;
    
    RETURN prefix || '-' || year_str || '-' || LPAD(next_num::VARCHAR, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Commission statement number generator
CREATE OR REPLACE FUNCTION generate_commission_statement_number()
RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    prefix VARCHAR;
    year_str VARCHAR;
BEGIN
    SELECT commission_statement_prefix, commission_statement_next_number INTO prefix, next_num FROM company_settings WHERE id = 1;
    IF prefix IS NULL THEN prefix := 'PG'; END IF;
    IF next_num IS NULL THEN next_num := 1; END IF;
    
    year_str := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    UPDATE company_settings SET commission_statement_next_number = next_num + 1 WHERE id = 1;
    
    RETURN prefix || '-' || year_str || '-' || LPAD(next_num::VARCHAR, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 16. TAX CALCULATION HELPER
-- ============================================
CREATE OR REPLACE FUNCTION calculate_vat_rate(
    customer_country VARCHAR(2),
    customer_has_vat_id BOOLEAN DEFAULT false
) RETURNS DECIMAL AS $$
BEGIN
    -- Austria: always 20%
    IF customer_country = 'AT' THEN RETURN 20.00; END IF;
    
    -- Germany with VAT ID: 0% (reverse charge)
    IF customer_country = 'DE' AND customer_has_vat_id THEN RETURN 0.00; END IF;
    
    -- Germany without VAT ID: 19%
    IF customer_country = 'DE' THEN RETURN 19.00; END IF;
    
    -- Switzerland: 8%  
    IF customer_country = 'CH' THEN RETURN 8.00; END IF;
    
    -- Default for other EU: 20% (Austrian VAT)
    RETURN 20.00;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE
-- ============================================
