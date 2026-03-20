# URI Pattern View — Research & Implementation Plan

> **Prepared by**: Web Content Migration Agent Team
> **Date**: 2026-03-19
> **Sources**: UX & Interaction Design Team, Web Content Strategy & IA Team, Technical Implementation & DX Team
> **Status**: Ready for implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Why a URI Pattern View](#2-why-a-uri-pattern-view)
3. [Decimal System → URI Mapping](#3-decimal-system--uri-mapping)
4. [User Personas & Workflows](#4-user-personas--workflows)
5. [UX & Visual Design](#5-ux--visual-design)
6. [Content Strategy Use Cases](#6-content-strategy-use-cases)
7. [Key UX Patterns](#7-key-ux-patterns)
8. [Technical Architecture](#8-technical-architecture)
9. [Implementation Plan](#9-implementation-plan)
10. [File Manifest](#10-file-manifest)
11. [Phased Rollout](#11-phased-rollout)

---

## 1. Executive Summary

The RCC Migration Manager currently provides two views for managing content migration: **Tree View** (hierarchical indent-based) and **Table View** (flat spreadsheet-style). Both display the decimal numbering system and slug information, but neither emphasizes the **URI path hierarchy** as a primary organizational lens.

A **URI Pattern View** would create a specialized perspective that maps the hierarchical page structure directly to URI path segments — enabling content strategists, SEO specialists, developers, and QA teams to reason about URL structure alongside migration status.

### Key Value Propositions

| Capability | Current State | With URI Pattern View |
|---|---|---|
| URL structure visibility | Slug column truncated in Table View | Full URI paths with breadcrumb visualization |
| Conflict detection | Manual review only | Automated duplicate slug detection |
| SEO analysis | Not available | Depth warnings, length analysis, naming validation |
| Redirect planning | Manual mapping | Old URI → New URI side-by-side |
| Stakeholder communication | Technical tree/table views | Breadcrumb-style URL taxonomy |
| Export for routing | JSON tree export only | CSV, JSON, .htaccess redirect rules |

---

## 2. Why a URI Pattern View

### 2.1 Site Architecture Visualization
Content strategists think in terms of URLs, not page IDs. The current Tree View requires mentally translating "1.1.1.1" to "/degrees-and-programs/degrees-and-certificates/applied-technology-pathway/automotive-specialist". A URI Pattern View eliminates this cognitive overhead.

### 2.2 URL Pattern Inconsistency Detection
During migration, inconsistencies emerge: missing slugs, non-standard naming, overly deep nesting, duplicate segments. A dedicated view surfaces these issues automatically with validation indicators.

### 2.3 Migration Planning & Redirect Mapping
When restructuring URLs, teams need to see old → new mappings clearly. The URI view provides this context alongside decimal positions and migration status, reducing broken link risk.

### 2.4 SEO-Friendly URL Hierarchy
Shorter, keyword-rich URLs rank better. The URI view highlights depth outliers (5+ segments), long slugs, and naming inconsistencies that impact SEO.

### 2.5 Content Governance
Enforce consistent URL patterns: kebab-case naming, maximum depth, reserved word avoidance. The view validates in real-time and color-codes compliance.

---

## 3. Decimal System → URI Mapping

### 3.1 Core Mapping Logic

The existing decimal page ID system naturally maps to URL hierarchy:

```
Decimal ID    Page Name                        URI Path
─────────────────────────────────────────────────────────────────────────
1.0           Home                             /
1.1           Degrees & Programs               /degrees-and-programs
1.1.1         Degrees & Certificates           /degrees-and-programs/degrees-and-certificates
1.1.1.1       Applied Technology Pathway       /degrees-and-programs/degrees-and-certificates/applied-technology-pathway
1.1.1.1.1     Automotive Specialist            /.../applied-technology-pathway/automotive-specialist
1.1.1.1.1.1   Prerequisites & Requirements    /.../automotive-specialist/prerequisites-and-requirements
1.1.1.1.1.2   Application Process             /.../automotive-specialist/application-process
1.1.1.1.1.3   Career & Salary Outlook         /.../automotive-specialist/career-and-salary-outlook
```

### 3.2 Hierarchy Levels

| Level | Decimal Pattern | Content Type | Example |
|-------|----------------|--------------|---------|
| 0 | 1.0 | Root/Homepage | `/` |
| 1 | 1.x | Top-level sections | `/degrees-and-programs` |
| 2 | 1.x.x | Secondary categories | `/degrees-and-programs/degrees-and-certificates` |
| 3 | 1.x.x.x | Landing pages | `/.../applied-technology-pathway` |
| 4+ | 1.x.x.x.x+ | Content pages | `/.../automotive-specialist` |

### 3.3 Edge Cases

| Scenario | Behavior | URI View Action |
|----------|----------|-----------------|
| Root page (1.0) | Slug is `/` | Display as site root |
| Multiple root nodes | Each starts a separate tree | Show as parallel hierarchies |
| Orphan pages | Parent doesn't exist in DB | Flag with warning badge |
| Archived pages | Excluded from tree | Optional toggle to view (affects redirects) |
| Deep nesting (5+) | Valid but potentially problematic | Yellow warning indicator |
| Missing slug | Page has no slug defined | Red error indicator |

---

## 4. User Personas & Workflows

### 4.1 Content Strategist (Primary — ~40% of users)

**Goals**: Map old site structure to new URLs, plan redirects, ensure consistency

**Workflow in URI Pattern View**:
1. Open URI Pattern View filtered to "not_started" status
2. Scan hierarchical URL structure for naming inconsistencies
3. Identify pages missing slugs or with misaligned URLs
4. Bulk edit URI segments (e.g., rename `/old-name` → `/new-name` across a branch)
5. Export URI tree for external stakeholder review

**Pain Points Solved**:
- No more switching between Tree View (hierarchy) and Table View (details)
- Full URI path visible without scrolling up the tree
- Bulk rename capability for URL segments

### 4.2 SEO Specialist (~25% of users)

**Goals**: Optimize URL structure for search ranking and semantic meaning

**Workflow**:
1. Filter by validation status → "warnings only"
2. Scan for overly deep hierarchies (5+ segments)
3. Identify non-semantic slugs (IDs instead of words)
4. Check for duplicate slugs at the same depth level
5. Generate URL structure audit report

**Pain Points Solved**:
- Automated conflict detection for duplicate slugs
- URL depth and length statistics at a glance
- Semantic quality indicators per segment

### 4.3 Developer (~20% of users)

**Goals**: Implement routing, verify URL structure, generate redirect configs

**Workflow**:
1. Copy full URI paths to clipboard (one-click)
2. Filter by page style for template-specific routing rules
3. Export routes as JSON for route configuration
4. Export .htaccess rules for redirect implementation
5. Verify parent-child URL continuity

**Pain Points Solved**:
- One-click URI copying (vs. manual copy from table)
- Structured export for route generation
- .htaccess redirect rule generation

### 4.4 QA Tester (~15% of users)

**Goals**: Verify links, test redirects, validate page accessibility

**Workflow**:
1. Filter by status → "migration_complete" or "qa_links"
2. View old URL → new URL redirect mapping
3. Check redirect chain depth
4. Mark verified redirect paths
5. Report broken or circular redirects

---

## 5. UX & Visual Design

### 5.1 Primary Layout: URI Tree with Breadcrumb Paths

The URI Pattern View renders pages in a **breadcrumb-path format** with monospace URI display:

```
/
├─ /degrees-and-programs                                   [1.1]  Landing Page    ● Published    MAC
│  ├─ /degrees-and-programs/degrees-and-certificates       [1.1.1] Pathway        ● Drafting     RCC
│  │  ├─ /.../applied-technology-pathway                   [1.1.1.1] Pathway      ● Not Started  RCC
│  │  │  ├─ /.../automotive-specialist                     [1.1.1.1.1] Overview   ● Approved     MAC
│  │  │  │  ├─ /.../prerequisites-and-requirements         [1.1.1.1.1.1] Child   ● Review       MAC
│  │  │  │  ├─ /.../application-process                    [1.1.1.1.1.2] Child   ● Drafting     MAC
│  │  │  │  └─ /.../career-and-salary-outlook              [1.1.1.1.1.3] Child   ● Published    MAC
```

### 5.2 Row Components

Each URI row displays:

```
[▶ Toggle] [☐ Select] [URI Path (monospace)]  [Page ID]  [Style Icon]  [Status Badge]  [Owner Badge]  [Copy Button]
```

**Visual indicators**:
- **Depth color bars**: Left border gradient showing nesting level (blue → green → purple → yellow)
- **Page style icons**: Home, LayoutDashboard, Layout, GitBranch, FileText, File (reuse existing)
- **Status dots**: Colored circle matching existing status scheme
- **Validation badges**: Green checkmark (valid), yellow warning, red error

### 5.3 Floating Breadcrumb Header

When scrolling, a sticky breadcrumb trail shows the current context:

```
/ → degrees-and-programs → degrees-and-certificates → applied-technology-pathway
```

Each segment is clickable to navigate/jump within the tree.

### 5.4 Display Modes

| Mode | Description | Best For |
|------|-------------|----------|
| **Tree** (default) | Hierarchical indent with expand/collapse | Navigation, overview |
| **Flat** | All URIs listed with full paths, sortable | Search, audit |
| **Breadcrumb** | Each page shown as full breadcrumb trail | Stakeholder presentations |

### 5.5 Color Coding

**By Migration Status** (reuses existing `STATUS_CONFIG`):
- Gray: not_started
- Blue: content_drafting
- Yellow: content_review
- Light Green: content_approved
- Purple: migration_in_progress
- Indigo: migration_complete
- Orange/Amber/Teal: QA phases
- Emerald: published
- Red: blocked

**By URI Depth** (new, left border):
- Level 1: Blue (`border-blue-400`)
- Level 2: Green (`border-green-400`)
- Level 3: Purple (`border-purple-400`)
- Level 4+: Yellow (`border-yellow-400`)

---

## 6. Content Strategy Use Cases

### 6.1 Content Audit — Complete URL Inventory
- View all URLs organized by hierarchy
- Filter by missing slugs to find gaps
- Compare page names against slug segments for alignment
- Export full inventory as CSV for external review

### 6.2 Gap Analysis — Missing Pages
- Export URI pattern to CSV, compare against analytics data
- Identify URLs with traffic not captured in page inventory
- Spot hierarchy gaps (e.g., parent section exists but expected children are missing)

### 6.3 Redirect Mapping — Old → New URI
- Side-by-side display: old URL, new URL, decimal position
- Redirect status tracking: pending, active, verified
- .htaccess rule generation for implementation
- Redirect chain depth visualization

### 6.4 Content Governance — URL Naming Conventions
- Real-time validation against rules:
  - kebab-case only (no underscores, spaces, CamelCase)
  - Max segment length: 50 characters
  - No reserved words (admin, api, auth, dashboard)
  - Parallel naming for siblings
- Color-coded compliance: green (valid), yellow (warning), red (error)

### 6.5 Stakeholder Communication
- Breadcrumb-style view is non-technical and intuitive
- Export as formatted document for presentations
- Show migration progress overlaid on URL structure

---

## 7. Key UX Patterns

### 7.1 URI-Aware Search

```
Search: [/degrees-and-programs_____________]
Autocomplete suggestions:
  /degrees-and-programs
  /degrees-and-programs/degrees-and-certificates
  /degrees-and-programs/.../applied-technology-pathway
```

Search matches against: slug segments, page names, page IDs. Matching ancestors auto-expand.

### 7.2 URI-Specific Filters

| Filter | Type | Purpose |
|--------|------|---------|
| URI Depth | Range slider (1–10) | Find overly nested pages |
| Missing Slug | Checkbox | Pages without defined slugs |
| Validation Status | Dropdown | Valid / Warnings / Errors |
| Status | Multi-select | Migration status (reused) |
| Content Responsibility | Toggle | MAC / RCC (reused) |
| Migration Owner | Toggle | MAC / RCC (reused) |

### 7.3 Copy-to-Clipboard

Hover on any URI row reveals a copy button. Click copies the full relative path. Toast confirmation via `sonner`.

Copy format options (context menu):
- Full relative path: `/degrees-and-programs/degrees-and-certificates`
- Segment only: `/degrees-and-certificates`
- Page ID: `1.1.1`
- Page name: `Degrees & Certificates`

### 7.4 Bulk URI Editing

```
[Bulk Edit Mode] Toggle → Select multiple nodes

Bulk Update URI Segment:
  Find:    /old-program-name
  Replace: /new-program-name

[Preview Changes] → Shows N affected URIs with before/after
[Apply Updates] [Cancel]
```

### 7.5 Conflict Detection Indicators

```
⚠ Duplicate Slug Detected
├── 1.1.1.1.1 → prerequisites-and-requirements
└── 1.1.1.2.1 → prerequisites-and-requirements  [CONFLICT]
```

Conflict banner at top shows total count with "Show Conflicts Only" quick filter.

### 7.6 Drag-and-Drop Reordering

- Reorder siblings within same parent (updates `sort_order`, not `page_id`)
- Disabled while filters are active
- Visual drop indicator between rows

---

## 8. Technical Architecture

### 8.1 Current Codebase Analysis

**Existing patterns to follow**:
- Tree View: `/src/components/tree/` (SiteTree.tsx, TreeNode.tsx, TreeControls.tsx)
- Table View: `/src/components/table/` (PageTable.tsx, columns.tsx, filters.tsx)
- Data model: `/src/types/index.ts` (PageRow, PageNode interfaces)
- Tree builder: `/src/lib/tree-builder.ts` (natural sort, parent-child mapping)
- Constants: `/src/lib/constants.ts` (STATUS_CONFIG, PAGE_STYLE_ICONS)
- API: `/src/app/api/pages/tree/route.ts` (batched fetch, buildTree)
- Navigation: `/src/components/layout/Navbar.tsx` (NAV_LINKS array)

**Key dependencies already available**:
- `@tanstack/react-virtual` — virtualization for large lists
- `lucide-react` — icons (Globe icon for URI view nav)
- `sonner` — toast notifications (copy-to-clipboard feedback)
- shadcn/ui — Button, Input, DropdownMenu, Sheet, Badge, ScrollArea, Tooltip, Tabs

### 8.2 URI Generation Algorithm

```typescript
// /src/lib/uri-generator.ts

/**
 * Generate full URI paths for all nodes in the tree.
 * Traverses recursively, building paths from ancestor slugs.
 */
export function generateAllURIPaths(nodes: PageNode[]): Map<string, string> {
  const paths = new Map<string, string>();

  function traverse(node: PageNode, parentSegments: string[]) {
    const segment = node.slug
      ? node.slug.replace(/^\/|\/$/g, '')
      : node.pageId.split('.').pop()!;

    const segments = parentSegments.length === 0
      ? [segment]
      : [...parentSegments, segment];

    const uri = '/' + segments.join('/');
    paths.set(node.pageId, uri);

    for (const child of node.children) {
      traverse(child, segments);
    }
  }

  for (const root of nodes) {
    traverse(root, []);
  }

  return paths;
}
```

### 8.3 Conflict Detection Algorithm

```typescript
// /src/lib/uri-validator.ts

export interface URIConflict {
  depth: number;
  segment: string;
  conflictingPages: Array<{ pageId: string; name: string }>;
}

export function detectURIConflicts(nodes: PageNode[]): URIConflict[] {
  const segmentsByDepth = new Map<number, Map<string, PageNode[]>>();

  function traverse(node: PageNode, depth: number) {
    const segment = node.slug || node.pageId;

    if (!segmentsByDepth.has(depth)) segmentsByDepth.set(depth, new Map());
    const depthMap = segmentsByDepth.get(depth)!;

    if (!depthMap.has(segment)) depthMap.set(segment, []);
    depthMap.get(segment)!.push(node);

    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  for (const root of nodes) traverse(root, 0);

  const conflicts: URIConflict[] = [];
  segmentsByDepth.forEach((depthMap, depth) => {
    depthMap.forEach((pages, segment) => {
      if (pages.length > 1) {
        conflicts.push({
          depth,
          segment,
          conflictingPages: pages.map(p => ({ pageId: p.pageId, name: p.name })),
        });
      }
    });
  });

  return conflicts;
}
```

### 8.4 URI Validation Rules

```typescript
// /src/lib/uri-validator.ts

export const URI_VALIDATION_CONFIG = {
  ALLOWED_CHARS: /^[a-z0-9\-]+$/i,
  RESERVED_SEGMENTS: ['admin', 'api', 'auth', 'wp-admin', 'wp-content', 'dashboard', 'account', 'settings'],
  MAX_SEGMENT_LENGTH: 50,
  WARN_SEGMENT_LENGTH: 45,
  MAX_PATH_LENGTH: 255,
  MAX_DEPTH: 5,
  WARN_DEPTH: 4,
  OPTIMAL_DEPTH: 3,
};

export interface URIValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  segmentCount: number;
  maxSegmentLength: number;
}

export function validateURI(uri: string): URIValidation {
  const warnings: string[] = [];
  const errors: string[] = [];
  const segments = uri.split('/').filter(Boolean);

  if (segments.length > URI_VALIDATION_CONFIG.MAX_DEPTH)
    warnings.push(`Deep nesting (${segments.length} segments, recommended ≤${URI_VALIDATION_CONFIG.OPTIMAL_DEPTH})`);

  for (const seg of segments) {
    if (seg.length > URI_VALIDATION_CONFIG.MAX_SEGMENT_LENGTH)
      errors.push(`Segment "${seg}" exceeds ${URI_VALIDATION_CONFIG.MAX_SEGMENT_LENGTH} chars`);
    if (seg.length > URI_VALIDATION_CONFIG.WARN_SEGMENT_LENGTH)
      warnings.push(`Segment "${seg}" is long (${seg.length} chars)`);
    if (!URI_VALIDATION_CONFIG.ALLOWED_CHARS.test(seg))
      errors.push(`Segment "${seg}" contains invalid characters`);
    if (URI_VALIDATION_CONFIG.RESERVED_SEGMENTS.includes(seg.toLowerCase()))
      errors.push(`Segment "${seg}" is a reserved word`);
  }

  if (uri.length > URI_VALIDATION_CONFIG.MAX_PATH_LENGTH)
    errors.push(`Full path exceeds ${URI_VALIDATION_CONFIG.MAX_PATH_LENGTH} characters`);

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    segmentCount: segments.length,
    maxSegmentLength: Math.max(0, ...segments.map(s => s.length)),
  };
}
```

### 8.5 Component Architecture

```
/src/components/uri/
├── URIPatternView.tsx          Main container (~400-500 lines)
│   ├── Manages state (expanded, selected, search, filters)
│   ├── Generates URI map (memoized)
│   ├── Detects conflicts (memoized)
│   ├── Renders URIFilters + URIConflictBanner + URINode list
│   └── Integrates with PageDetailPanel
│
├── URINode.tsx                 Individual row (~180 lines)
│   ├── Toggle expand/collapse
│   ├── Selection checkbox
│   ├── URI path display (monospace)
│   ├── Page ID, status badge, owner badges
│   ├── Copy-to-clipboard button
│   ├── Validation indicator
│   └── Recursive children rendering
│
├── URISegment.tsx              Path segment component (~100 lines)
│   ├── Clickable segment text
│   ├── Hover state
│   └── Monospace styling
│
├── URIFilters.tsx              Toolbar (~250 lines)
│   ├── Search input (URI-aware)
│   ├── Status filter (reused)
│   ├── Responsibility filter (reused)
│   ├── Depth range filter (new)
│   ├── Validation status filter (new)
│   ├── Display mode toggle (tree/flat/breadcrumb)
│   ├── Expand to Depth selector
│   └── Export button
│
├── URIConflictBanner.tsx       Alert banner (~100 lines)
│   ├── Conflict count display
│   ├── List of conflicting pages
│   └── "Show Conflicts Only" quick filter
│
└── URIExporter.tsx             Export utilities (~200 lines)
    ├── CSV export
    ├── JSON export
    └── .htaccess redirect rules
```

### 8.6 State Management

Follows existing React hooks pattern (no state library needed):

```typescript
// URIPatternView.tsx state
const [expanded, setExpanded] = useState<Set<string>>(new Set());
const [selected, setSelected] = useState<Set<string>>(new Set());
const [search, setSearch] = useState('');
const [statusFilter, setStatusFilter] = useState<MigrationStatus[]>([]);
const [responsibilityFilter, setResponsibilityFilter] = useState<ContentResponsibility[]>([]);
const [depthFilter, setDepthFilter] = useState<[number, number]>([1, 10]);
const [showConflictsOnly, setShowConflictsOnly] = useState(false);
const [showFullPaths, setShowFullPaths] = useState(false);
const [displayMode, setDisplayMode] = useState<'tree' | 'flat' | 'breadcrumb'>('tree');
const [detailPageId, setDetailPageId] = useState<string | null>(null);

// Memoized derived state
const uriMap = useMemo(() => generateAllURIPaths(tree), [tree]);
const conflicts = useMemo(() => detectURIConflicts(tree), [tree]);
```

### 8.7 API Integration

**No new API endpoints required.** The existing `/api/pages/tree` endpoint provides all data needed. URI generation, validation, and conflict detection are all client-side operations.

**Existing endpoints reused**:
- `GET /api/pages/tree` — Nested tree data for URI generation
- `GET /api/pages/[id]` — Detail panel
- `PATCH /api/pages/[id]` — Slug editing
- `PATCH /api/pages/bulk` — Bulk slug updates (extend for URI edits)

### 8.8 Performance Strategy

For sitemaps with 1000+ pages:

1. **Virtualization**: Use `@tanstack/react-virtual` (already in dependencies)
   ```typescript
   const virtualizer = useVirtualizer({
     count: filteredNodes.length,
     getScrollElement: () => parentRef.current,
     estimateSize: () => 48,
     overscan: 10,
   });
   ```

2. **Memoization**: `React.memo()` on URINode, `useMemo` for URI map and conflicts

3. **Lazy expansion**: Only generate URIs for visible/expanded nodes

4. **Search debounce**: 300ms debounce on search input

---

## 9. Implementation Plan

### 9.1 Phase 1 — Foundation & Utilities (Day 1)

| Step | File | Action | Lines |
|------|------|--------|-------|
| 1.1 | `/src/lib/uri-generator.ts` | Create URI generation utilities | ~150 |
| 1.2 | `/src/lib/uri-validator.ts` | Create validation + conflict detection | ~150 |
| 1.3 | `/src/lib/uri-exporter.ts` | Create export utilities (CSV, JSON, .htaccess) | ~200 |
| 1.4 | `/src/types/index.ts` | Add URI-related TypeScript interfaces | ~50 |

**New types to add**:
```typescript
export interface URIConflict {
  depth: number;
  segment: string;
  conflictingPages: Array<{ pageId: string; name: string }>;
}

export interface URIValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  segmentCount: number;
  maxSegmentLength: number;
}

export interface URIExportData {
  pageId: string;
  pageName: string;
  currentURI: string;
  status: MigrationStatus;
  depth: number;
  parentId?: string;
  slug: string | null;
  conflicts: string[];
  contentResponsibility: ContentResponsibility | null;
  migrationOwner: ContentResponsibility | null;
}
```

### 9.2 Phase 2 — Core Components (Days 2–3)

| Step | File | Action | Lines |
|------|------|--------|-------|
| 2.1 | `/src/components/uri/URINode.tsx` | Individual URI row component | ~180 |
| 2.2 | `/src/components/uri/URISegment.tsx` | Path segment display | ~100 |
| 2.3 | `/src/components/uri/URIFilters.tsx` | Filter toolbar | ~250 |
| 2.4 | `/src/components/uri/URIConflictBanner.tsx` | Conflict alert banner | ~100 |
| 2.5 | `/src/components/uri/URIExporter.tsx` | Export UI component | ~200 |
| 2.6 | `/src/components/uri/URIPatternView.tsx` | Main container component | ~450 |

**URIPatternView structure** (mirrors SiteTree.tsx):
```typescript
export function URIPatternView({ tree, onOpenDetail }: URIPatternViewProps) {
  // 1. State declarations
  // 2. Memoized URI map + conflicts
  // 3. Filter logic (reuse patterns from SiteTree)
  // 4. Render: URIFilters → URIConflictBanner → ScrollArea → URINode list
}
```

**URINode structure** (mirrors TreeNode.tsx):
```typescript
export function URINode({ node, uri, depth, ... }: URINodeProps) {
  // 1. Chevron toggle (expand/collapse)
  // 2. Selection checkbox
  // 3. Page style icon (from PAGE_STYLE_ICONS)
  // 4. URI path in monospace
  // 5. Page ID (small, muted)
  // 6. Status badge
  // 7. Responsibility badges
  // 8. Copy button
  // 9. Validation indicator
  // 10. Recursive children
}
```

### 9.3 Phase 3 — Route & Navigation (Day 3)

| Step | File | Action | Lines |
|------|------|--------|-------|
| 3.1 | `/src/app/uri/page.tsx` | Create page route (mirrors /tree/page.tsx) | ~70 |
| 3.2 | `/src/components/layout/Navbar.tsx` | Add URI View to NAV_LINKS | ~3 |
| 3.3 | `/src/lib/constants.ts` | Add URI validation constants | ~20 |

**Navbar update**:
```typescript
const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tree", label: "Tree View", icon: Network },
  { href: "/table", label: "Table View", icon: Table2 },
  { href: "/uri", label: "URI View", icon: Globe },  // ADD
];
```

**Page route** (same pattern as tree/page.tsx):
```typescript
export default function URIPage() {
  const [tree, setTree] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailPageId, setDetailPageId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pages/tree")
      .then(res => res.json())
      .then(json => setTree(json.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <URIPatternView tree={tree} onOpenDetail={setDetailPageId} />
      <PageDetailPanel pageId={detailPageId} open={!!detailPageId} onClose={() => setDetailPageId(null)} />
    </>
  );
}
```

### 9.4 Phase 4 — Testing & Polish (Day 4)

| Step | Action |
|------|--------|
| 4.1 | Unit tests for uri-generator.ts (path generation) |
| 4.2 | Unit tests for uri-validator.ts (validation rules, conflict detection) |
| 4.3 | Unit tests for uri-exporter.ts (CSV, JSON, .htaccess output) |
| 4.4 | Integration test: URIPatternView renders, filters, searches |
| 4.5 | Keyboard navigation (Tab, Enter, Arrow keys) |
| 4.6 | ARIA labels and screen reader support |
| 4.7 | Performance testing with large datasets |

---

## 10. File Manifest

### New Files to Create (10 files, ~1,900 lines)

```
src/lib/uri-generator.ts                        (~150 lines)
src/lib/uri-validator.ts                         (~150 lines)
src/lib/uri-exporter.ts                          (~200 lines)
src/components/uri/URIPatternView.tsx             (~450 lines)
src/components/uri/URINode.tsx                    (~180 lines)
src/components/uri/URISegment.tsx                 (~100 lines)
src/components/uri/URIFilters.tsx                 (~250 lines)
src/components/uri/URIConflictBanner.tsx           (~100 lines)
src/components/uri/URIExporter.tsx                (~200 lines)
src/app/uri/page.tsx                              (~70 lines)
```

### Existing Files to Modify (3 files, ~50 lines)

```
src/types/index.ts                               ADD: URI interfaces (~50 lines)
src/components/layout/Navbar.tsx                  UPDATE: NAV_LINKS (+1 entry)
src/lib/constants.ts                             ADD: URI_VALIDATION_CONFIG (~20 lines)
```

### Reusable Code from Existing Views

| Source | What to Reuse |
|--------|--------------|
| `tree/SiteTree.tsx` | Search matching, filter accumulation, selection state, expand/collapse |
| `tree/TreeControls.tsx` | Status filter dropdown, responsibility filter, toggle patterns |
| `tree/TreeNode.tsx` | Chevron toggle, checkbox, badge rendering |
| `table/filters.tsx` | Filter component structure, multi-select patterns |
| `lib/tree-builder.ts` | Natural sort algorithm (`naturalSortPageId`) |
| `lib/constants.ts` | `STATUS_CONFIG`, `PAGE_STYLE_ICONS` |

---

## 11. Phased Rollout

### Phase 1 — MVP (Week 1)
- Basic URI Pattern View with hierarchical expand/collapse
- URI path generation from tree structure
- URI-segment search with ancestor auto-expand
- Status, responsibility, and depth filters
- Integration with existing PageDetailPanel
- Copy-to-clipboard for URIs

### Phase 2 — Enhanced Features (Week 2)
- URI conflict detection with banner alerts
- Validation indicators (depth warnings, naming errors)
- Bulk slug editing dialog
- Multiple display modes (tree, flat, breadcrumb)
- Breadcrumb floating header
- CSV and JSON export

### Phase 3 — Advanced (Week 3)
- .htaccess redirect rule export
- Redirect mapping view (old → new URI)
- URI depth statistics dashboard
- Drag-and-drop sibling reordering
- Semantic slug quality scoring
- SEO audit report generation

### Success Metrics

| Metric | Measurement |
|--------|-------------|
| Adoption | % of team members using URI View weekly |
| Efficiency | Time to identify URL inconsistencies (target: <5 min) |
| Quality | Reduction in duplicate slug errors post-migration |
| Coverage | % of pages with validated, compliant URIs |
| Stakeholder | Non-technical users can understand site structure from URI view |

---

## Appendix: Cross-Team Agreement

All three research teams independently converged on these key decisions:

1. **Reuse existing `/api/pages/tree` endpoint** — no new API needed
2. **Follow existing component patterns** from Tree View and Table View
3. **Client-side URI generation** — O(n) tree traversal, memoized
4. **Virtualization required** for large sitemaps (using @tanstack/react-virtual)
5. **No database schema changes** for Phase 1-2
6. **Globe icon** (`lucide-react`) for navigation
7. **Phased rollout** starting with core tree display, adding validation and export iteratively

**Estimated total implementation**: 4–5 days for Phase 1 MVP, 2 additional weeks for full feature set.
