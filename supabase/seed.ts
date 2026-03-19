/**
 * Seed script: Import the initial Excel data into the Supabase pages table.
 *
 * Usage:
 *   npx tsx supabase/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as dotenv from "dotenv";

// Load env from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Column mapping (same as in constants.ts)
const EXCEL_COLUMN_MAP: Record<string, string> = {
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

interface PageInsert {
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
  status: string;
  migration_owner: string | null;
  migrator: string | null;
  parent_page_id: string | null;
  depth: number;
  sort_order: number;
}

async function main() {
  const excelPath = path.resolve(__dirname, "Content_Tracker.xlsx");
  if (!fs.existsSync(excelPath)) {
    console.error(`Excel file not found at ${excelPath}`);
    process.exit(1);
  }

  console.log("Reading Excel file...");
  const buffer = fs.readFileSync(excelPath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: (string | number | null)[][] = XLSX.utils.sheet_to_json(
    sheet,
    { header: 1, defval: null, raw: false }
  );

  const headerRow = rawData[3] as (string | null)[];
  const dataRows = rawData.slice(4);

  // Build column index mapping
  const columnIndexMap: Record<string, number> = {};
  headerRow.forEach((header, index) => {
    if (!header) return;
    const trimmed = header.toString().trim();
    const internalField = EXCEL_COLUMN_MAP[trimmed];
    if (internalField) {
      columnIndexMap[internalField] = index;
    }
  });

  const get = (row: (string | number | null)[], field: string): string | null => {
    const idx = columnIndexMap[field];
    if (idx === undefined) return null;
    const val = row[idx];
    if (val === null || val === undefined || String(val).trim() === "") return null;
    return String(val).trim();
  };

  // Parse all rows
  const pages: PageInsert[] = [];
  // Track sibling order per parent for sort_order assignment
  const siblingCounters: Record<string, number> = {};

  for (const row of dataRows) {
    if (!row) continue;
    const pageId = get(row, "page_id");
    if (!pageId) continue;

    const segments = pageId.split(".");
    const depth = segments.length;
    const parentPageId = segments.length > 1 ? segments.slice(0, -1).join(".") : null;

    const parentKey = parentPageId || "__root__";
    siblingCounters[parentKey] = (siblingCounters[parentKey] || 0) + 1;
    const sortOrder = siblingCounters[parentKey] * 10;

    let designFileUrl = get(row, "design_file_url");
    if (designFileUrl === "Link") designFileUrl = null;

    let sourceUrl = get(row, "source_url");
    if (sourceUrl === "N/A") sourceUrl = null;

    let slug = get(row, "slug");
    if (slug === "N/A") slug = null;

    let pageStyle = get(row, "page_style");
    if (pageStyle === "N/A") pageStyle = null;

    pages.push({
      page_id: pageId,
      name: get(row, "name") || `Unnamed (${pageId})`,
      type: get(row, "type"),
      slug,
      source_url: sourceUrl,
      content_draft_url: get(row, "content_draft_url"),
      page_style: pageStyle,
      design_file_url: designFileUrl,
      content_notes: get(row, "content_notes"),
      content_responsibility: get(row, "content_responsibility"),
      content_author: get(row, "content_author"),
      content_approver: get(row, "content_approver"),
      status: "not_started",
      migration_owner: get(row, "migration_owner"),
      migrator: get(row, "migrator"),
      parent_page_id: parentPageId,
      depth,
      sort_order: sortOrder,
    });
  }

  console.log(`Parsed ${pages.length} pages. Inserting into database...`);

  // Insert in batches of 100
  const batchSize = 100;
  let created = 0;
  let errors = 0;

  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    const { error } = await supabase.from("pages").upsert(batch, {
      onConflict: "page_id",
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      created += batch.length;
      process.stdout.write(
        `\r  Inserted ${created}/${pages.length} pages...`
      );
    }
  }

  console.log(`\n\nSeed complete:`);
  console.log(`  Total parsed: ${pages.length}`);
  console.log(`  Inserted: ${created}`);
  console.log(`  Errors: ${errors}`);
}

main().catch(console.error);
