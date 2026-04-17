-- ============================================
-- CLYR MLM - Group 3 Migration
-- Tax Calculation & Country Rules
-- ============================================

-- Ensure orders table has reverse charge columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_reverse_charge') THEN
    ALTER TABLE orders ADD COLUMN is_reverse_charge BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'vat_note') THEN
    ALTER TABLE orders ADD COLUMN vat_note TEXT;
  END IF;
END $$;

-- Update VAT rates to correct values
-- DE: 19% (0% with VAT ID = reverse charge)
-- AT: 20% (always, home country)
-- CH: 8.1% (Swiss MwSt)
INSERT INTO settings (key, value, description)
VALUES (
    'vat_rates',
    '{"DE": 19, "AT": 20, "CH": 8.1}',
    'VAT rates per country. DE: 19% B2C / 0% B2B reverse charge. AT: 20% always. CH: 8.1% Swiss.'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Add allowed_countries setting for territory restriction
INSERT INTO settings (key, value, description)
VALUES (
    'allowed_countries',
    '["DE", "AT", "CH"]',
    'Countries where CLYR products can be sold and partners can register'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Add commission_vat_rules setting
INSERT INTO settings (key, value, description)
VALUES (
    'commission_vat_rules',
    '{"AT_with_uid": {"rate": 20, "display": "separate", "note": "20% USt. wird separat ausgewiesen"}, "AT_without_uid": {"rate": 20, "display": "included", "note": "Inkl. 20% USt."}, "DE": {"rate": 0, "display": "none", "note": "Steuerschuldnerschaft des Leistungsempfaengers"}, "CH": {"rate": 0, "display": "none", "note": "Nicht steuerbar (Drittland)"}}',
    'How commission VAT is displayed for affiliates by country/UID status'
)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description;

-- Ensure shipping_rules table has correct country names
UPDATE shipping_rules SET country_name = 'Deutschland' WHERE country = 'DE';
UPDATE shipping_rules SET country_name = 'Oesterreich' WHERE country = 'AT';
UPDATE shipping_rules SET country_name = 'Schweiz' WHERE country = 'CH';
