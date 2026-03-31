-- Migration: Convert "blocked" from a status to a flag
-- This preserves the real workflow stage when a page is blocked.

-- Add blocked flag columns
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- Migrate existing blocked pages: set the flag and reset status to not_started
-- (the real stage was lost when blocked was set as a status, so default to not_started)
UPDATE pages
SET is_blocked = TRUE,
    blocked_at = updated_at,
    status = 'not_started'
WHERE status = 'blocked';

-- Create an index for quick blocked page lookups
CREATE INDEX IF NOT EXISTS idx_pages_is_blocked ON pages (is_blocked) WHERE is_blocked = TRUE;
