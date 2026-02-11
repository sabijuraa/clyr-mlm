-- CLYR MLM Platform - Database Diagnostics & Fixes
-- PostgreSQL

-- ================================================
-- 1. CHECK IF TABLES EXIST
-- ================================================
SELECT 
    'Products table' as check_name,
    EXISTS (SELECT FROM pg_tables WHERE tablename = 'products') as exists
UNION ALL
SELECT 
    'Variant options table',
    EXISTS (SELECT FROM pg_tables WHERE tablename = 'variant_options')
UNION ALL
SELECT 
    'Product variants table',
    EXISTS (SELECT FROM pg_tables WHERE tablename = 'product_variants')
UNION ALL
SELECT 
    'Shipping rates table',
    EXISTS (SELECT FROM pg_tables WHERE tablename = 'shipping_rates')
UNION ALL
SELECT 
    'Academy content table',
    EXISTS (SELECT FROM pg_tables WHERE tablename = 'academy_content');

-- ================================================
-- 2. CHECK PRODUCT IMAGES FORMAT
-- ================================================
SELECT 
    id,
    name,
    images,
    CASE 
        WHEN images::text LIKE '[%' THEN 'JSON Array'
        WHEN images::text LIKE '{%' THEN 'JSON Object'
        ELSE 'String or NULL'
    END as image_format
FROM products
LIMIT 10;

-- ================================================
-- 3. CHECK VARIANT OPTIONS
-- ================================================
SELECT 
    'Total variant options' as metric,
    COUNT(*)::text as value
FROM variant_options
UNION ALL
SELECT 
    'Active variant options',
    COUNT(*)::text
FROM variant_options
WHERE is_active = true
UNION ALL
SELECT 
    'Faucet type options',
    COUNT(*)::text
FROM variant_options
WHERE type = 'faucet';

-- ================================================
-- 4. CHECK SHIPPING RATES
-- ================================================
SELECT 
    'Total shipping rates' as metric,
    COUNT(*)::text as value
FROM shipping_rates
UNION ALL
SELECT 
    'Active shipping rates',
    COUNT(*)::text
FROM shipping_rates
WHERE is_active = true
UNION ALL
SELECT 
    'Default shipping rate',
    COUNT(*)::text
FROM shipping_rates
WHERE is_default = true;

-- ================================================
-- 5. CHECK ACADEMY CONTENT
-- ================================================
SELECT 
    'Total academy content' as metric,
    COUNT(*)::text as value
FROM academy_content
UNION ALL
SELECT 
    'Active content',
    COUNT(*)::text
FROM academy_content
WHERE is_active = true;

-- ================================================
-- 6. FIX: Ensure all product images are JSON arrays
-- ================================================
UPDATE products
SET images = '[]'::jsonb
WHERE images IS NULL OR images::text = '' OR images::text = 'null';

-- Convert string images to JSON if needed
UPDATE products
SET images = 
    CASE 
        WHEN images::text NOT LIKE '[%' AND images::text NOT LIKE '{%' 
        THEN ('["' || images::text || '"]')::jsonb
        ELSE images
    END
WHERE images IS NOT NULL;

-- ================================================
-- 7. VERIFY ROUTES ARE ACCESSIBLE (Manual Check)
-- ================================================
-- After running this, test these endpoints:
-- GET  /api/products
-- GET  /api/variants/options
-- GET  /api/shipping/rates
-- GET  /api/academy/admin/all (requires auth)

-- ================================================
-- 8. CHECK USER PERMISSIONS
-- ================================================
SELECT 
    u.id,
    u.email,
    u.role,
    u.status,
    r.name as rank
FROM users u
LEFT JOIN ranks r ON u.rank_id = r.id
WHERE u.role = 'admin'
LIMIT 5;

-- ================================================
-- 9. SEED DEFAULT DATA IF MISSING
-- ================================================

-- Seed shipping rates if none exist
INSERT INTO shipping_rates (name, description, base_rate, free_shipping_threshold, country_code, is_default, is_active, sort_order)
SELECT * FROM (VALUES
    ('Standard Versand Deutschland', 'Standardversand innerhalb Deutschlands', 4.99, 100.00, 'DE', true, true, 1),
    ('Standard Versand Österreich', 'Standardversand nach Österreich', 6.99, 150.00, 'AT', false, true, 2),
    ('Express Versand', 'Expressversand (1-2 Werktage)', 14.99, NULL, NULL, false, true, 3)
) AS v(name, description, base_rate, free_shipping_threshold, country_code, is_default, is_active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM shipping_rates LIMIT 1);

-- Seed faucet variant options if none exist
INSERT INTO variant_options (type, name, name_en, description, price_modifier, sort_order, is_active)
SELECT * FROM (VALUES
    ('faucet', 'L-Auslauf', 'L-Spout', 'Standard L-förmiger Auslauf', 0.00, 1, true),
    ('faucet', 'Spiralfeder Chrom', 'Spring Chrome', 'Premium Spiralfeder-Armatur in Chrom', 250.00, 2, true),
    ('faucet', 'Spiralfeder Schwarz', 'Spring Black', 'Premium Spiralfeder-Armatur in Schwarz', 250.00, 3, true)
) AS v(type, name, name_en, description, price_modifier, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM variant_options WHERE type = 'faucet' LIMIT 1);

-- ================================================
-- 10. FINAL VERIFICATION
-- ================================================
SELECT 'Database checks complete!' as status;

-- Run final counts
SELECT 
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM variant_options) as total_variants,
    (SELECT COUNT(*) FROM shipping_rates) as total_shipping_rates,
    (SELECT COUNT(*) FROM academy_content) as total_academy_content;
