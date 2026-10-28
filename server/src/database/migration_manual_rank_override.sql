-- Existing affiliates continue automatic progression until an admin sets a rank.
ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_rank_override BOOLEAN NOT NULL DEFAULT false;
