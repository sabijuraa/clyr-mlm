-- ============================================================
-- CLYR MLM - Theresa Feature Migrations (June 2026)
-- Run once. All statements are idempotent (IF NOT EXISTS).
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CLYR Sets category
-- ────────────────────────────────────────────────────────────
INSERT INTO categories (name, name_en, slug, description, sort_order, is_active)
VALUES ('Sets', 'Sets', 'sets', 'CLYR Produktsets & Bundles', 10, true)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 2. Bundle product support
-- ────────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS bundle_items (
  id         SERIAL PRIMARY KEY,
  bundle_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INTEGER NOT NULL DEFAULT 1,
  UNIQUE (bundle_id, product_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. Affiliate / partner discount pricing
-- ────────────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS partner_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS exclude_from_partner_discount BOOLEAN DEFAULT false;

-- ────────────────────────────────────────────────────────────
-- 4. Italy shipping rate in settings (editable by admin)
-- ────────────────────────────────────────────────────────────
INSERT INTO settings (key, value)
VALUES (
  'shipping_costs',
  '{
    "AT": {"large": 55.00, "small": 9.90},
    "DE": {"large": 70.00, "small": 14.90},
    "CH": {"large": 180.00, "small": 35.00},
    "IT": {"large": 198.00, "small": 198.00},
    "DEFAULT_EU": {"large": 198.00, "small": 198.00}
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE
  SET value = settings.value
      || '{"IT": {"large": 198.00, "small": 198.00}, "DEFAULT_EU": {"large": 198.00, "small": 198.00}}'::jsonb;

-- ────────────────────────────────────────────────────────────
-- 5. Customer notes field on orders (already exists in most
--    deployments; kept here for safety)
-- ────────────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- ────────────────────────────────────────────────────────────
-- 6. Payout cycle setting (1st and 15th)
-- ────────────────────────────────────────────────────────────
INSERT INTO settings (key, value)
VALUES ('payout_days', '[1, 15]'::jsonb)
ON CONFLICT (key) DO NOTHING;
