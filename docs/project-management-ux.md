# Project Management UX Design

UX specification for multi-project support — project listing, creation, switching, settings, and lifecycle.

---

## URL Structure

Path-based project scoping with `/p/[slug]` prefix:

| Route | Purpose |
|-------|---------|
| `/projects` | Project list (home after login) |
| `/projects/new` | Create new project |
| `/p/[slug]` | Project dashboard |
| `/p/[slug]/tree` | Tree view |
| `/p/[slug]/table` | Table view |
| `/p/[slug]/uri` | URI pattern view |
| `/p/[slug]/analytics` | Migration analytics |
| `/p/[slug]/admin/import` | Excel import |
| `/p/[slug]/admin/users` | User management |
| `/p/[slug]/settings` | Project settings (general) |
| `/p/[slug]/settings/members` | Member management |

The `[projectSlug]` layout resolves the slug, verifies membership, and wraps children in `ProjectProvider`.

---

## Projects List Page (`/projects`)

### Layout

Card grid: 2 columns on desktop, 1 column on mobile.

### Project Card

```
┌──────────────────────────────────────────────┐
│▌ RCC Website Migration                  •••  │  ← color accent left border
│▌ Client: Rogue Community College             │
│▌ roguecc.edu                                 │  ← monospace domain
│▌                                             │
│▌ [Import] [Active]                           │  ← data mode + status badges
│▌                                             │
│▌ ████████████░░░░░░░░ 62%                    │  ← progress bar
│▌                                             │
│▌ 1,247 pages · 42 published · 8 blocked     │  ← quick stats
│▌                                             │
│▌ Admin · Last active 2h ago                  │  ← role + activity
└──────────────────────────────────────────────┘
```

**Status badges:**
- Active: green
- Completed: blue
- Archived: gray

**Three-dot menu:** Open, Settings, Archive/Unarchive, Delete

### Sorting & Filtering

**Sort options:** Name (A-Z), Last Activity, Completion %, Status

**Filters:**
- Status filter: Active / Completed / All
- Show archived toggle (off by default)
- Search by project name or client name

### Empty State

```
┌──────────────────────────────────────────────┐
│                                              │
│         📁 No projects yet                   │
│                                              │
│    Create your first project to get          │
│    started managing content migrations.      │
│                                              │
│         [+ Create Project]                   │
│                                              │
└──────────────────────────────────────────────┘
```

### Header

Simplified navbar on `/projects`:
- No project switcher
- No center navigation links (Tree/Table/URI)
- Just logo + user menu
- "New Project" button in page header (superadmins only)

---

## Project Creation (`/projects/new`)

Single-page form with 4 sections (not a multi-step wizard):

### Section 1: Project Details

```
┌──────────────────────────────────────────────┐
│ Project Details                              │
│                                              │
│ Project Name *                               │
│ [RCC Website Migration              ]        │
│                                              │
│ Client Name                                  │
│ [Rogue Community College             ]       │
│                                              │
│ Domain                                       │
│ [roguecc.edu                         ]       │
│                                              │
│ URL Slug (auto-generated)                    │
│ /p/[rcc-website-migration        ]           │
└──────────────────────────────────────────────┘
```

### Section 2: Data Mode

Radio card group:

```
┌──────────────────────────────────────────────┐
│ How will content enter this project?         │
│                                              │
│ ┌────────────────────────────────────┐       │
│ │ ○ 📥 Import from Excel            │       │
│ │   Upload existing content          │       │
│ │   inventories from spreadsheets    │       │
│ └────────────────────────────────────┘       │
│                                              │
│ ┌────────────────────────────────────┐       │
│ │ ● ✏️  Direct Entry                 │       │
│ │   Build your information           │       │
│ │   architecture from scratch        │       │
│ └────────────────────────────────────┘       │
│                                              │
│ ┌────────────────────────────────────┐       │
│ │ ○ 🔄 Hybrid                       │       │
│ │   Import a base, then add and      │       │
│ │   modify pages directly            │       │
│ │   Note: Can switch to this later   │       │
│ └────────────────────────────────────┘       │
└──────────────────────────────────────────────┘
```

### Section 3: Team Members (Optional, Expandable)

```
┌──────────────────────────────────────────────┐
│ ▸ Team Members (optional)                    │
│                                              │
│ ┌──────────────────┬──────────┬─────┐       │
│ │ Email            │ Role     │     │       │
│ ├──────────────────┼──────────┼─────┤       │
│ │ jane@mac.com     │ Editor ▾ │  ×  │       │
│ │ [email@...]      │ [Role ▾] │ Add │       │
│ └──────────────────┴──────────┴─────┘       │
│                                              │
│ You will be added as Admin automatically.    │
└──────────────────────────────────────────────┘
```

### Section 4: Color

8-10 predefined color circles. Click to select:

```
● ● ● ● ● ● ● ● ● ●
```

### After Creation

- Redirect to `/p/[slug]`
- Show mode-appropriate CTA:
  - Import mode: "Upload your first Excel file"
  - Direct Entry: "Create your first page"
  - Hybrid: Both options shown

---

## Project Switcher (Navbar)

### Trigger Button

Left side of navbar, after logo:

```
[🔵 RCC Website Migra... ▾]
```

- Color dot matching project color
- Project name truncated at 20 chars
- Chevron-down indicator
- Click opens Command dialog

### Command Dialog (Cmd+K)

```
┌──────────────────────────────────────────────┐
│ 🔍 Search projects...                        │
│                                              │
│ Recent                                       │
│   🔵 RCC Website Migration · RCC · Admin    │
│   🟢 COCC Redesign · COCC · Editor          │
│   🟡 SOU Migration · SOU · Viewer           │
│                                              │
│ All Projects                                 │
│   🔵 RCC Website Migration · RCC · Admin    │
│   🟢 COCC Redesign · COCC · Editor          │
│   🟠 KCC Content Audit · KCC · Admin        │
│   🟡 SOU Migration · SOU · Viewer           │
│                                              │
│ ▸ Archived Projects (2)                      │
│                                              │
│ ─────────────────────────────────────────── │
│ + Create New Project                         │
│ ⊞ View All Projects                         │
└──────────────────────────────────────────────┘
```

**Behavior:**
- **Cmd+K** opens from anywhere within a project
- Search filters by project name or client name
- Recent projects stored in `localStorage` (max 3)
- Selecting a project preserves current view: `/p/rcc/tree` → `/p/cocc/tree`
- Arrow keys to navigate, Enter to select

---

## Project Context in Navigation

4 visual indicators of active project:

1. **Navbar switcher** — project name + color dot
2. **Page title breadcrumb** — "RCC Website Migration > Tree View"
3. **Browser tab title** — "Tree View | RCC Website Migration"
4. **Color accent** — 2px top border in project color

### `useProject()` Hook

```typescript
const { project, userRole, dataMode } = useProject();
// project.name, project.slug, project.color, etc.
// userRole: 'admin' | 'editor' | 'viewer'
// dataMode: 'import' | 'direct_entry' | 'hybrid'
```

---

## Per-Project Roles

### Role Definitions

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access: edit pages, manage members, change settings, delete project |
| **Editor** | Edit pages, add comments, use import — cannot manage members or settings |
| **Viewer** | Read-only access, can add comments |

### Global vs. Project Roles

- `user_profiles.is_superadmin` — Organization-level. Can create projects, access all projects, manage global settings.
- `project_members.role` — Per-project. A user can be Admin on one project and Viewer on another.

### Member Management (`/p/[slug]/settings/members`)

```
┌──────────────────────────────────────────────────────────────┐
│ Team Members                              [Invite Member]    │
│                                                              │
│ ┌────────┬──────────────────────┬──────────┬────────┬─────┐ │
│ │ Avatar │ Name                 │ Role     │ Joined │     │ │
│ ├────────┼──────────────────────┼──────────┼────────┼─────┤ │
│ │ 👤     │ Ben Potter           │ Admin ▾  │ Jan 15 │     │ │
│ │        │ ben@mac.com          │          │        │     │ │
│ ├────────┼──────────────────────┼──────────┼────────┼─────┤ │
│ │ 👤     │ Jane Smith           │ Editor ▾ │ Feb 3  │  ×  │ │
│ │        │ jane@mac.com         │          │        │     │ │
│ ├────────┼──────────────────────┼──────────┼────────┼─────┤ │
│ │ 👤     │ Client User          │ Viewer ▾ │ Mar 1  │  ×  │ │
│ │        │ user@roguecc.edu     │          │        │     │ │
│ └────────┴──────────────────────┴──────────┴────────┴─────┘ │
│                                                              │
│ ⚠ Last admin cannot be removed or demoted.                  │
└──────────────────────────────────────────────────────────────┘
```

**Invite flow:**
- Enter email address
- Select role
- If user exists in Supabase, auto-link to project
- If user doesn't exist, send invite email (Supabase Auth invite)

### Auth Helpers

```typescript
// src/lib/auth.ts additions

export async function getProjectRole(projectId: string): Promise<UserRole | null>;
export async function canEditProject(projectId: string): Promise<boolean>;
export async function isProjectAdmin(projectId: string): Promise<boolean>;

// src/hooks/use-project-role.ts
export function useProjectRole() {
  const { userRole, isProjectAdmin, canEdit } = useProject();
  return { userRole, isProjectAdmin, canEdit };
}
```

---

## Project Settings (`/p/[slug]/settings`)

### Sidebar Navigation

```
┌──────────┬───────────────────────────────────┐
│ General  │                                   │
│ Members  │  (content for selected section)   │
│ Data Mode│                                   │
│ Danger   │                                   │
│ Zone     │                                   │
└──────────┴───────────────────────────────────┘
```

### General Settings

- Project Name (text input)
- Client Name (text input)
- Domain (text input)
- URL Slug (text input with warning: "Changing the slug will break existing bookmarks")
- Allowed Email Domains (tag input — restricts which email domains can be invited, e.g., `madcollective.com`, `roguecc.edu`. Leave empty to allow any domain.)
- Project Color (color picker circles)

### Data Mode Settings

- Current mode display with description
- Change mode button with transition rules:
  - **Import → Hybrid**: Always allowed (additive)
  - **Direct Entry → Hybrid**: Always allowed (additive)
  - **Hybrid → Import**: Warning — direct-entry pages won't be removed, but creation UI will be hidden
  - **Hybrid → Direct Entry**: Warning — import UI will be hidden
  - **Import → Direct Entry** or vice versa: Must go through Hybrid first

### Danger Zone

```
┌──────────────────────────────────────────────┐
│ ⚠ Danger Zone                               │
│                                              │
│ Archive Project                              │
│ Project will be read-only and hidden from    │
│ the main project list.                       │
│ [Archive Project]                            │
│                                              │
│ Delete Project                               │
│ Permanently delete this project and all its  │
│ data. This action cannot be undone.          │
│ Type "RCC Website Migration" to confirm:     │
│ [                                    ]       │
│ [Delete Project]  (disabled until match)     │
└──────────────────────────────────────────────┘
```

---

## Project Lifecycle

### States

```
Active ──→ Completed ──→ Archived
  ↑            │              │
  └────────────┘              │
  ↑                           │
  └───────────────────────────┘
```

- **Active**: Full read/write access (default)
- **Completed**: Read-only with blue badge, banner: "This project is marked as complete"
- **Archived**: Read-only, dimmed in UI, hidden from default project list, gray badge

### Read-Only Enforcement

When `project.status !== 'active'`:
- `isReadOnly: true` in `ProjectContext`
- Banner displayed at top of all project pages
- All mutation buttons disabled
- API routes reject mutations with 403

### State Transitions

- **Complete**: Project admins via settings or project card menu
- **Archive**: Project admins via settings Danger Zone
- **Reopen**: Project admins can revert to Active from Completed or Archived

---

## Default/Recent Project & Login Flow

### Post-Login Redirect

1. User logs in → redirect to `/projects`
2. If user has only 1 project → auto-redirect to `/p/[slug]`

### Recent Projects (localStorage)

```typescript
// Key: mm_recent_projects
// Value: Array of { slug, name, lastAccessed } (max 5 entries)

function trackProjectAccess(slug: string, name: string) {
  const recent = JSON.parse(localStorage.getItem('mm_recent_projects') || '[]');
  const filtered = recent.filter((p: any) => p.slug !== slug);
  filtered.unshift({ slug, name, lastAccessed: Date.now() });
  localStorage.setItem('mm_recent_projects', JSON.stringify(filtered.slice(0, 5)));
}
```

---

## Onboarding — Empty Project States

### Import Mode Empty State

```
┌──────────────────────────────────────────────┐
│                                              │
│         📥 Ready to import                   │
│                                              │
│    Upload your content inventory             │
│    spreadsheet to get started.               │
│                                              │
│    [Upload Excel File]                       │
│                                              │
│    Supported: .xlsx, .xls                    │
│    See import template →                     │
└──────────────────────────────────────────────┘
```

### Direct Entry Empty State

```
┌──────────────────────────────────────────────┐
│                                              │
│         ✏️  Start building                    │
│                                              │
│    Create your first page or use a           │
│    template to get started.                  │
│                                              │
│    [+ Create Page]  [Use Template]           │
│                                              │
└──────────────────────────────────────────────┘
```

### Hybrid Empty State

```
┌──────────────────────────────────────────────┐
│                                              │
│    ┌──────────────┐  ┌──────────────┐       │
│    │ 📥 Import    │  │ ✏️  Create    │       │
│    │ Upload Excel │  │ Build from   │       │
│    │ spreadsheet  │  │ scratch      │       │
│    │              │  │              │       │
│    │ [Upload]     │  │ [Create]     │       │
│    └──────────────┘  └──────────────┘       │
│                                              │
└──────────────────────────────────────────────┘
```

### Post-First-Import Tip

After first successful import, show a dismissible banner:

```
💡 Tip: Switch to Hybrid mode in Settings to add and modify pages directly.  [Learn more] [Dismiss]
```

---

## Data Mode Impact on UI

| Feature | Import | Direct Entry | Hybrid |
|---------|--------|-------------|--------|
| Excel upload | ✅ Visible | ❌ Hidden | ✅ Visible |
| Create page buttons | ❌ Hidden | ✅ Visible | ✅ Visible |
| Delete page actions | ❌ Hidden | ✅ Visible | ✅ Visible |
| Batch page creation | ❌ Hidden | ✅ Visible | ✅ Visible |
| Drag-and-drop reorder | ❌ Hidden | ✅ Visible | ✅ Visible |
| Import column mapping | ✅ Visible | ❌ Hidden | ✅ Visible |

---

## New Files to Create

### Pages
| File | Purpose |
|------|---------|
| `src/app/projects/page.tsx` | Projects list |
| `src/app/projects/new/page.tsx` | Create project form |
| `src/app/p/[projectSlug]/layout.tsx` | Project layout (slug resolution, context) |
| `src/app/p/[projectSlug]/page.tsx` | Project dashboard |
| `src/app/p/[projectSlug]/settings/page.tsx` | Project settings |
| `src/app/p/[projectSlug]/settings/members/page.tsx` | Member management |

### Components
| File | Purpose |
|------|---------|
| `src/components/projects/ProjectCard.tsx` | Card for project list |
| `src/components/projects/ProjectForm.tsx` | Creation/edit form |
| `src/components/projects/ProjectSwitcher.tsx` | Cmd+K switcher |
| `src/components/projects/DataModeSelector.tsx` | Radio card group |
| `src/components/providers/ProjectContext.tsx` | React context + provider |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/use-project.ts` | Re-export from context |
| `src/hooks/use-project-role.ts` | Role convenience hook |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/projects/route.ts` | GET (list), POST (create) |
| `src/app/api/projects/[id]/route.ts` | GET, PATCH, DELETE |
| `src/app/api/projects/[id]/members/route.ts` | GET, POST, DELETE |

### Database
| File | Purpose |
|------|---------|
| `supabase/migrations/003_add_projects.sql` | Full migration script |
