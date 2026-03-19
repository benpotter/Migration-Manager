-- RCC Migration Manager – Initial Schema
-- =========================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pages (core content tracker)
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  slug TEXT,
  source_url TEXT,
  content_draft_url TEXT,
  page_style TEXT,
  design_file_url TEXT,
  content_notes TEXT,
  content_responsibility TEXT,
  content_author TEXT,
  content_approver TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  migration_owner TEXT,
  migrator TEXT,
  mc_template TEXT,
  parent_page_id TEXT,
  depth INT NOT NULL DEFAULT 1,
  sort_order INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pages_parent ON pages(parent_page_id);
CREATE INDEX idx_pages_responsibility ON pages(content_responsibility);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_depth ON pages(depth);
CREATE INDEX idx_pages_archived ON pages(is_archived) WHERE is_archived = FALSE;

-- Edit audit log
CREATE TABLE page_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edits_page ON page_edits(page_id);
CREATE INDEX idx_edits_user ON page_edits(user_id);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_page ON comments(page_id);

-- Import log
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  rows_imported INT DEFAULT 0,
  rows_updated INT DEFAULT 0,
  rows_created INT DEFAULT 0,
  errors JSONB,
  imported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User presence
CREATE TABLE user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_page_id UUID REFERENCES pages(id),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  page_id UUID REFERENCES pages(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: pages
CREATE POLICY "Authenticated users can read pages" ON pages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors and admins can update pages" ON pages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')));

CREATE POLICY "Admins can insert pages" ON pages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS Policies: user_profiles
CREATE POLICY "Authenticated users can read profiles" ON user_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- RLS Policies: page_edits
CREATE POLICY "Authenticated users can read edits" ON page_edits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors can create edits" ON page_edits
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')));

-- RLS Policies: comments
CREATE POLICY "Authenticated users can read comments" ON comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Editors can create comments" ON comments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor')));

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS Policies: notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pages;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- Triggers: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
