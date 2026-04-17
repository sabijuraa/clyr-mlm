-- ============================================
-- CLYR MLM - Group 2 Migration
-- Product CRUD fixes, Shipping, Return Policy
-- ============================================

-- Update shipping rules to match CLYR catalog (flat rates per country)
UPDATE shipping_rules SET 
    shipping_cost = 50.00,
    free_shipping_threshold = NULL,
    estimated_days = '3-5 Werktage',
    country_name = 'Deutschland'
WHERE country = 'DE';

UPDATE shipping_rules SET 
    shipping_cost = 69.00,
    free_shipping_threshold = NULL,
    estimated_days = '3-5 Werktage',
    country_name = 'Oesterreich'
WHERE country = 'AT';

UPDATE shipping_rules SET 
    shipping_cost = 180.00,
    free_shipping_threshold = NULL,
    estimated_days = '5-10 Werktage',
    country_name = 'Schweiz'
WHERE country = 'CH';

-- Add return_policy to settings if not exists
INSERT INTO settings (key, value, description)
VALUES (
    'return_policy',
    '{"days": 14, "condition": "unbenutzt und originalverpackt", "process": "Bitte kontaktieren Sie uns per E-Mail an service@clyr.shop fuer eine Ruecksendegenehmigung. Die Kosten der Ruecksendung traegt der Kaeufer, es sei denn, die Ware ist mangelhaft.", "exclusions": ["Hygieneartikel nach Oeffnung", "Individuell angepasste Produkte"], "contact_email": "service@clyr.shop"}',
    'Return policy configuration (14 day return window per Austrian/EU consumer law)'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Update shipping_costs setting to match catalog flat rates
INSERT INTO settings (key, value, description)
VALUES (
    'shipping_costs',
    '{"DE": {"flat": 50.00}, "AT": {"flat": 69.00}, "CH": {"flat": 180.00}}',
    'Shipping costs per country (flat rates from CLYR catalog)'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Add large_item_shipping setting
INSERT INTO settings (key, value, description)
VALUES (
    'large_item_shipping',
    '{"DE": 50.00, "AT": 69.00, "CH": 180.00, "note": "Large items (water systems) always use flat rate shipping"}',
    'Shipping costs for large items like osmosis systems'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;
