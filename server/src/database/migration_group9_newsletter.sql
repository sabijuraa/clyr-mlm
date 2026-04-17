-- ============================================
-- CLYR MLM - Group 9 Migration
-- Newsletter & Communications
-- ============================================

-- #56: Subdomain usage fee setting
INSERT INTO settings (key, value, description) VALUES
  ('subdomain_fee_enabled', 'true', 'Subdomain-Gebuehr aktiviert'),
  ('subdomain_fee_amount', '144', 'Subdomain-Gebuehr pro Jahr in EUR (netto)'),
  ('subdomain_fee_vat_rate', '0.20', 'MwSt-Satz fuer Subdomain-Gebuehr'),
  ('subdomain_fee_description', '"Optionale personalisierte Subdomain (z.B. ihr-name.clyr.shop). EUR 144,00 + 20% MwSt = EUR 172,80/Jahr."', 'Beschreibung der Subdomain-Gebuehr')
ON CONFLICT (key) DO NOTHING;

-- Add subdomain fields to users table if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subdomain') THEN
    ALTER TABLE users ADD COLUMN subdomain VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subdomain_active') THEN
    ALTER TABLE users ADD COLUMN subdomain_active BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subdomain_paid_until') THEN
    ALTER TABLE users ADD COLUMN subdomain_paid_until DATE;
  END IF;
END $$;

-- Ensure academy_content has seed data for partners
INSERT INTO academy_content (title, slug, description, type, category, content_text, is_required, sort_order)
VALUES
  ('Willkommen bei CLYR', 'welcome', 'Einfuehrung in das CLYR Partnerprogramm', 'article', 'onboarding',
   'Herzlich willkommen als CLYR Partner! In diesem Artikel erfahren Sie alles Wichtige fuer Ihren Start.', true, 1),
  ('Das Provisionssystem', 'commissions-explained', 'So funktionieren Ihre Provisionen', 'article', 'onboarding',
   'CLYR verwendet ein mehrstufiges Provisionssystem. Als Starter erhalten Sie 8% Direktprovision auf Ihre eigenen Verkaeufe...', true, 2),
  ('Produktschulung: CLYR Home Soda', 'product-home-soda', 'Alles ueber unser Hauptprodukt', 'article', 'products',
   'Das CLYR Home Soda System ist unser Premium-Wasseraufbereitungssystem...', false, 3),
  ('Verkaufsleitfaden', 'sales-guide', 'Tipps fuer erfolgreichen Verkauf', 'document', 'sales',
   'Ein erfolgreicher Verkauf beginnt mit dem Verstaendnis der Kundenbeduerfnisse...', false, 4),
  ('Rechtliche Grundlagen', 'legal-basics', 'Was Sie als Partner wissen muessen', 'article', 'compliance',
   'Als CLYR Partner muessen Sie einige rechtliche Grundlagen beachten...', true, 5)
ON CONFLICT (slug) DO NOTHING;
