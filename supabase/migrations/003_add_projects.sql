-- ============================================================================
-- Migration 003: Add Multi-Project Support
-- ============================================================================
-- Adds projects and project_members tables, adds project_id to existing tables,
-- backfills all data into a default "RCC Website Migration" project.
--
-- This migration is NON-BREAKING: old RLS policies are preserved, and
-- database-level DEFAULTs on project_id mean existing INSERT paths continue
-- working without code changes.
-- ============================================================================

-- ── A. Create projects table ────────────────────────────────────────────────

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  client_name TEXT,
  description TEXT,
  data_mode TEXT NOT NULL DEFAULT 'direct_entry'
    CHECK (data_mode IN ('import', 'direct_entry', 'hybrid')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  color TEXT DEFAULT '#3B82F6',
  allowed_domains TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_status ON projects(status) WHERE status = 'active';

-- ── B. Create project_members table ─────────────────────────────────────────

CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- ── C. Add is_superadmin to user_profiles ───────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN NOT NULL DEFAULT FALSE;

-- ── D. Insert default project ───────────────────────────────────────────────

INSERT INTO projects (id, name, slug, client_name, data_mode)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'RCC Website Migration',
  'rcc',
  'Rogue Community College',
  'import'
);

-- ── E. Add project_id columns (nullable initially) ─────────────────────────

ALTER TABLE pages
  ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE import_logs
  ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE notifications
  ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE user_presence
  ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- ── F. Backfill existing data ───────────────────────────────────────────────

UPDATE pages
  SET project_id = '00000000-0000-0000-0000-000000000001'
  WHERE project_id IS NULL;

UPDATE import_logs
  SET project_id = '00000000-0000-0000-0000-000000000001'
  WHERE project_id IS NULL;

UPDATE notifications
  SET project_id = '00000000-0000-0000-0000-000000000001'
  WHERE project_id IS NULL;

UPDATE user_presence
  SET project_id = '00000000-0000-0000-0000-000000000001'
  WHERE project_id IS NULL;

-- ── G. Enforce NOT NULL, set defaults, update constraints ───────────────────

-- NOT NULL constraints
ALTER TABLE pages ALTER COLUMN project_id SET NOT NULL;

-- Database-level defaults so existing INSERT paths keep working without code changes
ALTER TABLE pages ALTER COLUMN project_id
  SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE import_logs ALTER COLUMN project_id
  SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE notifications ALTER COLUMN project_id
  SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE user_presence ALTER COLUMN project_id
  SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Replace unique constraint: page_id alone → (project_id, page_id)
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_page_id_key;
ALTER TABLE pages ADD CONSTRAINT pages_project_page_id_unique UNIQUE(project_id, page_id);

-- Indexes on project_id
CREATE INDEX idx_pages_project ON pages(project_id);
CREATE INDEX idx_import_logs_project ON import_logs(project_id);
CREATE INDEX idx_notifications_project ON notifications(project_id);

-- ── H. Promote existing admins + backfill project_members ───────────────────

UPDATE user_profiles SET is_superadmin = TRUE WHERE role = 'admin';

-- Ensure specific users are superadmins regardless of current role
UPDATE user_profiles SET is_superadmin = TRUE
WHERE email IN ('ben@madcollective.com');

INSERT INTO project_members (project_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, role
FROM user_profiles
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ── I. Update user_presence primary key ─────────────────────────────────────

ALTER TABLE user_presence DROP CONSTRAINT IF EXISTS user_presence_pkey;
ALTER TABLE user_presence ADD PRIMARY KEY (user_id, project_id);

-- ── J. Add updated_at triggers to new tables ────────────────────────────────
-- Reuses the existing update_updated_at() function from 001_initial_schema.sql

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER project_members_updated_at
  BEFORE UPDATE ON project_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── K. Create RLS helper functions ──────────────────────────────────────────
-- SECURITY DEFINER to avoid infinite RLS recursion when called from policies.
-- STABLE because they only read data and return consistent results within a tx.

CREATE OR REPLACE FUNCTION is_project_member(check_user_id UUID, check_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = check_project_id
      AND user_id = check_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_project_role(
  check_user_id UUID,
  check_project_id UUID,
  required_roles TEXT[]
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = check_project_id
      AND user_id = check_user_id
      AND role = ANY(required_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── L. Enable RLS on new tables + add policies ─────────────────────────────

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- projects: members can view their projects
CREATE POLICY "Members can view projects" ON projects
  FOR SELECT USING (is_project_member(auth.uid(), id));

-- projects: superadmins can create
CREATE POLICY "Superadmins can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_superadmin = TRUE
    )
  );

-- projects: admins + superadmins can update
CREATE POLICY "Admins can update projects" ON projects
  FOR UPDATE USING (
    has_project_role(auth.uid(), id, ARRAY['admin'])
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_superadmin = TRUE
    )
  );

-- project_members: members can view fellow members
CREATE POLICY "Members can view project members" ON project_members
  FOR SELECT USING (is_project_member(auth.uid(), project_id));

-- project_members: admins can manage
CREATE POLICY "Admins can manage members" ON project_members
  FOR ALL USING (has_project_role(auth.uid(), project_id, ARRAY['admin']));

-- ── M. Add realtime for project_members ─────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE project_members;

-- ── N. Note: Old RLS policies are intentionally preserved ───────────────────
-- The existing RLS policies on pages, page_edits, comments, and notifications
-- remain active. They use the global user_profiles.role check which still works.
-- Phase 2 migration (004) will drop these old policies and replace them with
-- project-scoped policies that use the helper functions created above.
