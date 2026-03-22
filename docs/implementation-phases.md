# Implementation Phases

Phased rollout plan for multi-project support and direct data entry. Each phase is designed to be deployable independently — the app remains functional after each phase.

---

## Phase 1: Database Migration (Non-Breaking)

**Goal:** Add multi-project schema without breaking existing functionality.

### Tasks

1. **Create migration file** `supabase/migrations/003_add_projects.sql`
2. **Create `projects` table** with slug, client_name, data_mode, status, color, allowed_domains, settings
3. **Create `project_members` table** with project_id, user_id, role (admin/editor/viewer)
4. **Create default project:**
   ```sql
   INSERT INTO projects (id, name, slug, client_name, data_mode)
   VALUES ('00000000-0000-0000-0000-000000000001', 'RCC Website Migration', 'rcc', 'Rogue Community College', 'import');
   ```
5. **Add `project_id`** (nullable) to: `pages`, `import_logs`, `notifications`
6. **Backfill** all existing rows with the default project ID
7. **Make `project_id` NOT NULL** after backfill
8. **Update constraints:** Drop `pages_page_id_key`, add `UNIQUE(project_id, page_id)`
9. **Add `is_superadmin`** to `user_profiles`, promote existing admins
10. **Migrate users** to `project_members` (copy role from user_profiles)
11. **Update `user_presence`** — add project_id, change PK to composite
12. **Create RLS helper functions:** `user_has_project_role()`, `user_is_project_member()`
13. **Add new RLS policies** for project-scoped access (keep old policies during transition)
14. **Create indexes** on project_id columns

### Verification
- Existing app still works (old RLS policies still active)
- New tables exist and are populated
- All existing data has project_id set

### Dependencies
- None (first phase)

### Risk
- Low — additive changes only, no existing behavior modified

---

## Phase 2: API Layer (Project-Scoped Routes)

**Goal:** Create project-scoped API routes alongside existing routes.

### Tasks

1. **Create shared helpers** `src/lib/project-auth.ts`:
   - `getProjectMembership(projectId)` — returns `{ user, role }` or null
   - `requireProjectRole(projectId, roles[])` — returns membership or 403 response
2. **Create project CRUD routes:**
   - `GET /api/projects` — list user's projects
   - `POST /api/projects` — create project (superadmin only)
   - `GET /api/projects/[id]` — get project details
   - `PATCH /api/projects/[id]` — update project (admin only)
   - `DELETE /api/projects/[id]` — delete project (admin only, confirm)
3. **Create project member routes:**
   - `GET /api/projects/[id]/members` — list members
   - `POST /api/projects/[id]/members` — invite member
   - `DELETE /api/projects/[id]/members` — remove member
4. **Create project-scoped data routes** under `/api/p/[projectId]/`:
   - `pages/route.ts` — GET (list), POST (create)
   - `pages/[id]/route.ts` — GET, PUT, DELETE (with cascade option)
   - `pages/tree/route.ts` — hierarchical tree data
   - `pages/stats/route.ts` — migration statistics
   - `comments/route.ts` — GET, POST
   - `comments/[id]/route.ts` — GET, PUT, DELETE
   - `import/route.ts` — POST (excel upload)
5. **Keep old routes working** during transition (they use default project)

### Verification
- New API routes return correct data scoped to projects
- Old API routes still work
- Role checks enforce proper permissions

### Dependencies
- Phase 1 (database tables must exist)

---

## Phase 3: Project Context + Routing

**Goal:** Restructure frontend routing under `/p/[slug]/` with project context.

### Tasks

1. **Create `ProjectContext`** provider (`src/components/providers/ProjectContext.tsx`):
   - `ProjectProvider` component
   - `useProject()` hook returning project, userRole, canEdit, isReadOnly, dataMode
2. **Create project layout** `src/app/p/[projectSlug]/layout.tsx`:
   - Server component that resolves slug → project
   - Verifies membership, redirects if unauthorized
   - Wraps children in `ProjectProvider`
3. **Move existing page components** under `[projectSlug]`:
   - `tree/page.tsx` → `p/[projectSlug]/tree/page.tsx`
   - `table/page.tsx` → `p/[projectSlug]/table/page.tsx`
   - `uri/page.tsx` → `p/[projectSlug]/uri/page.tsx`
   - `analytics/page.tsx` → `p/[projectSlug]/analytics/page.tsx`
   - `admin/import/page.tsx` → `p/[projectSlug]/admin/import/page.tsx`
   - `admin/users/page.tsx` → `p/[projectSlug]/admin/users/page.tsx`
4. **Update `Navbar.tsx`:**
   - Add `ProjectSwitcher` component (left side)
   - Add project color accent (2px top border)
   - Update nav links to include project slug
   - Conditional rendering: hide project-specific nav on `/projects`
5. **Update all `fetch()` calls** to use project-scoped API routes
6. **Update realtime subscriptions** to filter by `project_id`
7. **Add redirects** from old routes to `/p/rcc/...` (default project)
8. **Update browser tab titles** to include project name
9. **Update breadcrumbs** to include project context

### Verification
- All views work at new URLs (`/p/rcc/tree`, etc.)
- Old URLs redirect correctly
- Project context available in all components
- Realtime updates scoped to current project

### Dependencies
- Phase 2 (API routes must exist)

---

## Phase 4: Projects List + Creation UI

**Goal:** Build the multi-project management interface.

### Tasks

1. **Build `ProjectCard`** component:
   - Color accent border, name, client, domain
   - Data mode badge, status badge
   - Progress bar with page statistics
   - Role badge, last activity
   - Three-dot menu (Open, Settings, Archive, Delete)
2. **Build projects list page** (`/projects`):
   - Card grid layout (responsive)
   - Sort by name/activity/completion/status
   - Filter by status, search
   - Show/hide archived toggle
   - Empty state with "Create Project" CTA
3. **Build project creation page** (`/projects/new`):
   - `ProjectForm` component with 4 sections
   - `DataModeSelector` radio card group
   - Team member invitation (optional section)
   - Color picker
   - Slug auto-generation from name
   - Post-creation redirect to `/p/[slug]`
4. **Build project settings** (`/p/[slug]/settings`):
   - Sidebar navigation (General, Members, Data Mode, Danger Zone)
   - General: name, client, domain, slug, color editing
   - Data Mode: current mode display, transition rules
   - Danger Zone: archive + delete with confirmation
5. **Build member management** (`/p/[slug]/settings/members`):
   - Member table with role dropdowns
   - Invite by email form
   - Remove member (with last-admin protection)
6. **Update login flow** to redirect to `/projects`
7. **Update auth helpers** in `src/lib/auth.ts`:
   - `isSuperadmin()`, `getProjectRole()`, `canEditProject()`, `isProjectAdmin()`
8. **Build `ProjectSwitcher`** (Cmd+K command palette):
   - Search, recent projects (localStorage), all projects
   - Navigate preserving current view
   - Create/View All actions
9. **Track recent projects** in localStorage (`mm_recent_projects`)

### Verification
- Can create new projects with different data modes
- Can switch between projects
- Project settings update correctly
- Member invitations work
- Single-project users auto-redirect

### Dependencies
- Phase 3 (routing must be in place)

---

## Phase 5: Direct Entry CRUD

**Goal:** Enable creating, editing, and deleting pages directly.

### Tasks

1. **Build `CreatePageDialog`:**
   - Name, parent selector (Combobox), page style, slug, etc.
   - Auto-generate page_id from parent context
   - "Create & Add Another" flow
2. **Build `DeletePageDialog`:**
   - Two cascade options (page only vs. page + descendants)
   - Scrollable list of pages to be deleted
3. **Build `ParentPageCombobox`:**
   - Reusable combobox showing tree path
   - Search/filter by page name
4. **Create `page-id-generator.ts`** utility
5. **Enhance `POST /api/p/[projectId]/pages`:**
   - Auto-compute depth, sort_order
   - Validate page_id uniqueness within project
6. **Enhance `DELETE /api/p/[projectId]/pages/[id]`:**
   - `?cascade=true|false` parameter
   - Cascade: delete descendants recursively
   - No cascade: orphan children to root
7. **Add creation buttons to views:**
   - Tree View: "Add Page" in TreeControls, "Add Child" on hover per TreeNode
   - Table View: "Add Page" in toolbar
8. **Build `DataEntryModeContext`** and `useDataEntryMode()` hook
9. **Conditional rendering** based on data mode (hide create/delete in Import mode)
10. **Enhance `PageDetailPanel`:**
    - Make all fields editable (name, style, URLs, parent, etc.)
    - Add Danger Zone section (delete, archive)
    - Add Structure tab (parent, children, mini tree)
11. **Expand inline cell editing** in Table View (all editable columns)
12. **Build onboarding empty states** per data mode

### Verification
- Can create pages via dialog (single page)
- Can delete pages with both cascade options
- Detail panel fields are editable
- Data mode correctly shows/hides features
- Page IDs auto-generated correctly

### Dependencies
- Phase 4 (project context and settings must work)

---

## Phase 6: Drag-and-Drop + Advanced Features

**Goal:** Add hierarchy reordering, batch operations, and context menus.

### Tasks

1. **Install** `@dnd-kit/core` and `@dnd-kit/sortable`
2. **Build `DraggableTreeNode`** wrapper:
   - GripVertical drag handle on hover
   - Three drop zones (above/middle/below)
   - Visual feedback (ghost, placeholder)
3. **Integrate DnD into `SiteTree`:**
   - Wrap tree in `DndContext`
   - Handle drag start/over/end events
   - Optimistic UI updates
4. **Create `PATCH /api/p/[projectId]/pages/reorder`:**
   - Accept `{ pageId, newParentPageId, newSortOrder }`
   - Cycle detection
   - Cascade depth recalculation
   - Page ID regeneration
5. **Build `BatchCreateDialog`:**
   - Parent selector, multiple name rows
   - Paste-from-text mode (one name per line)
   - Common settings section
6. **Create `POST /api/p/[projectId]/pages/batch`:**
   - Accept array of pages with common fields
   - Auto-generate page IDs and sort orders
7. **Build `TreeNodeContextMenu`:**
   - Add Child, Add Sibling, Edit Details
   - Quick Edit Name, Change Status/Responsibility submenus
   - Duplicate (with/without children)
   - Delete
8. **Add table row context menu:**
   - Edit Details, Duplicate, Delete, View in Tree
9. **Implement inline rename** in Tree View:
   - Double-click to edit, Enter to save, Escape to cancel
10. **Add "Add Page Here" insertion points** between tree nodes
11. **Build "View in Tree" action** from Table View:
    - Navigate to tree, expand ancestors, scroll to node, pulse animation
12. **Add ghost row** to Table View (Airtable-style new row at bottom)
13. **Extend bulk actions bar:**
    - Set Status, Responsibility, Owner, Style, Migrator
    - Delete Selected
    - More fields dropdown

### Verification
- Can drag-and-drop to reorder and reparent pages
- Batch creation works with multiple pages
- Context menus functional in both views
- Inline rename saves correctly
- Ghost row creates pages
- No cycles possible in drag-and-drop

### Dependencies
- Phase 5 (CRUD must work before adding advanced features)

---

## Phase 7: Polish (Keyboard Shortcuts, Templates, Onboarding)

**Goal:** Add power-user features and refinements.

### Tasks

1. **Define page templates** in `src/lib/page-templates.ts`:
   - Basic Website (4 pages)
   - Academic Program (12 pages, 2 levels)
   - Department Site (8 pages)
   - Microsite (5 pages)
   - Empty
2. **Build `TemplatePickerDialog`:**
   - Card grid with icons and descriptions
   - Preview of pages to be created
   - Used during project creation + tree context menu
3. **Implement keyboard shortcuts** (`src/hooks/use-keyboard-shortcuts.ts`):
   - Registry pattern with `react-hotkeys-hook`
   - Global: Cmd+K, Cmd+N, Escape
   - Tree: arrows, Enter, Space, N, Shift+N, Delete, Cmd+D, F2, Cmd+Shift+↑/↓
   - Table: arrows, Enter, Escape, Tab, Space
   - Disabled when dialogs/inputs focused
4. **Build `CommandPalette`** (Cmd+K):
   - Unified search: projects, pages, actions
   - Recent items
   - Keyboard-navigable
5. **Add project lifecycle management:**
   - Complete project action (banner + read-only)
   - Archive project action (hide from list + read-only)
   - Reopen/unarchive actions
   - Status badges and visual treatments
6. **Onboarding refinements:**
   - Post-first-import tip banner (suggest Hybrid mode)
   - Dismissible hints for new features
7. **localStorage recent projects tracking:**
   - `mm_recent_projects` key
   - Max 5 entries, auto-cleanup
8. **Browser tab titles:** `"[View] | [Project Name]"` format
9. **Clean up old routes and API endpoints:**
   - Remove pre-migration routes
   - Remove dual RLS policies
   - Remove backward-compatibility code
10. **Remove old RLS policies** that were kept during transition
11. **Performance audit:**
    - Ensure project list loads fast with many projects
    - Tree DnD performance with large hierarchies
    - Realtime subscription cleanup on project switch

### Verification
- Templates create correct page structures
- All keyboard shortcuts work and don't conflict
- Command palette searches across projects and pages
- Project lifecycle states enforce read-only correctly
- Clean codebase with no legacy code remaining
- Smooth performance at scale

### Dependencies
- Phase 6 (all features must work before polish)

---

## Summary Timeline

| Phase | Description | Estimated Effort |
|-------|-------------|-----------------|
| 1 | Database Migration | 1-2 days |
| 2 | API Layer | 2-3 days |
| 3 | Project Context + Routing | 2-3 days |
| 4 | Projects List + Creation UI | 3-4 days |
| 5 | Direct Entry CRUD | 2-3 days |
| 6 | Drag-and-Drop + Advanced | 3-4 days |
| 7 | Polish | 2-3 days |
| **Total** | | **15-22 days** |

### Deployment Strategy

Each phase can be deployed independently:
- **Phase 1**: Deploy database changes — zero user-facing impact
- **Phase 2**: Deploy new API routes — old routes still work
- **Phase 3**: Deploy routing changes — redirects handle old URLs
- **Phase 4**: Deploy project UI — users see new project list
- **Phase 5-7**: Incremental feature additions

### Rollback Plan

- **Phase 1**: Drop new tables, remove columns (data-safe since backfill is non-destructive)
- **Phase 2**: Remove new API route files
- **Phase 3**: Revert routing, remove redirects
- **Phase 4-7**: Remove new components/pages
