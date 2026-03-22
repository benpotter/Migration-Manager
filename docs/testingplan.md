# Manual Smoke Test Guide

## Context

Phases 3–7 implemented multi-project support, direct-entry CRUD, drag-and-drop, command palette, settings pages, and more (~50 new files, ~15 modified). Code audit completed — 1 critical bug fixed (batch update was sending wrong ID type), everything else checked out. Build passes. Now it's time for a human to click through the app.

## Prerequisites

- `npm run dev` running
- Supabase instance with migration `003_add_projects.sql` applied
- A logged-in user account (ideally a superadmin for full access)

---

## Smoke Test Checklist (Priority Order)

### 1. Project Creation & Navigation (Start Here)
- [ ] Go to `/projects` — page loads, shows project list (or empty state)
- [ ] Click "Create Project" — form loads with name, client, description, slug, data mode, color, members
- [ ] Create a **Direct Entry** project — verify redirect to `/p/[slug]`
- [ ] Create an **Import** project — verify redirect
- [ ] Navbar shows project name and breadcrumbs when inside a project
- [ ] Project switcher in navbar works (click project name or breadcrumb)
- [ ] Cmd+K opens Command Palette — can navigate between views and projects

### 2. Direct Entry — Tree View CRUD (Highest Risk)
*Use the Direct Entry project for these tests*
- [ ] Dashboard (`/p/[slug]`) shows empty state with "Create Page" CTA
- [ ] Click "Create Page" — dialog opens, fill in name, select parent (optional), submit
- [ ] Page appears in tree view (`/p/[slug]/tree`)
- [ ] Right-click context menu: Add Child, Rename, Change Status, Change Responsibility, Delete
- [ ] Add a child page via context menu — appears nested under parent
- [ ] Inline rename (double-click or context menu → Rename) — saves on blur/enter
- [ ] Change status via context menu — badge updates immediately
- [ ] Delete a page — confirmation dialog shows child count, cascade warning
- [ ] Drag-and-drop reorder — drag a node to a new position, verify it persists after refresh
- [ ] "Batch Create" button — dialog opens, can create multiple pages at once

### 3. Direct Entry — Table View
- [ ] Navigate to `/p/[slug]/table`
- [ ] Pages appear in table with correct columns
- [ ] Click a row — detail panel opens on right
- [ ] Select multiple rows with checkboxes
- [ ] Batch status update — select rows, change status, verify toast + update
- [ ] Search/filter works (global search, status filter, page style filter)
- [ ] Pagination controls work
- [ ] "Add Page" button opens create dialog

### 4. Import Flow
*Use the Import project for these tests*
- [ ] Navigate to `/p/[slug]/admin/import`
- [ ] Upload an Excel file — preview shows rows created/updated/archived/errors
- [ ] After import, tree view shows imported pages in correct hierarchy
- [ ] Import history table shows the upload with correct counts
- [ ] In import mode: "Add Page", "Batch Create", context menu CRUD items should be **hidden**
- [ ] Tree nodes should NOT be draggable in import mode

### 5. Page Detail Panel
- [ ] Click any page in tree or table view
- [ ] **Details tab**: All fields load, can edit name/status/responsibility/style/URLs/notes
- [ ] Save changes — toast confirms, data persists on refresh
- [ ] **Comments tab**: Add a comment, verify it appears with your name and timestamp
- [ ] **History tab**: Shows edit history entries with user, field, old/new values, timestamp

### 6. Settings Pages
- [ ] `/p/[slug]/settings` — General settings: edit name, client, description, slug, color
- [ ] `/p/[slug]/settings/data-mode` — Shows current mode, allowed transitions
- [ ] Switch data mode (e.g., direct_entry → hybrid) — verify UI updates
- [ ] `/p/[slug]/settings/members` — Invite a member by email, change roles, remove member
- [ ] `/p/[slug]/settings/danger` — Mark complete (project goes read-only), reopen, archive
- [ ] Delete project — type name to confirm, verify redirect to `/projects`

### 7. Data Mode Guards
- [ ] Import mode project: tree/table should NOT show create/delete/rename/reorder UI
- [ ] Direct Entry mode project: import page should show appropriate messaging
- [ ] Hybrid mode project: ALL features should be available
- [ ] Switch from import → hybrid: CRUD UI should appear
- [ ] Read-only project (completed/archived): editing should be blocked, banner visible

### 8. URI View
- [ ] Navigate to `/p/[slug]/uri`
- [ ] Pages display with hierarchical URI paths
- [ ] Conflict detection highlights duplicates (if any)
- [ ] Search/filter works
- [ ] Export buttons work (CSV/JSON)

### 9. Dashboard & Analytics
- [ ] Global dashboard (`/`) shows stats across all projects
- [ ] Project dashboard (`/p/[slug]`) shows project-specific stats
- [ ] Analytics page (`/p/[slug]/analytics`) shows charts
- [ ] Stats update after creating/editing pages

### 10. Permissions
- [ ] As **viewer**: can see pages, add comments, but cannot edit fields or create/delete pages
- [ ] As **editor**: can edit fields, create pages (if mode allows), but cannot delete or access settings
- [ ] As **admin**: full access including settings, delete, danger zone

---

## Known Low-Priority Issues (Won't Block Testing)

- `onAddSibling` and `onDuplicate` context menu items are defined but not wired — they simply won't appear in the menu
- TemplatePickerDialog uses full page reload instead of graceful data refetch
- Two comment API endpoints exist with different envelope formats — frontend only uses the correct one

## If Something Breaks

Report the page URL, what you clicked, and the browser console error. Most likely issues will be:
- Missing Supabase RLS policies (403 errors)
- Missing migration columns (500 errors on specific fields)
- Auth session expired (redirect to login)
