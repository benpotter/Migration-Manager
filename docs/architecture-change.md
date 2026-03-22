# Architecture Change: Multi-Project + Direct Data Entry

## Executive Overview

The RCC Migration Manager is evolving from a single-project, import-only tool into a multi-project platform with direct data entry capabilities. This document summarizes the architectural changes required and the rationale behind key decisions.

### Current State
- Single project (RCC website migration)
- Data enters the system only via Excel import
- Single set of roles (admin/editor/viewer) applied globally
- All routes are top-level (`/tree`, `/table`, `/uri`)

### Target State
- Multiple projects with per-project data isolation
- Three data modes: Import, Direct Entry, and Hybrid
- Per-project roles via `project_members` table + global `is_superadmin`
- Path-based project scoping (`/p/[slug]/tree`, `/p/[slug]/table`)
- Full CRUD for pages (create, edit, delete, reorder, batch operations)
- Drag-and-drop hierarchy management in Tree View

---

## Decision Rationale

### Why Stay with Supabase?

We evaluated DynamoDB + AWS services as an alternative. Supabase wins for this use case:

| Factor | Supabase | DynamoDB Alternative |
|--------|----------|---------------------|
| **Project isolation** | PostgreSQL RLS — one policy per table | Application-level filtering across 4-5 services |
| **Auth** | Built-in, already integrated | Cognito — separate service to configure |
| **Realtime** | Built-in channel subscriptions | DynamoDB Streams + Lambda + API Gateway WebSockets |
| **Hierarchical data** | Self-referencing FKs, recursive CTEs | Single-table design with composite keys |
| **Cost** | Free tier covers this scale | Multiple AWS services to pay for |
| **Team familiarity** | Already using it | New learning curve |

### Why Path-Based Routing?

`/p/[slug]/tree` instead of query params (`/tree?project=rcc`):

- Clean, shareable URLs
- Next.js layout nesting (project layout wraps all project pages)
- Browser history works naturally
- SEO-friendly (if needed later)

### Why Per-Project Roles?

The agency (Madison Avenue Collective) manages multiple college clients. A user might be an admin on one project and a viewer on another. Global roles don't support this.

- `project_members` table with `role` per project
- `is_superadmin` on `user_profiles` for org-level permissions (create projects, manage all)

### Why Three Data Modes?

Different projects have different workflows:
- **Import**: Client provides content inventory via Excel (current RCC workflow)
- **Direct Entry**: Agency builds information architecture from scratch
- **Hybrid**: Start with import, then add/modify pages directly

---

## Change Summary

### Database Changes
- New `projects` table with slug, client info, data mode, settings
- New `project_members` table with per-project roles
- `project_id` added to `pages`, `import_logs`, `user_presence`, `notifications`
- `is_superadmin` added to `user_profiles`
- New RLS policies scoped to project membership
- See: [multi-project-architecture.md](./multi-project-architecture.md)

### API Changes
- New project CRUD routes (`/api/projects`)
- All data routes scoped under `/api/p/[projectId]/...`
- New endpoints: `/api/p/[projectId]/pages/reorder`, `/api/p/[projectId]/pages/batch`
- Enhanced page CRUD with cascade delete, auto-generated page IDs
- See: [multi-project-architecture.md](./multi-project-architecture.md)

### Frontend Changes
- New route structure under `src/app/p/[projectSlug]/`
- `ProjectContext` provider with `useProject()` hook
- Project list page, creation form, settings pages
- Project switcher in navbar (Cmd+K command palette)
- See: [project-management-ux.md](./project-management-ux.md)

### Direct Entry Features
- Page creation dialogs (single + batch)
- Delete flows with cascade options
- Drag-and-drop reordering (@dnd-kit)
- Context menus, inline rename, keyboard shortcuts
- Page templates/presets
- See: [direct-entry-ux.md](./direct-entry-ux.md)

---

## Implementation Phases

| Phase | Scope | Risk Level |
|-------|-------|------------|
| 1. Database migration | New tables, FKs, backfill | Low (non-breaking) |
| 2. API layer | Project-scoped routes | Low (old routes kept) |
| 3. Project context + routing | Layout, context, redirects | Medium (URL changes) |
| 4. Projects list + creation UI | New pages, settings | Low (additive) |
| 5. Direct entry CRUD | Create/delete/edit pages | Medium (new workflows) |
| 6. Drag-and-drop + advanced | @dnd-kit, batch, menus | Medium (complex interactions) |
| 7. Polish | Shortcuts, templates, onboarding | Low (enhancements) |

See: [implementation-phases.md](./implementation-phases.md)

---

## Cross-Reference Guide

| Topic | Document |
|-------|----------|
| Database schema, SQL, RLS, API routes | [multi-project-architecture.md](./multi-project-architecture.md) |
| Direct entry UX, components, interactions | [direct-entry-ux.md](./direct-entry-ux.md) |
| Project management UX, switcher, settings | [project-management-ux.md](./project-management-ux.md) |
| Phased rollout plan | [implementation-phases.md](./implementation-phases.md) |
| URI pattern view (existing) | [uri_research.md](./uri_research.md) |
