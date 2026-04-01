-- RCC Migration Manager – Reset (Drop All)
-- ==========================================
-- Run this to wipe the schema before re-running 001_initial_schema.sql

-- 1. Drop tables (child tables first to respect foreign keys)
-- CASCADE also drops any triggers on these tables
-- CASCADE also removes them from the supabase_realtime publication automatically
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_presence CASCADE;
DROP TABLE IF EXISTS import_logs CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS page_edits CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- 3. Drop functions
DROP FUNCTION IF EXISTS update_updated_at();
