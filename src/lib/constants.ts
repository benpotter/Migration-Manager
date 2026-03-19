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
export const MIGRATION_STATUSES = [
  "not_started",
  "content_drafting",
  "content_review",
  "content_approved",
  "migration_in_progress",
  "migration_complete",
  "qa_design",
  "qa_content",
  "qa_links",
  "published",
  "blocked",
] as const;

export const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string; order: number }
> = {
  not_started: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: "Not Started",
    order: 0,
  },
  content_drafting: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "Drafting",
    order: 1,
  },
  content_review: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "In Review",
    order: 2,
  },
  content_approved: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Approved",
    order: 3,
  },
  migration_in_progress: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    label: "Migrating",
    order: 4,
  },
  migration_complete: {
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    label: "Migrated",
    order: 5,
  },
  qa_design: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "Design QA",
    order: 6,
  },
  qa_content: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    label: "Content QA",
    order: 7,
  },
  qa_links: {
    bg: "bg-teal-100",
    text: "text-teal-700",
    label: "Link QA",
    order: 8,
  },
  published: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "Published",
    order: 9,
  },
  blocked: {
    bg: "bg-red-100",
    text: "text-red-700",
    label: "Blocked",
    order: 10,
  },
};

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
  { id: "blocked", label: "Blocked", filter: { status: ["blocked"] } },
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
