-- ============================================================
-- CLYR MLM: Fix team tree hierarchy based on Theresa's input
-- Run this ONCE on DigitalOcean PostgreSQL console
-- ============================================================
-- 
-- Structure (per Theresa 12.04.2026):
--   Theresa (admin/root)
--     ├── Diana Petrik                    [Level 1]
--     │   └── Christina Glatz             [Level 2]
--     │       ├── Rebecca Treitler        [Level 3]
--     │       └── Lisa Maria Seiwald      [Level 3]
--     ├── Marcel Baumeister               [Level 1]
--     │   └── Petra Heumann               [Level 2]
--     └── (all other partners)            [Level 1 - direct under Theresa]
-- ============================================================

BEGIN;

-- Show current state BEFORE fix (for verification)
\echo '=== BEFORE FIX ==='
SELECT u.first_name, u.last_name, u.email,
       up.first_name || ' ' || up.last_name AS current_upline,
       r.name AS rank
FROM users u
LEFT JOIN users up ON u.upline_id = up.id
LEFT JOIN ranks r ON u.rank_id = r.id
WHERE u.role IN ('partner', 'admin')
ORDER BY u.created_at;

-- ============================================================
-- Step 1: Get Theresa's ID (the root)
-- ============================================================
DO $$
DECLARE
  theresa_id UUID;
  diana_id UUID;
  christina_id UUID;
  marcel_id UUID;
BEGIN
  -- Find Theresa
  SELECT id INTO theresa_id FROM users 
  WHERE role = 'admin' AND (email ILIKE '%theresa%' OR first_name ILIKE 'theresa')
  ORDER BY created_at ASC LIMIT 1;

  IF theresa_id IS NULL THEN
    RAISE EXCEPTION 'Theresa not found! Cannot continue.';
  END IF;

  RAISE NOTICE 'Theresa ID: %', theresa_id;

  -- ============================================================
  -- Step 2: Set ALL partners to upline = Theresa initially
  -- (safe default — then we override for specific sub-trees below)
  -- ============================================================
  UPDATE users 
  SET upline_id = theresa_id 
  WHERE role = 'partner';

  RAISE NOTICE 'Reset all partners under Theresa (default)';

  -- ============================================================
  -- Step 3: Set up the specific sub-trees
  -- ============================================================

  -- Find Diana Petrik
  SELECT id INTO diana_id FROM users 
  WHERE role = 'partner' 
    AND (
      (LOWER(first_name) LIKE 'diana%' AND LOWER(last_name) LIKE 'petrik%')
      OR email ILIKE '%petrik%'
      OR email ILIKE '%diana%'
    )
  LIMIT 1;

  IF diana_id IS NOT NULL THEN
    RAISE NOTICE 'Diana Petrik ID: %', diana_id;
    
    -- Find Christina Glatz → under Diana
    SELECT id INTO christina_id FROM users 
    WHERE role = 'partner' 
      AND (
        (LOWER(first_name) LIKE 'christin%' AND LOWER(last_name) LIKE 'glatz%')
        OR email ILIKE '%glatz%'
      )
    LIMIT 1;

    IF christina_id IS NOT NULL THEN
      UPDATE users SET upline_id = diana_id WHERE id = christina_id;
      RAISE NOTICE 'Christina Glatz moved under Diana';

      -- Rebecca Treitler + Lisa Maria Seiwald under Christina
      UPDATE users 
      SET upline_id = christina_id
      WHERE role = 'partner' 
        AND (
          (LOWER(first_name) LIKE 'rebecca%' AND LOWER(last_name) LIKE 'treitler%')
          OR email ILIKE '%treitler%'
        );
      RAISE NOTICE 'Rebecca Treitler moved under Christina';

      UPDATE users 
      SET upline_id = christina_id
      WHERE role = 'partner' 
        AND (
          (LOWER(first_name) LIKE 'lisa%' AND LOWER(last_name) LIKE 'seiwald%')
          OR email ILIKE '%seiwald%'
        );
      RAISE NOTICE 'Lisa Maria Seiwald moved under Christina';
    ELSE
      RAISE NOTICE 'WARN: Christina Glatz not found';
    END IF;
  ELSE
    RAISE NOTICE 'WARN: Diana Petrik not found';
  END IF;

  -- Marcel Baumeister → direct under Theresa (default is already Theresa, no change needed)
  -- Petra Heumann → under Marcel
  SELECT id INTO marcel_id FROM users 
  WHERE role = 'partner' 
    AND (
      (LOWER(first_name) LIKE 'marcel%' AND LOWER(last_name) LIKE 'baumeister%')
      OR email ILIKE '%baumeister%'
    )
  LIMIT 1;

  IF marcel_id IS NOT NULL THEN
    RAISE NOTICE 'Marcel Baumeister ID: %', marcel_id;
    UPDATE users 
    SET upline_id = marcel_id
    WHERE role = 'partner' 
      AND (
        (LOWER(first_name) LIKE 'petra%' AND LOWER(last_name) LIKE 'heumann%')
        OR email ILIKE '%heumann%'
      );
    RAISE NOTICE 'Petra Heumann moved under Marcel';
  ELSE
    RAISE NOTICE 'WARN: Marcel Baumeister not found';
  END IF;

  -- Theresa herself should have NO upline (she's root)
  UPDATE users SET upline_id = NULL WHERE id = theresa_id;
  RAISE NOTICE 'Theresa set as root (no upline)';

END $$;

-- ============================================================
-- Step 4: Recalculate direct_partners_count for all users
-- ============================================================
UPDATE users u SET direct_partners_count = (
  SELECT COUNT(*) FROM users WHERE upline_id = u.id AND role = 'partner'
);

-- ============================================================
-- Step 5: Show result AFTER fix (for verification)
-- ============================================================
\echo ''
\echo '=== AFTER FIX ==='
SELECT u.first_name, u.last_name, u.email,
       up.first_name || ' ' || up.last_name AS upline,
       r.name AS rank,
       u.direct_partners_count AS directs
FROM users u
LEFT JOIN users up ON u.upline_id = up.id
LEFT JOIN ranks r ON u.rank_id = r.id
WHERE u.role IN ('partner', 'admin')
ORDER BY 
  CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END,
  up.first_name,
  u.first_name;

-- ============================================================
-- Commit the changes
-- ============================================================
COMMIT;

\echo ''
\echo 'Done! Tree hierarchy updated. Hard-refresh the browser to see changes.'
