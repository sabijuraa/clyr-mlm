-- ============================================
-- CLYR MLM - Group 7 Migration
-- Customer Portal
-- ============================================

-- #42: Customer documents table (installation guides, manuals)
CREATE TABLE IF NOT EXISTS customer_documents (
  id SERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(50) DEFAULT 'installation_guide' 
    CHECK (document_type IN ('installation_guide', 'manual', 'warranty', 'certificate', 'other')),
  file_url VARCHAR(500) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customer_documents_customer ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_product ON customer_documents(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_public ON customer_documents(is_public);

-- #36: Fix subscriptions table - add missing columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'interval_months') THEN
    ALTER TABLE subscriptions ADD COLUMN interval_months INTEGER DEFAULT 12;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'price') THEN
    ALTER TABLE subscriptions ADD COLUMN price DECIMAL(10,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancelled_at') THEN
    ALTER TABLE subscriptions ADD COLUMN cancelled_at TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancel_reason') THEN
    ALTER TABLE subscriptions ADD COLUMN cancel_reason TEXT;
  END IF;
END $$;

-- Fix customers table - ensure all needed columns exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'street') THEN
    ALTER TABLE customers ADD COLUMN street VARCHAR(255);
    -- Migrate from address_line1 if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'address_line1') THEN
      UPDATE customers SET street = address_line1 WHERE street IS NULL AND address_line1 IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Ensure uploads directory exists (handled at app level)
