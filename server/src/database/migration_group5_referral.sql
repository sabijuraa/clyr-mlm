-- ============================================
-- CLYR MLM - Group 5 Migration
-- Referral System & Partner Registration
-- ============================================

-- #40: Add terms_accepted_at to users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'terms_accepted_at') THEN
    ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMP;
  END IF;
END $$;

-- #37: Add subscription tracking columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_status') THEN
    ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'unpaid' CHECK (subscription_status IN ('active', 'unpaid', 'grace', 'expired'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_amount') THEN
    ALTER TABLE users ADD COLUMN subscription_amount DECIMAL(10,2) DEFAULT 100.00;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_prorated') THEN
    ALTER TABLE users ADD COLUMN subscription_prorated DECIMAL(10,2);
  END IF;
END $$;

-- #53: Crossline sponsoring prohibition - enforce unique email per partner tree
-- Already enforced by unique email constraint + no sponsor change on existing accounts

-- #54: Prospect protection table (6-month)
CREATE TABLE IF NOT EXISTS prospect_protection (
  id SERIAL PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prospect_email VARCHAR(255),
  prospect_name VARCHAR(255),
  prospect_phone VARCHAR(50),
  event_type VARCHAR(50) DEFAULT 'open_house' CHECK (event_type IN ('open_house', 'demo', 'consultation', 'referral')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  protection_expires_at TIMESTAMP NOT NULL,
  is_converted BOOLEAN DEFAULT false,
  converted_order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prospect_protection_partner ON prospect_protection(partner_id);
CREATE INDEX IF NOT EXISTS idx_prospect_protection_email ON prospect_protection(prospect_email);
CREATE INDEX IF NOT EXISTS idx_prospect_protection_expires ON prospect_protection(protection_expires_at);

-- #37: Subscription payment tracking table
CREATE TABLE IF NOT EXISTS subscription_payments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'invoice',
  payment_reference VARCHAR(100),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_prorated BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'overdue')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);

-- Settings for subscription fee
INSERT INTO settings (key, value, description)
VALUES (
  'subscription_fee', 
  '{"annual_amount": 100.00, "currency": "EUR", "grace_period_days": 30, "description": "Jaehrliche Intranet-Gebuehr"}',
  'Annual partner subscription fee (Intranet-Gebuehr)'
)
ON CONFLICT (key) DO NOTHING;

-- Settings for prospect protection
INSERT INTO settings (key, value, description)
VALUES (
  'prospect_protection', 
  '{"duration_months": 6, "max_prospects_per_partner": 100}',
  '6-month prospect protection period'
)
ON CONFLICT (key) DO NOTHING;
