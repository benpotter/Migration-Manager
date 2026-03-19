-- RCC Migration Manager – Reset (Drop All)
-- ==========================================
-- Run this to wipe the schema before re-running 001_initial_schema.sql

-- 1. Drop triggers
DROP TRIGGER IF EXISTS pages_updated_at ON pages;
DROP TRIGGER IF EXISTS comments_updated_at ON comments;
DROP TRIGGER IF EXISTS profiles_updated_at ON user_profiles;

-- 2. Drop tables (child tables first to respect foreign keys)
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
