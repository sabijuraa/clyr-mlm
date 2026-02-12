-- ============================================
-- GROUP 1 MIGRATION: Commission Plan & Rank System Fix
-- ============================================
-- Run: psql $DATABASE_URL -f database/migration_group1_commissions.sql

BEGIN;

-- ============================================
-- 1. ADD NEW FIELDS TO USERS TABLE
-- ============================================

-- Track when current rank was achieved (for rank decay after 12 months)
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Track last sale date (for 12-month inactivity → rank decay to Consultant)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_sale_at TIMESTAMP;

-- Track how many consecutive months partner qualifies for their rank
-- (Team Leader/Manager/Sales Manager require 3 consecutive qualifying months)
ALTER TABLE users ADD COLUMN IF NOT EXISTS consecutive_qualifying_months INTEGER DEFAULT 0;

-- Track the highest rank ever achieved (for leadership cash bonus tracking)
ALTER TABLE users ADD COLUMN IF NOT EXISTS highest_rank_level INTEGER DEFAULT 1;

-- ============================================
-- 2. MONTHLY SALES SNAPSHOTS TABLE
-- Stores monthly sales data per partner for "3 consecutive months" qualification
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_sales_snapshots (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    personal_sales_count INTEGER DEFAULT 0,
    team_sales_count INTEGER DEFAULT 0,
    team_sales_volume DECIMAL(12,2) DEFAULT 0,
    personal_sales_volume DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT false, -- Met 2 sales/quarter at time of snapshot
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_user ON monthly_sales_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_period ON monthly_sales_snapshots(year, month);

-- ============================================
-- 3. LEADERSHIP CASH BONUS TRACKING TABLE
-- Tracks which one-time leadership bonuses have been awarded
-- €500 (Team Leader), €1000 (Manager), €2000 (Sales Manager) after 3 stable months
-- ============================================
CREATE TABLE IF NOT EXISTS leadership_cash_bonuses (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank_level INTEGER NOT NULL, -- 4=Teamleiter, 5=Manager, 6=Sales Manager
    amount DECIMAL(10,2) NOT NULL,
    commission_id UUID REFERENCES commissions(id),
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, rank_level)
);

-- ============================================
-- 4. BONUS POOL TABLE
-- 2% of total company revenue distributed among active leaders monthly
-- ============================================
CREATE TABLE IF NOT EXISTS bonus_pool_distributions (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    total_revenue DECIMAL(12,2) NOT NULL,
    pool_amount DECIMAL(10,2) NOT NULL, -- 2% of total_revenue
    eligible_leaders INTEGER NOT NULL,
    amount_per_leader DECIMAL(10,2) NOT NULL,
    distributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    distributed_by UUID REFERENCES users(id),
    UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS bonus_pool_payouts (
    id SERIAL PRIMARY KEY,
    distribution_id INTEGER REFERENCES bonus_pool_distributions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    commission_id UUID REFERENCES commissions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(distribution_id, user_id)
);

-- ============================================
-- 5. UPDATE COMMISSIONS CHECK CONSTRAINT
-- Add new commission types: bonus_pool, leadership_cash_bonus
-- ============================================
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_type_check;
ALTER TABLE commissions ADD CONSTRAINT commissions_type_check 
    CHECK (type IN ('admin', 'direct', 'difference', 'leadership_bonus', 'team_volume_bonus', 'rank_bonus', 'bonus_pool', 'leadership_cash_bonus'));

-- ============================================
-- 6. FIX RANK DATA
-- Old: Starter(8%), Berater(22%), Senior Berater(26%), Teamleiter(30%), Manager(33%), Verkaufsleiter(36%)
-- New: Starter(8%), Berater(19%), Fachberater(21%), Teamleiter(25%), Manager(28%), Sales Manager(31%), Admin(36%)
-- ============================================

-- Update existing ranks with correct rates and names
UPDATE ranks SET 
    commission_rate = 8,
    name = 'Starter',
    slug = 'starter',
    min_own_sales = 0,
    min_team_sales = 0,
    min_direct_partners = 0,
    one_time_bonus = 0,
    description = 'Einstiegsrang für neue Partner',
    color = '#94A3B8'
WHERE level = 1;

UPDATE ranks SET 
    commission_rate = 19,
    name = 'Berater',
    slug = 'berater',
    min_own_sales = 1,
    min_team_sales = 0,
    min_direct_partners = 0,
    one_time_bonus = 0,
    description = '1-10 kumulative persönliche Verkäufe oder Maschinenkauf',
    color = '#60A5FA'
WHERE level = 2;

UPDATE ranks SET 
    commission_rate = 21,
    name = 'Fachberater',
    slug = 'fachberater',
    min_own_sales = 11,
    min_team_sales = 0,
    min_direct_partners = 0,
    one_time_bonus = 0,
    description = '11-20 kumulative persönliche Verkäufe',
    color = '#34D399'
WHERE level = 3;

UPDATE ranks SET 
    commission_rate = 25,
    name = 'Teamleiter',
    slug = 'teamleiter',
    min_own_sales = 5,
    min_team_sales = 15,
    min_direct_partners = 0,
    one_time_bonus = 500,
    description = '≥5 persönliche + 15 Team-Verkäufe/Monat für 3 aufeinanderfolgende Monate',
    color = '#FBBF24'
WHERE level = 4;

UPDATE ranks SET 
    commission_rate = 28,
    name = 'Manager',
    slug = 'manager',
    min_own_sales = 0,
    min_team_sales = 30,
    min_direct_partners = 0,
    one_time_bonus = 1000,
    description = '30 Team-Verkäufe/Monat für 3 aufeinanderfolgende Monate',
    color = '#F97316'
WHERE level = 5;

UPDATE ranks SET 
    commission_rate = 31,
    name = 'Sales Manager',
    slug = 'sales-manager',
    min_own_sales = 0,
    min_team_sales = 50,
    min_direct_partners = 0,
    one_time_bonus = 2000,
    description = '50 Team-Verkäufe/Monat für 3 aufeinanderfolgende Monate',
    color = '#EF4444'
WHERE level = 6;

-- Add R7 Admin rank (Theresa only, 36%)
INSERT INTO ranks (name, slug, level, commission_rate, min_own_sales, min_team_sales, min_direct_partners, one_time_bonus, color, description)
VALUES ('Direktor', 'direktor', 7, 36, 0, 0, 0, 0, '#7C3AED', 'Administratorrang - nur für Geschäftsführung')
ON CONFLICT (slug) DO UPDATE SET
    commission_rate = 36,
    level = 7,
    description = 'Administratorrang - nur für Geschäftsführung';

-- Update Theresa's admin user to rank 7
UPDATE users SET rank_id = (SELECT id FROM ranks WHERE level = 7)
WHERE email = 'theresa@clyr.at';

-- ============================================
-- 7. UPDATE COMPANY SETTINGS
-- ============================================
INSERT INTO settings (key, value, description)
VALUES (
    'affiliate_company',
    '{"name": "CLYR Solutions GmbH", "street": "Pappelweg 4b", "zip": "9524", "city": "St. Magdalen", "country": "Österreich", "email": "service@clyr.shop", "website": "www.clyr.shop"}',
    'Company that pays affiliate commissions'
)
ON CONFLICT (key) DO UPDATE SET
    value = '{"name": "CLYR Solutions GmbH", "street": "Pappelweg 4b", "zip": "9524", "city": "St. Magdalen", "country": "Österreich", "email": "service@clyr.shop", "website": "www.clyr.shop"}';

INSERT INTO settings (key, value, description)
VALUES (
    'fulfillment_company',
    '{"name": "CLYR Solutions GmbH", "street": "Holz 33", "zip": "5211", "city": "Lengau", "country": "Österreich", "email": "service@clyr.shop", "website": "www.clyr.shop"}',
    'Company that ships products and issues customer invoices'
)
ON CONFLICT (key) DO UPDATE SET
    value = '{"name": "CLYR Solutions GmbH", "street": "Holz 33", "zip": "5211", "city": "Lengau", "country": "Österreich", "email": "service@clyr.shop", "website": "www.clyr.shop"}';

-- Update bonus pool setting
INSERT INTO settings (key, value, description)
VALUES ('bonus_pool_rate', '{"rate": 2}', 'Bonus pool percentage of total revenue for active leaders')
ON CONFLICT (key) DO UPDATE SET value = '{"rate": 2}';

-- Update rank decay setting
INSERT INTO settings (key, value, description)
VALUES ('rank_decay_months', '{"months": 12}', 'Months of inactivity before rank decays to Berater')
ON CONFLICT (key) DO UPDATE SET value = '{"months": 12}';

COMMIT;

SELECT 'Group 1 Migration completed successfully!' as message;
