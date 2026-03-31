import * as XLSX from "xlsx";
import { EXCEL_COLUMN_MAP } from "./constants";
import { inferParentFromSet } from "./tree-builder";
import type { ParsedExcelRow, ImportError } from "@/types";

/** Map Excel/SmartSheet status labels to internal status values.
 *  "blocked" is no longer a status — it's mapped to is_blocked flag during import. */
const STATUS_NORMALIZE: Record<string, string> = {
  "not started": "not_started",
  "drafting": "content_drafting",
  "content drafting": "content_drafting",
  "in review": "content_review",
  "content review": "content_review",
  "ready for approval": "content_review",
  "approved": "content_approved",
  "content approved": "content_approved",
  "in progress": "migration_in_progress",
  "migration in progress": "migration_in_progress",
  "ready for migration": "migration_in_progress",
  "migrating": "migration_in_progress",
  "migration complete": "migration_complete",
  "migrated": "migration_complete",
  "design qa": "qa_design",
  "design qa'd": "qa_design",
  "content qa": "qa_content",
  "link qa": "qa_links",
  "published": "published",
  "blocked": "__blocked__",
  "needs edits": "content_drafting",
  "mkt. checkpoint": "content_review",
};

export interface ExcelParseResult {
  rows: ParsedExcelRow[];
  errors: ImportError[];
  totalRows: number;
}

function normalizeStatus(raw: string | null): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return STATUS_NORMALIZE[key] ?? raw;
}

export function parseExcelBuffer(buffer: Buffer | ArrayBuffer): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawData: (string | number | null)[][] = XLSX.utils.sheet_to_json(
    sheet,
    { header: 1, defval: null, raw: false }
  );

  if (rawData.length < 5) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          pageId: null,
          field: "file",
          message: "File has fewer than 5 rows (need 3 metadata + 1 header + data)",
        },
      ],
      totalRows: 0,
    };
  }

  // Row 3 (index 3) is the header row
  const headerRow = rawData[3] as (string | null)[];
  const dataRows = rawData.slice(4);

  // Build column index mapping: internal field name → column index
  const columnIndexMap: Record<string, number> = {};
  headerRow.forEach((header, index) => {
    if (!header) return;
    const trimmed = header.toString().trim();
    const internalField = EXCEL_COLUMN_MAP[trimmed];
    if (internalField) {
      columnIndexMap[internalField] = index;
    }
  });

  const rows: ParsedExcelRow[] = [];
  const errors: ImportError[] = [];

  // First pass: collect all page IDs so we can resolve parents accurately
  const allPageIds = new Set<string>();
  for (const row of dataRows) {
    if (!row) continue;
    const idx = columnIndexMap["page_id"];
    if (idx === undefined) continue;
    const val = row[idx];
    if (val === null || val === undefined || String(val).trim() === "") continue;
    allPageIds.add(String(val).trim().replace(/\.+$/, ""));
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row) continue;

    const rowNum = i + 5; // 1-indexed: 3 skipped + 1 header + i

    const get = (field: string): string | null => {
      const idx = columnIndexMap[field];
      if (idx === undefined) return null;
      const val = row[idx];
      if (val === null || val === undefined || String(val).trim() === "") return null;
      return String(val).trim();
    };

    const rawPageId = get("page_id");
    if (!rawPageId) continue; // skip empty rows
    const pageId = rawPageId.replace(/\.+$/, "");

    // Compute parent_page_id and depth
    const segments = pageId.split(".");
    const depth = segments.length;
    const parentPageId = inferParentFromSet(pageId, allPageIds);

    // Handle design_file_url "Link" placeholder from SmartSheet
    let designFileUrl = get("design_file_url");
    if (designFileUrl === "Link") {
      errors.push({
        row: rowNum,
        pageId,
        field: "design_file_url",
        message: 'SmartSheet "Link" placeholder — URL stripped on export',
      });
      designFileUrl = null;
    }

    // Validate required fields
    const name = get("name");
    if (!name) {
      errors.push({
        row: rowNum,
        pageId,
        field: "name",
        message: "Missing required field: PAGE NAME",
      });
    }

    const contentResponsibility = get("content_responsibility");
    if (!contentResponsibility) {
      errors.push({
        row: rowNum,
        pageId,
        field: "content_responsibility",
        message: "Missing required field: CONTENT RESPONSIBILITY",
      });
    }

    const migrationOwner = get("migration_owner");
    if (!migrationOwner) {
      errors.push({
        row: rowNum,
        pageId,
        field: "migration_owner",
        message: "Missing required field: MIGRATION OWNER",
      });
    }

    // Handle source_url "N/A"
    let sourceUrl = get("source_url");
    if (sourceUrl === "N/A") sourceUrl = null;

    // Handle slug "N/A"
    let slug = get("slug");
    if (slug === "N/A") slug = null;

    // Handle page_style "N/A"
    let pageStyle = get("page_style");
    if (pageStyle === "N/A") pageStyle = null;

    // Handle "blocked" → flag conversion
    let normalizedStatus = normalizeStatus(get("status"));
    let isBlocked = false;
    if (normalizedStatus === "__blocked__") {
      isBlocked = true;
      normalizedStatus = "not_started"; // default stage when blocked status imported
    }

    const parsedRow: ParsedExcelRow = {
      page_id: pageId,
      name: name || `Unnamed Page (${pageId})`,
      type: get("type"),
      slug,
      source_url: sourceUrl,
      content_draft_url: get("content_draft_url"),
      page_style: pageStyle,
      design_file_url: designFileUrl,
      content_notes: get("content_notes"),
      content_responsibility: contentResponsibility,
      content_author: get("content_author"),
      content_approver: get("content_approver"),
      status: normalizedStatus,
      migration_owner: migrationOwner,
      migrator: get("migrator"),
      parent_page_id: parentPageId,
      depth,
      is_blocked: isBlocked,
    };

    rows.push(parsedRow);
  }

  // Deduplicate by page_id (last row wins)
  const deduped = new Map<string, ParsedExcelRow>();
  for (const row of rows) {
    if (deduped.has(row.page_id)) {
      errors.push({
        row: 0,
        pageId: row.page_id,
        field: "page_id",
        message: `Duplicate page_id "${row.page_id}" — using last occurrence`,
      });
    }
    deduped.set(row.page_id, row);
  }

  return { rows: Array.from(deduped.values()), errors, totalRows: dataRows.length };
}

// Alias for backward compatibility
export const parseExcelFile = parseExcelBuffer;
