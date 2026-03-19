// Status enum
export type MigrationStatus =
  | "not_started"
  | "content_drafting"
  | "content_review"
  | "content_approved"
  | "migration_in_progress"
  | "migration_complete"
  | "qa_design"
  | "qa_content"
  | "qa_links"
  | "published"
  | "blocked";

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
}

// Stats for dashboard
export interface MigrationStats {
  totalPages: number;
  byStatus: Record<MigrationStatus, number>;
  byResponsibility: Record<string, number>;
  byPageStyle: Record<string, number>;
  byMigrationOwner: Record<string, number>;
  recentEdits: (PageEdit & { page_name?: string })[];
  recentComments: (Comment & { page_name?: string })[];
}
