import {
  Home,
  LayoutDashboard,
  Layout,
  GitBranch,
  FileText,
  File,
  FileX,
  Globe,
  type LucideIcon,
} from "lucide-react";

// ── Status ──────────────────────────────────────────────
// Default workflow stages (without "blocked" — now a flag on pages).
// Components should prefer reading stages from ProjectContext.workflowStages.
// This constant is kept as a global fallback for non-project contexts.
import { DEFAULT_WORKFLOW_STAGES, buildStatusConfig } from "./workflow";

export const MIGRATION_STATUSES = DEFAULT_WORKFLOW_STAGES.map((s) => s.id);

export const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string; order: number }
> = buildStatusConfig(DEFAULT_WORKFLOW_STAGES);

// Phase groupings for pipeline visualization
export const WORKFLOW_PHASES = [
  { id: "content", label: "Content" },
  { id: "migration", label: "Migration" },
  { id: "qa", label: "QA" },
  { id: "complete", label: "Complete" },
] as const;

// ── Page Styles ─────────────────────────────────────────
export const PAGE_STYLES = [
  "Home",
  "Top Landing Page",
  "Secondary Landing Page",
  "Pathway Page",
  "Informational Page - Overview",
  "Informational Page - Child",
  "Informational Page - No Sidebar",
  "Microsite",
] as const;

export const PAGE_STYLE_ICONS: Record<string, LucideIcon> = {
  Home: Home,
  "Top Landing Page": LayoutDashboard,
  "Secondary Landing Page": Layout,
  "Pathway Page": GitBranch,
  "Informational Page - Overview": FileText,
  "Informational Page - Child": File,
  "Informational Page - No Sidebar": FileX,
  Microsite: Globe,
};

// ── Content Responsibility ──────────────────────────────
export const CONTENT_RESPONSIBILITIES = ["MAC", "RCC"] as const;

// ── Roles ───────────────────────────────────────────────
export const USER_ROLES = ["admin", "editor", "viewer"] as const;

// ── Excel Import Column Mapping ─────────────────────────
export const EXCEL_COLUMN_MAP: Record<string, string> = {
  "PAGE ID": "page_id",
  "PAGE NAME": "name",
  TYPE: "type",
  "DESCRIPTIVE URL": "slug",
  "CURRENT SOURCE LINK": "source_url",
  "CONTENT DRAFT": "content_draft_url",
  "PAGE STYLE": "page_style",
  "DESIGN FILE REFERENCE": "design_file_url",
  "CONTENT NOTES (Optional)": "content_notes",
  "CONTENT RESPONSIBILITY": "content_responsibility",
  "CONTENT AUTHOR": "content_author",
  "CONTENT APPROVER": "content_approver",
  STATUS: "status",
  "MIGRATION OWNER": "migration_owner",
  MIGRATOR: "migrator",
};

// SmartSheet checkbox columns to IGNORE on import
export const IGNORED_EXCEL_COLUMNS = [
  "TEXT MIGRATED",
  "METADATA ADDED",
  "MEDIA ADDED",
  "ALT TEXT ADDED",
  "LINKS TESTED",
  "DESIGN QA'D",
  "CHECKING COPY",
  "LITE COPY CLEAN-UP",
  "INTERNAL LINKS",
  "EXTERNAL LINKS",
  "COMPONENTS",
  "HEADERS",
  "IMAGES/ALT TEXT",
  "META DATA",
  "PAGE LOCATION",
  "SIDEBAR",
];

// ── Quick Filters ───────────────────────────────────────
export const QUICK_FILTERS = [
  {
    id: "mac_content",
    label: "MAC Content",
    filter: { contentResponsibility: ["MAC"] },
  },
  {
    id: "rcc_content",
    label: "RCC Content",
    filter: { contentResponsibility: ["RCC"] },
  },
  { id: "blocked", label: "Blocked", filter: { showBlocked: true } },
  {
    id: "ready_for_qa",
    label: "Ready for QA",
    filter: { status: ["qa_design", "qa_content", "qa_links"] },
  },
  {
    id: "not_started",
    label: "Not Started",
    filter: { status: ["not_started"] },
  },
] as const;

// ── URI Validation ──────────────────────────────────────
export const URI_VALIDATION_CONFIG = {
  allowedCharsRegex: /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
  reservedSegments: [
    "admin",
    "api",
    "login",
    "logout",
    "auth",
    "static",
    "assets",
    "wp-admin",
    "wp-content",
    "node_modules",
  ],
  maxSegmentLength: 80,
  warnSegmentLength: 50,
  maxPathLength: 2048,
  maxDepth: 10,
  warnDepth: 5,
  optimalDepth: 3,
} as const;

// ── URI Depth Colors ────────────────────────────────────
export const URI_DEPTH_COLORS: Record<number, string> = {
  0: "border-l-blue-400",
  1: "border-l-green-400",
  2: "border-l-purple-400",
  3: "border-l-yellow-400",
  4: "border-l-pink-400",
  5: "border-l-cyan-400",
  6: "border-l-orange-400",
  7: "border-l-red-400",
};

// ── MC Templates ────────────────────────────────────────
export const MC_TEMPLATES = [
  "Home Page",
  "Landing Page",
  "Interior Page",
  "Interior Page - No Sidebar",
  "Program Overview",
  "Program Child",
  "Microsite",
  "Contact Directory",
] as const;
