// Status type — loosened to string to support custom workflow stages per project.
// The default stages are defined in src/lib/workflow.ts (DEFAULT_WORKFLOW_STAGES).
export type MigrationStatus = string;

// Page style enum
export type PageStyle =
  | "Home"
  | "Top Landing Page"
  | "Secondary Landing Page"
  | "Pathway Page"
  | "Informational Page - Overview"
  | "Informational Page - Child"
  | "Informational Page - No Sidebar"
  | "Microsite";

export type ContentResponsibility = "MAC" | "RCC";
export type UserRole = "admin" | "editor" | "viewer";

// Database row type (flat, as stored in DB)
export interface PageRow {
  id: string;
  project_id?: string;
  page_id: string;
  name: string;
  type: string | null;
  slug: string | null;
  source_url: string | null;
  content_draft_url: string | null;
  page_style: PageStyle | null;
  design_file_url: string | null;
  content_notes: string | null;
  content_responsibility: ContentResponsibility | null;
  content_author: string | null;
  content_approver: string | null;
  status: MigrationStatus;
  migration_owner: ContentResponsibility | null;
  migrator: string | null;
  mc_template: string | null;
  parent_page_id: string | null;
  depth: number;
  sort_order: number;
  is_archived: boolean;
  // Blocked flag fields
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
  created_at: string;
  updated_at: string;
}

// Nested tree node
export interface PageNode {
  id: string;
  pageId: string;
  name: string;
  slug: string | null;
  pageStyle: PageStyle | null;
  status: MigrationStatus;
  contentResponsibility: ContentResponsibility | null;
  migrationOwner: ContentResponsibility | null;
  migrator: string | null;
  mcTemplate: string | null;
  isBlocked: boolean;
  blockedReason: string | null;
  childCount: number;
  children: PageNode[];
}

// User profile
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_superadmin?: boolean;
  created_at: string;
  updated_at: string;
}

// Filter state for tree/table views
export interface FilterState {
  search: string;
  status: MigrationStatus[];
  pageStyle: PageStyle[];
  contentResponsibility: ContentResponsibility[];
  migrationOwner: ContentResponsibility[];
  showArchived: boolean;
  showBlocked?: boolean;
}

// Import result
export interface ImportResult {
  filename: string;
  rowsImported: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsArchived: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  pageId: string | null;
  field: string;
  message: string;
}

// Comment
export interface Comment {
  id: string;
  page_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

// Page edit audit entry
export interface PageEdit {
  id: string;
  page_id: string;
  user_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user?: UserProfile;
}

// Notification
export interface Notification {
  id: string;
  user_id: string;
  type: "status_change" | "comment_mention" | "assignment";
  message: string;
  page_id: string | null;
  project_id?: string;
  is_read: boolean;
  created_at: string;
}

// Parsed Excel row (before DB insert)
export interface ParsedExcelRow {
  page_id: string;
  name: string;
  type: string | null;
  slug: string | null;
  source_url: string | null;
  content_draft_url: string | null;
  page_style: string | null;
  design_file_url: string | null;
  content_notes: string | null;
  content_responsibility: string | null;
  content_author: string | null;
  content_approver: string | null;
  status: string | null;
  migration_owner: string | null;
  migrator: string | null;
  parent_page_id: string | null;
  depth: number;
  is_blocked?: boolean;
  blocked_reason?: string | null;
}

// URI conflict detection
export interface URIConflict {
  depth: number;
  segment: string;
  conflictingPages: { pageId: string; name: string }[];
}

// URI validation result
export interface URIValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  segmentCount: number;
  maxSegmentLength: number;
}

// URI export data (flattened for CSV/JSON/.htaccess)
export interface URIExportData {
  pageId: string;
  pageName: string;
  currentURI: string;
  status: MigrationStatus;
  depth: number;
  parentId?: string;
  slug: string;
  conflicts: string[];
  contentResponsibility: ContentResponsibility | null;
  migrationOwner: ContentResponsibility | null;
}

// Stats for dashboard
export interface MigrationStats {
  totalPages: number;
  byStatus: Record<string, number>;
  byResponsibility: Record<string, number>;
  byPageStyle: Record<string, number>;
  byMigrationOwner: Record<string, number>;
  blockedCount: number;
  recentEdits: (PageEdit & { page_name?: string })[];
  recentComments: (Comment & { page_name?: string })[];
}

// Project summary for homepage cards
export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  client_name: string | null;
  color: string;
  status: ProjectStatus;
  totalPages: number;
  publishedCount: number;
  blockedCount: number;
  lastActivityAt: string | null;
}

// === Multi-project types (Phase 1) ===

export type ProjectStatus = "active" | "completed" | "archived";
export type DataMode = "import" | "direct_entry" | "hybrid";

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
  created_by: string | null;
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
  user?: UserProfile;
  project?: Project;
}

export const DEFAULT_PROJECT_ID = "00000000-0000-0000-0000-000000000001";
