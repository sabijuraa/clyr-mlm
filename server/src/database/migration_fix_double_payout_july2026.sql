-- ============================================================
-- CLYR MLM - Fix double payout bug (July 2026)
-- Run once. Idempotent.
--
-- Root cause: runStripePayouts() computed a deterministic dedupe
-- key (reference = 'AUTO-YYYY-MM-<partnerId8>') but stored a
-- DIFFERENT value ('STRIPE-<transferId>') once a transfer
-- succeeded, so the "already paid this month" check could never
-- match and the same commissions got paid out again.
--
-- This migration adds a hard DB-level guard so that even if the
-- application-level check is ever bypassed (race condition,
-- concurrent cron runs, retries), Postgres itself refuses to
-- insert a second active payout row with the same
-- (user_id, reference).
-- ============================================================

-- Only one non-cancelled/non-failed payout per user per reference.
-- Partial unique index (cancelled/failed rows are excluded so a
-- retried payout can reuse the same reference after a failure).
CREATE UNIQUE INDEX IF NOT EXISTS uq_payouts_user_reference_active
  ON payouts (user_id, reference)
  WHERE reference IS NOT NULL
    AND status NOT IN ('cancelled', 'failed');
