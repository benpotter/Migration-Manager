# Multi-Project Architecture

Technical specification for adding multi-project support to the RCC Migration Manager.

---

## Database Schema Changes

### New Table: `projects`

```sql
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
```

### New Table: `project_members`

```sql
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
```

### Modified Tables

**`pages`** — Add project foreign key:
```sql
ALTER TABLE pages ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
-- After backfill:
ALTER TABLE pages ALTER COLUMN project_id SET NOT NULL;
-- Drop old unique constraint on page_id, replace with composite:
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_page_id_key;
ALTER TABLE pages ADD CONSTRAINT pages_project_page_id_unique UNIQUE(project_id, page_id);
```

**`import_logs`** — Add project FK:
```sql
ALTER TABLE import_logs ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
```

**`user_presence`** — Add project FK, change PK:
```sql
ALTER TABLE user_presence DROP CONSTRAINT user_presence_pkey;
ALTER TABLE user_presence ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE user_presence ADD PRIMARY KEY (user_id, project_id);
```

**`notifications`** — Add project FK:
```sql
ALTER TABLE notifications ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
```

**`user_profiles`** — Add superadmin flag:
```sql
ALTER TABLE user_profiles ADD COLUMN is_superadmin BOOLEAN DEFAULT FALSE;
```

---

## RLS Policies

### Helper Functions

```sql
CREATE OR REPLACE FUNCTION user_has_project_role(p_project_id UUID, p_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_is_project_member(p_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Policy Definitions

**`projects`**:
```sql
-- Anyone can see projects they're a member of
CREATE POLICY "Members can view their projects" ON projects
  FOR SELECT USING (user_is_project_member(id));

-- Superadmins can create projects
CREATE POLICY "Superadmins can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_superadmin = TRUE)
  );

-- Project admins + superadmins can update
CREATE POLICY "Admins can update projects" ON projects
  FOR UPDATE USING (
    user_has_project_role(id, ARRAY['admin'])
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_superadmin = TRUE)
  );
```

**`pages`**:
```sql
CREATE POLICY "Members can view project pages" ON pages
  FOR SELECT USING (user_is_project_member(project_id));

CREATE POLICY "Editors can insert pages" ON pages
  FOR INSERT WITH CHECK (user_has_project_role(project_id, ARRAY['admin', 'editor']));

CREATE POLICY "Editors can update pages" ON pages
  FOR UPDATE USING (user_has_project_role(project_id, ARRAY['admin', 'editor']));

CREATE POLICY "Admins can delete pages" ON pages
  FOR DELETE USING (user_has_project_role(project_id, ARRAY['admin']));
```

**`project_members`**:
```sql
CREATE POLICY "Members can view project members" ON project_members
  FOR SELECT USING (user_is_project_member(project_id));

CREATE POLICY "Admins can manage members" ON project_members
  FOR ALL USING (user_has_project_role(project_id, ARRAY['admin']));
```

**`comments`**:
```sql
CREATE POLICY "Members can view comments" ON comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pages WHERE pages.id = comments.page_id AND user_is_project_member(pages.project_id))
  );

CREATE POLICY "Members can add comments" ON comments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM pages WHERE pages.id = comments.page_id AND user_is_project_member(pages.project_id))
  );
```

Same pattern applies to `page_edits` and `notifications`.

---

## URL Restructuring

| Current Route | New Route |
|---------------|-----------|
| `/` | `/projects` (project list) |
| `/` (dashboard) | `/p/[projectSlug]` |
| `/tree` | `/p/[projectSlug]/tree` |
| `/table` | `/p/[projectSlug]/table` |
| `/uri` | `/p/[projectSlug]/uri` |
| `/admin/import` | `/p/[projectSlug]/admin/import` |
| `/admin/users` | `/p/[projectSlug]/admin/users` |
| `/analytics` | `/p/[projectSlug]/analytics` |
| N/A | `/projects/new` |
| N/A | `/p/[projectSlug]/settings` |
| N/A | `/p/[projectSlug]/settings/members` |

---

## File Structure Changes

```
src/app/
├── projects/
│   ├── page.tsx                    # Project list
│   └── new/
│       └── page.tsx                # Create project
├── p/
│   └── [projectSlug]/
│       ├── layout.tsx              # Project layout (resolves slug, provides context)
│       ├── page.tsx                # Project dashboard
│       ├── tree/
│       │   └── page.tsx
│       ├── table/
│       │   └── page.tsx
│       ├── uri/
│       │   └── page.tsx
│       ├── analytics/
│       │   └── page.tsx
│       ├── admin/
│       │   ├── import/
│       │   │   └── page.tsx
│       │   └── users/
│       │       └── page.tsx
│       └── settings/
│           ├── page.tsx            # General settings
│           └── members/
│               └── page.tsx
├── auth/
│   ├── login/
│   ├── callback/
│   └── error/
└── api/
    ├── projects/
    │   ├── route.ts                # GET (list), POST (create)
    │   └── [id]/
    │       ├── route.ts            # GET, PATCH, DELETE
    │       └── members/
    │           └── route.ts        # GET, POST, DELETE
    └── p/
        └── [projectId]/
            ├── pages/
            │   ├── route.ts        # GET, POST
            │   ├── [id]/
            │   │   └── route.ts    # GET, PUT, DELETE
            │   ├── tree/
            │   │   └── route.ts
            │   ├── stats/
            │   │   └── route.ts
            │   ├── reorder/
            │   │   └── route.ts    # PATCH
            │   └── batch/
            │       └── route.ts    # POST
            ├── comments/
            │   ├── route.ts
            │   └── [id]/
            │       └── route.ts
            └── import/
                └── route.ts
```

---

## ProjectContext Provider

```typescript
// src/components/providers/ProjectContext.tsx

export interface ProjectContextValue {
  project: Project;
  userRole: UserRole;
  isProjectAdmin: boolean;
  canEdit: boolean;
  isReadOnly: boolean;  // true if archived or completed
  dataMode: DataMode;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  project,
  userRole,
  children,
}: {
  project: Project;
  userRole: UserRole;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({
    project,
    userRole,
    isProjectAdmin: userRole === 'admin',
    canEdit: userRole === 'admin' || userRole === 'editor',
    isReadOnly: project.status !== 'active',
    dataMode: project.data_mode,
  }), [project, userRole]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
}
```

### Project Layout (Server Component)

```typescript
// src/app/p/[projectSlug]/layout.tsx

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectSlug: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Resolve slug to project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', params.projectSlug)
    .single();

  if (!project) notFound();

  // Check membership
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect('/projects');

  return (
    <ProjectProvider project={project} userRole={membership.role}>
      {children}
    </ProjectProvider>
  );
}
```

---

## API Route Scoping Pattern

### Shared Helpers

```typescript
// src/lib/project-auth.ts

export async function getProjectMembership(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single();

  return membership ? { user, role: membership.role } : null;
}

export async function requireProjectRole(
  projectId: string,
  roles: string[]
) {
  const membership = await getProjectMembership(projectId);
  if (!membership) {
    return NextResponse.json({ error: 'Not a project member' }, { status: 403 });
  }
  if (!roles.includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return membership;
}
```

### Example: Project-Scoped Pages Route

```typescript
// src/app/api/p/[projectId]/pages/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const membership = await getProjectMembership(params.projectId);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('project_id', params.projectId)
    .order('sort_order');

  // ... rest of handler
}
```

---

## Auth Refactoring

### Three-Layer Model

1. **Supabase Auth** — Is the user authenticated?
2. **Global Role** — `user_profiles.is_superadmin` — Can create projects, manage all
3. **Per-Project Role** — `project_members.role` — What can the user do in this project?

### Updated Auth Helpers

```typescript
// src/lib/auth.ts

export async function isSuperadmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single();

  return profile?.is_superadmin ?? false;
}

export async function getProjectRole(projectId: string): Promise<UserRole | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single();

  return membership?.role ?? null;
}

export async function canEditProject(projectId: string): Promise<boolean> {
  const role = await getProjectRole(projectId);
  return role === 'admin' || role === 'editor';
}

export async function isProjectAdmin(projectId: string): Promise<boolean> {
  const role = await getProjectRole(projectId);
  return role === 'admin';
}
```

### Domain-Based Access Control

Projects can restrict membership to specific email domains via `allowed_domains`:

```typescript
// When inviting a member
const emailDomain = email.split('@')[1];
if (project.allowed_domains.length > 0 && !project.allowed_domains.includes(emailDomain)) {
  throw new Error('Email domain not allowed for this project');
}
```

---

## Realtime Subscription Scoping

```typescript
// src/lib/supabase/realtime.ts

export function subscribeToProjectPages(projectId: string, callback: (payload: any) => void) {
  const supabase = createBrowserClient();

  return supabase
    .channel(`project-pages-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pages',
        filter: `project_id=eq.${projectId}`,
      },
      callback
    )
    .subscribe();
}

// Same pattern for comments, user_presence, notifications
```

---

## TypeScript Type Changes

### New Types

```typescript
// src/types/index.ts

export type DataMode = 'import' | 'direct_entry' | 'hybrid';

export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  slug: string;
  client_name: string | null;
  description: string | null;
  data_mode: DataMode;
  status: ProjectStatus;
  color: string;
  allowed_domains: string[];
  settings: Record<string, unknown>;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithRole extends Project {
  userRole: UserRole;
}
```

### Modified Types

```typescript
// PageRow — add project_id
export interface PageRow {
  // ... existing fields
  project_id: string;
}

// UserProfile — add is_superadmin
export interface UserProfile {
  // ... existing fields
  is_superadmin: boolean;
}
```

---

## Auto-Generation of `page_id`

For Direct Entry mode, page IDs are auto-generated based on parent context:

```typescript
function generatePageId(parentPageId: string | null, siblingCount: number): string {
  const nextIndex = siblingCount + 1;
  if (!parentPageId) return String(nextIndex);
  return `${parentPageId}.${nextIndex}`;
}
```

---

## Migration SQL

Full migration script at `supabase/migrations/003_add_projects.sql`:

```sql
-- Step 1: Create projects table
-- (see schema above)

-- Step 2: Create project_members table
-- (see schema above)

-- Step 3: Create default project for existing data
INSERT INTO projects (id, name, slug, client_name, data_mode, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'RCC Website Migration',
  'rcc',
  'Rogue Community College',
  'import',
  NOW()
);

-- Step 4: Add project_id to pages (nullable first)
ALTER TABLE pages ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Step 5: Backfill existing pages
UPDATE pages SET project_id = '00000000-0000-0000-0000-000000000001';

-- Step 6: Make project_id NOT NULL
ALTER TABLE pages ALTER COLUMN project_id SET NOT NULL;

-- Step 7: Update unique constraints
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_page_id_key;
ALTER TABLE pages ADD CONSTRAINT pages_project_page_id_unique UNIQUE(project_id, page_id);

-- Step 8: Add project_id to other tables + backfill
ALTER TABLE import_logs ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
UPDATE import_logs SET project_id = '00000000-0000-0000-0000-000000000001';

ALTER TABLE notifications ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
UPDATE notifications SET project_id = '00000000-0000-0000-0000-000000000001';

-- Step 9: Add is_superadmin to user_profiles
ALTER TABLE user_profiles ADD COLUMN is_superadmin BOOLEAN DEFAULT FALSE;
-- Promote existing admins to superadmin
UPDATE user_profiles SET is_superadmin = TRUE WHERE role = 'admin';

-- Step 10: Migrate existing users to project_members
INSERT INTO project_members (project_id, user_id, role)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id,
  role
FROM user_profiles;

-- Step 11: Update user_presence
ALTER TABLE user_presence DROP CONSTRAINT IF EXISTS user_presence_pkey;
ALTER TABLE user_presence ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
UPDATE user_presence SET project_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE user_presence ADD PRIMARY KEY (user_id, project_id);

-- Step 12: Create RLS helper functions
-- (see RLS section above)

-- Step 13: Drop old RLS policies and create new project-scoped ones
-- (see RLS section above)

-- Step 14: Create indexes
CREATE INDEX idx_pages_project ON pages(project_id);
CREATE INDEX idx_import_logs_project ON import_logs(project_id);
CREATE INDEX idx_notifications_project ON notifications(project_id);
```

---

## Component Impact Summary

| Component | Change Required |
|-----------|----------------|
| `Navbar.tsx` | Add ProjectSwitcher, project color accent, conditional nav links |
| `SiteTree.tsx` | Pass project_id to API calls, add creation/deletion UI |
| `TreeNode.tsx` | Add drag handle, context menu, inline rename |
| `TreeControls.tsx` | Add "Add Page" button (conditional on data mode) |
| `PageTable.tsx` | Pass project_id, add ghost row, bulk actions |
| `columns.tsx` | Add inline editing, context menu column |
| `PageDetailPanel.tsx` | Make all fields editable, add Structure tab, Danger Zone |
| `ExcelUploader.tsx` | Include project_id in import payload |
| `UserPresence.tsx` | Filter by project_id |
| `auth.ts` | Add project role helpers, superadmin check |
| `realtime.ts` | Filter subscriptions by project_id |
| `types/index.ts` | Add Project, ProjectMember types; modify PageRow |
