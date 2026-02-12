-- ============================================
-- CLYR MLM - Group 10 Migration
-- Legal Compliance & Contract Rules
-- ============================================

-- #55: Intranet fee tracking columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'intranet_fee_paid_until') THEN
    ALTER TABLE users ADD COLUMN intranet_fee_paid_until DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'intranet_fee_last_payment') THEN
    ALTER TABLE users ADD COLUMN intranet_fee_last_payment DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'intranet_fee_amount') THEN
    ALTER TABLE users ADD COLUMN intranet_fee_amount DECIMAL(10,2) DEFAULT 100.00;
  END IF;
END $$;

-- #50: Termination tracking columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'termination_requested_at') THEN
    ALTER TABLE users ADD COLUMN termination_requested_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'termination_effective_at') THEN
    ALTER TABLE users ADD COLUMN termination_effective_at DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'termination_reason') THEN
    ALTER TABLE users ADD COLUMN termination_reason TEXT;
  END IF;
END $$;

-- #57: Inactivity tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_sale_at') THEN
    ALTER TABLE users ADD COLUMN last_sale_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'inactivity_warning_sent_at') THEN
    ALTER TABLE users ADD COLUMN inactivity_warning_sent_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'auto_terminated_at') THEN
    ALTER TABLE users ADD COLUMN auto_terminated_at TIMESTAMP;
  END IF;
END $$;

-- Compliance settings
INSERT INTO settings (key, value, description) VALUES
  ('termination_notice_months', '3', 'Kuendigungsfrist in Monaten'),
  ('inactivity_termination_months', '12', 'Inaktivitaets-Kuendigung nach X Monaten'),
  ('intranet_fee_yearly', '100', 'Jaehrliche Intranet-Gebuehr in EUR'),
  ('marketplace_restriction_text', '"Der Verkauf von CLYR-Produkten auf Online-Marktplaetzen wie eBay, Amazon, Willhaben und aehnlichen Plattformen ist strengstens untersagt. Verstoesse fuehren zur sofortigen Kuendigung des Partnervertrags."', 'Marktplatz-Verbotstext')
ON CONFLICT (key) DO NOTHING;

-- Intranet fee payments log
CREATE TABLE IF NOT EXISTS intranet_fee_payments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50) DEFAULT 'manual',
  status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'overdue', 'waived')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_intranet_fees_user ON intranet_fee_payments(user_id);

-- Termination requests log
CREATE TABLE IF NOT EXISTS termination_requests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  effective_date DATE NOT NULL,
  reason TEXT,
  requested_by VARCHAR(50) DEFAULT 'partner', -- 'partner', 'admin', 'system'
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_termination_user ON termination_requests(user_id);
