-- Add optional discipleship consent and follow-up workflow without changing existing requests.
-- Apply only after backup and staging verification; no automatic production migration.
ALTER TABLE prayer_requests
  ADD COLUMN IF NOT EXISTS discipleship_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE prayer_requests
  ADD COLUMN IF NOT EXISTS discipleship_follow_up_status text NOT NULL DEFAULT 'not_requested';
