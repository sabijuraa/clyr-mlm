-- CLYR MLM - Complete Database Migration
-- Run once: psql $DATABASE_URL -f database/migration.sql

BEGIN;

-- 1. BRANDING TABLE
CREATE TABLE IF NOT EXISTS branding (
  id SERIAL PRIMARY KEY,
  logo_light_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#1e40af',
  secondary_color VARCHAR(7) DEFAULT '#3b82f6',
  accent_color VARCHAR(7) DEFAULT '#f59e0b',
  font_heading VARCHAR(100) DEFAULT 'Inter',
  font_body VARCHAR(100) DEFAULT 'Inter',
  facebook_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO branding (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 2. LEGAL DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS legal_documents (
  id SERIAL PRIMARY KEY,
  document_type VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  effective_date DATE DEFAULT CURRENT_DATE,
  last_updated TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER REFERENCES users(id)
);

INSERT INTO legal_documents (document_type, title, content) VALUES
('privacy', 'Datenschutzerklärung', '<h1>Datenschutzerklärung</h1><p>Hier können Sie Ihre Datenschutzerklärung eingeben...</p>'),
('terms', 'Allgemeine Geschäftsbedingungen', '<h1>AGB</h1><p>Hier können Sie Ihre AGB eingeben...</p>'),
('imprint', 'Impressum', '<h1>Impressum</h1><p>Hier können Sie Ihr Impressum eingeben...</p>'),
('returns', 'Widerrufsbelehrung', '<h1>Widerrufsbelehrung</h1><p>Hier können Sie Ihre Widerrufsbelehrung eingeben...</p>')
ON CONFLICT (document_type) DO NOTHING;

-- 3. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  customer_id INTEGER REFERENCES customers(id),
  subtotal DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  tax_amount DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_date DATE,
  status VARCHAR(20) DEFAULT 'draft',
  pdf_url TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 4. INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  order_index INTEGER
);

-- 5. INVOICE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS invoice_settings (
  id SERIAL PRIMARY KEY,
  invoice_prefix VARCHAR(10) DEFAULT 'INV',
  invoice_counter INTEGER DEFAULT 1,
  payment_terms_days INTEGER DEFAULT 14,
  footer_text TEXT DEFAULT 'Vielen Dank für Ihren Einkauf!',
  vat_notice TEXT DEFAULT 'Alle Preise inkl. MwSt.',
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO invoice_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 6. COMPANY SETTINGS TABLE
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL DEFAULT 'CLYR',
  company_legal_name VARCHAR(255),
  tax_id VARCHAR(100),
  registration_number VARCHAR(100),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Deutschland',
  phone VARCHAR(50),
  email VARCHAR(255),
  support_email VARCHAR(255),
  bank_name VARCHAR(255),
  iban VARCHAR(50),
  bic VARCHAR(20),
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO company_settings (id, company_name, email) VALUES (1, 'CLYR', 'info@clyr.de') ON CONFLICT DO NOTHING;

-- 7. SHIPPING RULES TABLE
CREATE TABLE IF NOT EXISTS shipping_rules (
  id SERIAL PRIMARY KEY,
  country VARCHAR(100) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) NOT NULL,
  free_shipping_threshold DECIMAL(10,2),
  estimated_days VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO shipping_rules (country, shipping_cost, free_shipping_threshold, estimated_days) VALUES
('Deutschland', 4.99, 50.00, '2-3 Werktage'),
('Österreich', 6.99, 75.00, '3-5 Werktage'),
('Schweiz', 9.99, 100.00, '4-7 Werktage')
ON CONFLICT DO NOTHING;

-- 8. MEDIA LIBRARY TABLE
CREATE TABLE IF NOT EXISTS media (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  alt_text VARCHAR(255),
  caption TEXT,
  folder VARCHAR(100) DEFAULT 'general',
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. UPDATE PRODUCTS TABLE
ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 10. UPDATE CUSTOMERS TABLE
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255);

-- 11. INVOICE NUMBER GENERATOR FUNCTION
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR AS $$
DECLARE
  settings RECORD;
  year_part VARCHAR(4);
  number_part VARCHAR(10);
  new_number VARCHAR(50);
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
  SELECT * INTO settings FROM invoice_settings WHERE id = 1 FOR UPDATE;
  number_part := LPAD(settings.invoice_counter::VARCHAR, 4, '0');
  new_number := settings.invoice_prefix || '-' || year_part || '-' || number_part;
  UPDATE invoice_settings SET invoice_counter = invoice_counter + 1 WHERE id = 1;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 12. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 13. UPDATE EXISTING DATA
UPDATE products SET images = jsonb_build_array(image_url) 
WHERE images = '[]'::jsonb AND image_url IS NOT NULL;

UPDATE products SET category_id = 1 WHERE category_id IS NULL;

UPDATE users SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL AND role = 'partner';

COMMIT;

SELECT 'Migration completed successfully!' as message;