-- ============================================
-- CLYR MLM - Group 4 Migration
-- Invoice & Commission Statement PDFs
-- ============================================

-- Ensure invoices table has all needed columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'pdf_url') THEN
    ALTER TABLE invoices ADD COLUMN pdf_url TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'pdf_generated_at') THEN
    ALTER TABLE invoices ADD COLUMN pdf_generated_at TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'sent_at') THEN
    ALTER TABLE invoices ADD COLUMN sent_at TIMESTAMP;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'user_id') THEN
    ALTER TABLE invoices ADD COLUMN user_id INTEGER REFERENCES users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'subscription_payment_id') THEN
    ALTER TABLE invoices ADD COLUMN subscription_payment_id INTEGER;
  END IF;
END $$;

DO $$
DECLARE constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'invoices'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%'
    AND pg_get_constraintdef(oid) LIKE '%customer%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE invoices DROP CONSTRAINT %I', constraint_name);
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_type_check
      CHECK (type IN ('customer', 'commission', 'commission_statement', 'fee'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_subscription_payment
ON invoices(subscription_payment_id)
WHERE subscription_payment_id IS NOT NULL;

-- Ensure orders table has invoice columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'invoice_number') THEN
    ALTER TABLE orders ADD COLUMN invoice_number VARCHAR(50);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'invoice_generated_at') THEN
    ALTER TABLE orders ADD COLUMN invoice_generated_at TIMESTAMP;
  END IF;
END $$;

-- Create invoice number generator function if not exists
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_seq INT;
  invoice_num TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN invoice_number LIKE 'RE-' || current_year || '-%' 
      THEN CAST(SUBSTRING(invoice_number FROM LENGTH('RE-' || current_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_seq
  FROM invoices;
  
  invoice_num := 'RE-' || current_year || '-' || LPAD(next_seq::TEXT, 5, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Update company settings with CLYR branding
UPDATE company_settings SET
  company_name = COALESCE(NULLIF(company_name, ''), 'CLYR Solutions GmbH'),
  company_legal_name = COALESCE(NULLIF(company_legal_name, ''), 'CLYR Solutions GmbH'),
  email = COALESCE(NULLIF(email, ''), 'service@clyr.shop'),
  website = COALESCE(NULLIF(website, ''), 'www.clyr.shop'),
  address_line1 = COALESCE(NULLIF(address_line1, ''), 'Pappelweg 4b'),
  postal_code = COALESCE(NULLIF(postal_code, ''), '9524'),
  city = COALESCE(NULLIF(city, ''), 'Villach'),
  country = COALESCE(NULLIF(country, ''), 'AT')
WHERE id = 1;
