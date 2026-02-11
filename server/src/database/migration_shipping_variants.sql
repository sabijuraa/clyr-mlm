-- Migration: Add Shipping Rates and Enhanced Variant Features
-- PostgreSQL

-- ============================================
-- SHIPPING RATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shipping_rates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    free_shipping_threshold DECIMAL(10,2),
    country_code VARCHAR(2), -- NULL = applies to all
    min_weight_kg DECIMAL(10,2),
    max_weight_kg DECIMAL(10,2),
    estimated_days_min INTEGER,
    estimated_days_max INTEGER,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipping_rates_country ON shipping_rates(country_code);
CREATE INDEX idx_shipping_rates_active ON shipping_rates(is_active);

-- ============================================
-- ORDER ITEM VARIANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_item_variants (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER NOT NULL,
    option_id INTEGER NOT NULL REFERENCES variant_options(id),
    variant_type VARCHAR(100),
    variant_name VARCHAR(255),
    price_modifier DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_item_variants_item ON order_item_variants(order_item_id);

-- ============================================
-- ACADEMY ENHANCEMENTS
-- ============================================
ALTER TABLE academy_content 
ADD COLUMN IF NOT EXISTS file_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS file_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS file_size_kb INTEGER,
ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- ============================================
-- CMS CONTENT TABLE (for legal pages)
-- ============================================
CREATE TABLE IF NOT EXISTS cms_content (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    meta_description TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_shipping_rates_updated_at 
BEFORE UPDATE ON shipping_rates 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA: Default Shipping Rates
-- ============================================
INSERT INTO shipping_rates (name, description, base_rate, free_shipping_threshold, country_code, is_default, is_active, sort_order)
VALUES 
    ('Standard Versand Deutschland', 'Standardversand innerhalb Deutschlands, Lieferung in 2-4 Werktagen', 4.99, 100.00, 'DE', true, true, 1),
    ('Standard Versand Österreich', 'Standardversand nach Österreich, Lieferung in 3-5 Werktagen', 6.99, 150.00, 'AT', false, true, 2),
    ('Express Versand', 'Expressversand (1-2 Werktage)', 14.99, NULL, NULL, false, true, 3)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED DATA: CLYR Soda Variants
-- ============================================
-- Insert faucet type options (if not exist)
INSERT INTO variant_options (type, name, name_en, description, price_modifier, sort_order, is_active)
VALUES 
    ('faucet', 'L-Auslauf', 'L-Spout', 'Standard L-förmiger Auslauf', 0.00, 1, true),
    ('faucet', 'Spiralfeder Chrom', 'Spring Chrome', 'Premium Spiralfeder-Armatur in Chrom', 250.00, 2, true),
    ('faucet', 'Spiralfeder Schwarz', 'Spring Black', 'Premium Spiralfeder-Armatur in Schwarz', 250.00, 3, true)
ON CONFLICT DO NOTHING;

-- Link to CLYR Soda product (assuming product_id = 1, adjust as needed)
-- You'll need to run this manually with the correct product_id:
-- INSERT INTO product_variants (product_id, option_id, is_default, is_active)
-- SELECT 1, id, (name = 'L-Auslauf'), true FROM variant_options WHERE type = 'faucet'
-- ON CONFLICT (product_id, option_id) DO NOTHING;

-- ============================================
-- SEED DATA: Legal Pages
-- ============================================
INSERT INTO cms_content (slug, title, content, is_published)
VALUES 
    ('privacy-policy', 'Datenschutzerklärung', '<h1>Datenschutzerklärung</h1><p>Ihre Privatsphäre ist uns wichtig...</p>', true),
    ('terms-of-service', 'Allgemeine Geschäftsbedingungen', '<h1>AGB</h1><p>Willkommen bei CLYR...</p>', true),
    ('imprint', 'Impressum', '<h1>Impressum</h1><p>Angaben gemäß § 5 TMG...</p>', true),
    ('withdrawal', 'Widerrufsbelehrung', '<h1>Widerrufsbelehrung</h1><p>Sie haben das Recht...</p>', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- SEED DATA: System Settings
-- ============================================
INSERT INTO system_settings (key, value, description)
VALUES 
    ('company_name', 'CLYR GmbH', 'Firmenname'),
    ('company_email', 'info@clyr.de', 'Kontakt E-Mail'),
    ('company_phone', '+49 123 456789', 'Telefonnummer'),
    ('default_vat_rate', '19', 'Standard MwSt-Satz (%)'),
    ('invoice_prefix', 'INV', 'Rechnungsnummer-Präfix'),
    ('logo_url', '/uploads/branding/logo.png', 'Logo URL'),
    ('primary_color', '#2563EB', 'Primärfarbe'),
    ('secondary_color', '#10B981', 'Sekundärfarbe')
ON CONFLICT (key) DO NOTHING;
