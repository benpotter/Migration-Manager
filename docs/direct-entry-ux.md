# Direct Entry UX Design

UX specification for direct data entry — creating, editing, deleting, and reordering pages without Excel import.

---

## Page Creation Flows

### Entry Points

**Tree View — 3 entry points:**
1. **Top-level "Add Page" button** in `TreeControls` (next to expand/collapse)
2. **Inline "Add Child" button** — appears on hover per `TreeNode`
3. **Right-click context menu** — "Add Child Page" / "Add Sibling Below"

**Table View:**
- **"Add Page" button** in toolbar next to search input
- **Ghost row** at bottom of table (see Table View Enhancements)

### CreatePageDialog Component

**Type:** Dialog (not Sheet — Sheet is reserved for the detail panel)
**Size:** `max-w-lg`

**Fields:**

| Field | Type | Required | Behavior |
|-------|------|----------|----------|
| Page Name | Text input | Yes | Autofocused |
| Page ID | Text input | No | Auto-generated from parent context, editable |
| Parent Page | Combobox | No | Tree path display (e.g., "Academics > Programs") |
| Page Style | Select | No | 8 options: Home, Top Landing, Secondary Landing, Pathway, Informational, Info Sub, Microsite, Other |
| MC Template | Select | No | 8 template options |
| Content Responsibility | Select | No | MAC / RCC |
| Migration Owner | Select | No | MAC / RCC |
| Slug | Text input | No | Auto-generated from name, editable |

**"Create & Add Another" flow:**
- Secondary button alongside "Create"
- On click: creates page, clears form (keeps Parent Page selection), shows success toast
- Enables rapid multi-page creation without batch dialog

**Page ID auto-generation:**
```typescript
// Query sibling count under parent, generate next ID
function generatePageId(parentPageId: string | null, siblingCount: number): string {
  const nextIndex = siblingCount + 1;
  if (!parentPageId) return String(nextIndex);
  return `${parentPageId}.${nextIndex}`;
}
```

### API Changes for Creation

`POST /api/p/[projectId]/pages` enhanced:
- Auto-compute `depth` from parent
- Auto-compute `sort_order` (append to end of siblings)
- Validate `page_id` uniqueness within project
- Set `project_id` from route param

---

## Hierarchy Management — Drag and Drop

### Library Choice

`@dnd-kit/core` with `@dnd-kit/sortable`:
- Accessible (keyboard DnD support)
- Tree-friendly (nested sortable contexts)
- Active maintenance
- Used by Notion, Linear

### Interaction Design

**Drag handle:** `GripVertical` icon appears on hover (left of expand chevron)

**Three drop zones per node:**

```
┌─────────────────────────┐
│ ▔▔▔ Above (sibling)     │  ← top 25% of node height
│ ■■■ Middle (reparent)   │  ← middle 50%
│ ▁▁▁ Below (sibling)     │  ← bottom 25%
└─────────────────────────┘
```

- **Above** = insert as sibling before this node
- **Middle** = reparent as last child of this node
- **Below** = insert as sibling after this node

**Visual feedback during drag:**
- Dragged node: semi-transparent ghost following cursor
- Drop target: dashed blue placeholder line (above/below) or highlighted background (middle)
- Depth indentation adjusts in real-time as cursor moves between zones

### Data Updates on Drop

New endpoint: `PATCH /api/p/[projectId]/pages/reorder`

```typescript
// Request body
{
  pageId: string;
  newParentPageId: string | null;
  newSortOrder: number;
}

// Server-side:
// 1. Validate no cycles (page can't become descendant of itself)
// 2. Update parent_page_id
// 3. Recalculate depth for moved page + all descendants
// 4. Recalculate sort_order for affected siblings
// 5. Regenerate page_id based on new position
```

**Cycle detection:**
```typescript
function wouldCreateCycle(pageId: string, newParentId: string, pages: PageRow[]): boolean {
  let current = newParentId;
  while (current) {
    if (current === pageId) return true;
    const parent = pages.find(p => p.id === current);
    current = parent?.parent_page_id ?? null;
  }
  return false;
}
```

---

## Enhanced Detail Panel Editing

The existing `PageDetailPanel` (Sheet) becomes fully editable in Direct Entry mode:

| Field | Current | Direct Entry Mode |
|-------|---------|-------------------|
| Page Name | Static text | Inline-editable heading with pencil icon |
| Page Style | Static `<p>` | `<Select>` dropdown |
| Source URL | Static link | Editable `<Input>` + `<ExternalLink>` button |
| Content Draft URL | Static link | Editable `<Input>` + `<ExternalLink>` button |
| Design File URL | Static link | Editable `<Input>` + `<ExternalLink>` button |
| Page ID | Static text | Editable with warning tooltip |
| Parent Page | Static text | `<Combobox>` with tree path |
| Depth | Static number | Editable `<Input type="number">` |
| Sort Order | Static number | Editable `<Input type="number">` |

### New Sections

**Danger Zone** (bottom of Overview tab):
- Delete Page button (opens `DeletePageDialog`)
- Archive Page toggle

**Structure Tab** (new 4th tab):
- Parent page link
- Direct children list (clickable)
- Mini tree preview showing this page in context
- Breadcrumb path

---

## Delete Flow

### Single Page Deletion

`DeletePageDialog` with two radio options:

```
┌─────────────────────────────────────────┐
│ Delete "Academic Programs"               │
│                                          │
│ ○ Delete this page only                  │
│   Children (3) will be moved to root     │
│                                          │
│ ● Delete this page and all 12            │
│   descendants                            │
│                                          │
│ Pages to be deleted:                     │
│ ┌──────────────────────────────────────┐ │
│ │ • Academic Programs                  │ │
│ │   • Computer Science                │ │
│ │   • Biology                         │ │
│ │   • Mathematics                     │ │
│ │     • Applied Math                  │ │
│ │     ...                             │ │
│ └──────────────────────────────────────┘ │
│                                          │
│              [Cancel]  [Delete]          │
└─────────────────────────────────────────┘
```

**API:** `DELETE /api/p/[projectId]/pages/[id]?cascade=true|false`
- `cascade=false`: Set children's `parent_page_id` to null (orphan to root)
- `cascade=true`: Delete page and all descendants recursively

### Bulk Deletion

"Delete Selected" button in Table View bulk actions bar:
- Shows count of selected pages
- Same cascade options
- Confirmation dialog with full list

---

## Batch Operations

### Batch Page Creation

`BatchCreateDialog` — for creating multiple pages at once:

```
┌─────────────────────────────────────────────────────┐
│ Create Multiple Pages                                │
│                                                      │
│ Parent Page: [Academics ▾]                           │
│                                                      │
│ ┌─────────────────┬──────────┬──────────────┬───┐   │
│ │ Name            │ Slug     │ Page Style   │ × │   │
│ ├─────────────────┼──────────┼──────────────┼───┤   │
│ │ Computer Sci    │ auto     │ Informational│ × │   │
│ │ Biology         │ auto     │ Informational│ × │   │
│ │ Mathematics     │ auto     │ Informational│ × │   │
│ │ [+ Add row]     │          │              │   │   │
│ └─────────────────┴──────────┴──────────────┴───┘   │
│                                                      │
│ 📋 Paste from text (one name per line)               │
│                                                      │
│ Common Settings:                                     │
│ Content Responsibility: [MAC ▾]                      │
│ Migration Owner: [MAC ▾]                             │
│                                                      │
│              [Cancel]  [Create 3 Pages]              │
└─────────────────────────────────────────────────────┘
```

**API:** `POST /api/p/[projectId]/pages/batch`
```typescript
{
  parentPageId: string | null;
  pages: Array<{ name: string; slug?: string; page_style?: string }>;
  commonFields: {
    content_responsibility?: string;
    migration_owner?: string;
    mc_template?: string;
  };
}
```

### Bulk Field Editing

Extended bulk actions bar (appears when rows selected in Table View):

```
┌────────────────────────────────────────────────────────────────┐
│ 5 selected │ Set Status ▾ │ Set Responsibility ▾ │ Set Owner ▾│
│            │ Set Style ▾  │ Set Migrator ▾       │ More... ▾  │
│            │ Delete Selected                     │ Clear      │
└────────────────────────────────────────────────────────────────┘
```

---

## Tree View Enhancements

### Context Menu

`TreeNodeContextMenu.tsx` — right-click on any tree node:

```
┌─────────────────────────┐
│ Add Child Page           │
│ Add Sibling Below        │
│ ─────────────────────── │
│ Edit Details             │
│ Quick Edit Name          │
│ ─────────────────────── │
│ Change Status        ▸  │  ← submenu with all 11 statuses
│ Change Responsibility ▸ │  ← MAC / RCC
│ ─────────────────────── │
│ Duplicate Page           │
│ Duplicate with Children  │
│ ─────────────────────── │
│ Delete Page              │
└─────────────────────────┘
```

Built with Shadcn `ContextMenu` component.

### Inline Rename

- **Double-click** on page name to enter edit mode
- Text becomes an input, pre-selected
- **Enter** to save, **Escape** to cancel
- Saves via `PATCH /api/p/[projectId]/pages/[id]` with `{ name: newName }`

### "Add Page Here" Insertion Points

Notion-style: faint `+ Add page here` appears between tree nodes on hover.

```
├── About Us
│   + Add page here          ← appears on hover between nodes
├── Academics
├── Admissions
```

Clicking opens `CreatePageDialog` pre-filled with the correct parent and sort order.

### Enhanced Selection Toolbar

When nodes are selected via checkboxes:

```
┌──────────────────────────────────────────────────────────────┐
│ 3 selected │ Set Status ▾ │ Set Responsibility ▾ │ Move to… │
│            │ Delete       │ Clear                            │
└──────────────────────────────────────────────────────────────┘
```

### Drag Handle

`GripVertical` icon from Lucide, appears on hover to the left of the expand/collapse chevron.

---

## Table View Enhancements

### Ghost Row (Airtable/Notion Pattern)

Persistent "new row" at the bottom of the table:

```
┌──────┬──────────────────┬────────────┬──────────┐
│  ID  │ Name             │ Status     │ Style    │
├──────┼──────────────────┼────────────┼──────────┤
│ 1.1  │ About Us         │ Published  │ Landing  │
│ 1.2  │ Academics        │ In Review  │ Pathway  │
├──────┼──────────────────┼────────────┼──────────┤
│  +   │ Type page name…  │            │          │  ← ghost row
└──────┴──────────────────┴────────────┴──────────┘
```

- Click to focus, type a name, press Enter or Tab to create
- Uses `_isNewRow: true` flag to render differently
- After creation, new ghost row appears below

### Inline Cell Editing Expansion

All editable columns get `InlineEdit` wrapper:
- Click to edit (not double-click — matches current behavior)
- Dropdown fields use `<Select>` inline
- Text fields use `<Input>` inline
- Enter to save, Escape to cancel

### Row Context Menu

Right-click on any table row:

```
┌─────────────────────────┐
│ Edit Details             │
│ Duplicate                │
│ Delete                   │
│ ─────────────────────── │
│ View in Tree             │
└─────────────────────────┘
```

### "View in Tree" Action

Navigates to `/p/[slug]/tree?highlight=PAGE_ID`:
- Expands all ancestor nodes to reveal the target
- Scrolls to the target node
- Applies a pulse animation (brief blue highlight that fades)

---

## Data Entry Mode

### `useDataEntryMode()` Hook

```typescript
export function useDataEntryMode() {
  const { project } = useProject();

  return {
    mode: project.data_mode,
    isDirectEntry: project.data_mode === 'direct_entry' || project.data_mode === 'hybrid',
    isImportEnabled: project.data_mode === 'import' || project.data_mode === 'hybrid',
  };
}
```

### Mode-Specific Feature Matrix

| Feature | Import Mode | Direct Entry Mode | Hybrid Mode |
|---------|------------|-------------------|-------------|
| Excel upload | Visible | Hidden | Visible |
| "Add Page" buttons | Hidden | Visible | Visible |
| Delete actions | Hidden | Visible | Visible |
| Batch creation | Hidden | Visible | Visible |
| Drag-and-drop reorder | Hidden | Visible | Visible |
| Ghost row (table) | Hidden | Visible | Visible |
| Inline rename (tree) | Hidden | Visible | Visible |
| Context menu (create) | Hidden | Visible | Visible |
| Context menu (delete) | Hidden | Visible | Visible |
| Import column mapping | Visible | Hidden | Visible |
| Page ID editing | Hidden | Visible | Visible |

### Mode Toggle

In the Navbar, `ToggleGroup` (segmented control) for Hybrid projects:

```
[Import] [Direct Entry]
```

Switching modes shows an info dialog explaining what changes.

---

## Page Templates / Presets

### Template Definitions

```typescript
// src/lib/page-templates.ts

export const PAGE_TEMPLATES = [
  {
    id: 'basic-website',
    name: 'Basic Website',
    description: 'Home, About, Contact, News',
    icon: 'Globe',
    pages: [
      { name: 'Home', page_style: 'Home', children: [] },
      { name: 'About', page_style: 'Informational', children: [] },
      { name: 'Contact', page_style: 'Informational', children: [] },
      { name: 'News', page_style: 'Landing', children: [] },
    ],
  },
  {
    id: 'academic-program',
    name: 'Academic Program',
    description: '12 pages, 2 levels deep',
    icon: 'GraduationCap',
    pages: [
      {
        name: 'Program Overview',
        page_style: 'Landing',
        children: [
          { name: 'Curriculum', page_style: 'Informational', children: [] },
          { name: 'Faculty', page_style: 'Informational', children: [] },
          { name: 'Admissions', page_style: 'Pathway', children: [] },
          { name: 'Financial Aid', page_style: 'Informational', children: [] },
          { name: 'Student Resources', page_style: 'Informational', children: [] },
        ],
      },
      // ... more top-level sections
    ],
  },
  {
    id: 'department-site',
    name: 'Department Site',
    description: '8 pages with standard department sections',
    icon: 'Building',
    pages: [/* ... */],
  },
  {
    id: 'microsite',
    name: 'Microsite',
    description: '5 pages, flat structure',
    icon: 'Layers',
    pages: [/* ... */],
  },
  {
    id: 'empty',
    name: 'Empty Project',
    description: 'Start with a blank slate',
    icon: 'File',
    pages: [],
  },
];
```

### Template Picker UI

`TemplatePickerDialog` — shown during project creation or from tree context menu "Insert Template...":

```
┌─────────────────────────────────────────────────────┐
│ Choose a Template                                    │
│                                                      │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│ │ 🌐          │ │ 🎓          │ │ 🏢          │    │
│ │ Basic       │ │ Academic    │ │ Department  │    │
│ │ Website     │ │ Program     │ │ Site        │    │
│ │ 4 pages     │ │ 12 pages    │ │ 8 pages     │    │
│ └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                      │
│ ┌─────────────┐ ┌─────────────┐                     │
│ │ 📄          │ │ ➕          │                     │
│ │ Microsite   │ │ Empty       │                     │
│ │ 5 pages     │ │ 0 pages     │                     │
│ └─────────────┘ └─────────────┘                     │
│                                                      │
│              [Cancel]  [Use Template]                │
└─────────────────────────────────────────────────────┘
```

"Insert Template..." in tree context menu inserts template pages as children of the right-clicked node.

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette / project switcher |
| `Cmd+N` | Open create page dialog |
| `Escape` | Close active panel/dialog |

### Tree View

| Shortcut | Action |
|----------|--------|
| `↑/↓` | Navigate between nodes |
| `→` | Expand node |
| `←` | Collapse node |
| `Enter` | Open detail panel |
| `Space` | Toggle checkbox selection |
| `Cmd+A` | Select all visible |
| `N` | New sibling after current |
| `Shift+N` | New child of current |
| `Delete`/`Backspace` | Delete current node |
| `Cmd+D` | Duplicate page |
| `F2` | Rename (inline edit) |
| `Cmd+Shift+↑` | Move up (reorder) |
| `Cmd+Shift+↓` | Move down (reorder) |

### Table View

| Shortcut | Action |
|----------|--------|
| `↑/↓/←/→` | Navigate cells |
| `Enter` | Start editing / confirm |
| `Escape` | Cancel edit |
| `Tab` | Next cell |
| `Shift+Tab` | Previous cell |
| `Space` | Toggle row selection |

### Implementation

```typescript
// src/hooks/use-keyboard-shortcuts.ts
// Uses react-hotkeys-hook with a registry pattern

interface ShortcutDefinition {
  key: string;
  handler: () => void;
  description: string;
  scope?: 'global' | 'tree' | 'table';
}

export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[]) {
  // Register hotkeys scoped to the active view
  // Disable when dialogs/inputs are focused
}
```

---

## New Files to Create

### Components
| File | Purpose |
|------|---------|
| `src/components/pages/CreatePageDialog.tsx` | Single page creation dialog |
| `src/components/pages/BatchCreateDialog.tsx` | Multi-page creation |
| `src/components/pages/DeletePageDialog.tsx` | Delete with cascade options |
| `src/components/pages/TemplatePickerDialog.tsx` | Template selection |
| `src/components/tree/TreeNodeContextMenu.tsx` | Right-click menu |
| `src/components/tree/DraggableTreeNode.tsx` | @dnd-kit wrapper for TreeNode |
| `src/components/shared/ParentPageCombobox.tsx` | Reusable parent selector |
| `src/components/shared/CommandPalette.tsx` | Cmd+K palette |

### Context & Hooks
| File | Purpose |
|------|---------|
| `src/components/providers/DataEntryModeContext.tsx` | Mode state |
| `src/hooks/use-data-entry-mode.ts` | Mode hook |
| `src/hooks/use-keyboard-shortcuts.ts` | Shortcut registry |

### Lib
| File | Purpose |
|------|---------|
| `src/lib/page-id-generator.ts` | Auto-generate page IDs |
| `src/lib/page-templates.ts` | Template definitions |

### API Routes
| File | Purpose |
|------|---------|
| `src/app/api/p/[projectId]/pages/reorder/route.ts` | Drag-and-drop reorder |
| `src/app/api/p/[projectId]/pages/batch/route.ts` | Batch creation |

### UI Components
| File | Purpose |
|------|---------|
| `src/components/ui/context-menu.tsx` | Shadcn ContextMenu (install) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tree/TreeNode.tsx` | Drag handle, context menu, inline rename, selection |
| `src/components/tree/SiteTree.tsx` | DndContext wrapper, insertion points |
| `src/components/tree/TreeControls.tsx` | "Add Page" button, selection toolbar |
| `src/components/table/PageTable.tsx` | Ghost row, bulk actions bar |
| `src/components/table/columns.tsx` | Inline editing expansion, context menu column |
| `src/components/detail/PageDetailPanel.tsx` | Editable fields, Structure tab, Danger Zone |
| `src/components/layout/Navbar.tsx` | Mode toggle, project switcher |
| `src/app/api/pages/route.ts` | → Move to project-scoped route |
| `src/app/api/pages/[id]/route.ts` | → Move to project-scoped, add cascade delete |
| `src/app/(pages)/tree/page.tsx` | → Move under `[projectSlug]` |
| `src/app/(pages)/table/page.tsx` | → Move under `[projectSlug]` |
| `src/app/layout.tsx` | Add keyboard shortcut provider |
| `src/types/index.ts` | Add new types |
| `src/lib/constants.ts` | Add template constants |
