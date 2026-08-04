-- Fix: payout cron idempotency lock race condition
--
-- Root cause: the payout cron lock was a SELECT (check if cycle already ran)
-- followed by a separate INSERT (record that it ran). Two near-simultaneous
-- cron firings — e.g. two app instances briefly overlapping during a deploy —
-- could both pass the SELECT before either INSERT landed, producing two lock
-- rows for the same cycle and letting the payout logic run twice.
--
-- Confirmed live in production: activity_log shows two 'payout_cycle_2026_7'
-- rows (2026-07-01, ~11ms apart) and two 'payout_cycle_2026_8' rows
-- (2026-08-01, ~2ms apart).
--
-- Fix: a partial unique index on (entity_id) scoped to this action, combined
-- with `INSERT ... ON CONFLICT DO NOTHING` in application code (already
-- updated in server/src/index.js). Only one process can ever win the insert;
-- a second concurrent attempt fails the constraint instead of racing.
--
-- Safe to run on a live table — CREATE INDEX CONCURRENTLY does not lock
-- activity_log for writes while it builds.

-- Step 1: Clean up existing duplicate lock rows (created BY the race
-- condition this migration fixes) — keep the earliest row per cycle,
-- delete the rest. These are just log/lock rows, not financial records;
-- deleting the duplicates does not affect any commission or payout data.
DELETE FROM activity_log a
USING activity_log b
WHERE a.action = 'payout_cycle_started'
  AND b.action = 'payout_cycle_started'
  AND a.entity_id = b.entity_id
  AND a.id > b.id;

-- Step 2: Now safe to create the unique index — no duplicates remain.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_payout_cycle_lock
  ON activity_log (entity_id)
  WHERE action = 'payout_cycle_started';
