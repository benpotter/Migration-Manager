-- =============================================================================
-- Test Seed Data (public tables only)
-- =============================================================================
-- Deterministic UUIDs matching __tests__/fixtures.ts.
-- Applied on every `supabase db reset`.
--
-- IMPORTANT: Auth users must be created FIRST via:
--   npx tsx scripts/seed-test-users.ts
-- Then run: supabase db reset
-- Or use the combined command: npm run db:reset
-- =============================================================================

-- ── User Profiles ───────────────────────────────────────────────────────────

INSERT INTO user_profiles (id, email, name, role, is_superadmin) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner@test.com', 'Test Owner', 'admin', TRUE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'editor@test.com', 'Test Editor', 'editor', FALSE),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'other@test.com', 'Test Other', 'viewer', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── Test Project ────────────────────────────────────────────────────────────

INSERT INTO projects (id, name, slug, client_name, data_mode, status, created_by) VALUES
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Test Project',
    'test-project',
    'Test Client',
    'direct_entry',
    'active',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Project Members ─────────────────────────────────────────────────────────

INSERT INTO project_members (project_id, user_id, role) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'editor')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ── Test Pages ──────────────────────────────────────────────────────────────

INSERT INTO pages (id, page_id, name, project_id, status, depth) VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '1',
    'Test Page One',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'not_started',
    1
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '2',
    'Test Page Two',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'drafting',
    1
  )
ON CONFLICT (id) DO NOTHING;

-- ── Test Comments ───────────────────────────────────────────────────────────

INSERT INTO comments (id, page_id, user_id, content) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Test comment by owner'
  )
ON CONFLICT (id) DO NOTHING;
