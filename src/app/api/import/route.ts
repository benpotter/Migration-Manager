import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth";
import { parseExcelBuffer } from "@/lib/excel-parser";
import type { ParsedExcelRow, ImportResult } from "@/types";

// POST /api/import - Import parsed page data (admin only)
// Accepts an array of ParsedExcelRow objects and upserts into pages table.
// The Excel parsing is expected to happen client-side or via a separate parser;
// this endpoint receives already-parsed data.
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role (DB role or admin email list)
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const hasAdminRole = profile?.role === "admin";
  const hasAdminEmail = user.email && isAdminEmail(user.email);

  if (!hasAdminRole && !hasAdminEmail) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const { rows, errors: parseErrors } = parseExcelBuffer(buffer);
  const filename = file.name;

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found in file", errors: parseErrors },
      { status: 400 }
    );
  }

  const errors: ImportResult["errors"] = [...parseErrors];
  let rowsCreated = 0;
  let rowsUpdated = 0;

  // Fetch existing pages by page_id for upsert logic
  // Supabase defaults to 1000 rows — batch the lookup to handle large imports
  const pageIds = rows.map((r) => r.page_id);
  const existingMap = new Map<string, string>();
  const lookupBatchSize = 500; // keep URL length reasonable for .in() filter

  for (let i = 0; i < pageIds.length; i += lookupBatchSize) {
    const batch = pageIds.slice(i, i + lookupBatchSize);
    const { data: existingPages } = await supabase
      .from("pages")
      .select("id, page_id")
      .in("page_id", batch);

    if (existingPages) {
      for (const p of existingPages) {
        existingMap.set(p.page_id, p.id);
      }
    }
  }

  // Process rows: separate into inserts and updates
  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; data: Record<string, unknown> }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row.page_id || !row.name) {
      errors.push({
        row: i + 1,
        pageId: row.page_id || null,
        field: !row.page_id ? "page_id" : "name",
        message: `Missing required field: ${!row.page_id ? "page_id" : "name"}`,
      });
      continue;
    }

    const pageData: Record<string, unknown> = {
      page_id: row.page_id,
      name: row.name,
      type: row.type,
      slug: row.slug,
      source_url: row.source_url,
      content_draft_url: row.content_draft_url,
      page_style: row.page_style,
      design_file_url: row.design_file_url,
      content_notes: row.content_notes,
      content_responsibility: row.content_responsibility,
      content_author: row.content_author,
      content_approver: row.content_approver,
      status: row.status || "not_started",
      migration_owner: row.migration_owner,
      migrator: row.migrator,
      parent_page_id: row.parent_page_id,
      depth: row.depth ?? 1,
      sort_order: 0,
    };

    const existingId = existingMap.get(row.page_id);
    if (existingId) {
      toUpdate.push({ id: existingId, data: pageData });
    } else {
      toInsert.push(pageData);
    }
  }

  // Batch insert new pages
  if (toInsert.length > 0) {
    const { error: insertError, count } = await supabase
      .from("pages")
      .insert(toInsert);

    if (insertError) {
      errors.push({
        row: 0,
        pageId: null,
        field: "insert",
        message: `Batch insert failed: ${insertError.message}`,
      });
    } else {
      rowsCreated = count ?? toInsert.length;
    }
  }

  // Update existing pages one by one (Supabase doesn't support batch upsert with different values per row)
  for (const item of toUpdate) {
    const { error: updateError } = await supabase
      .from("pages")
      .update(item.data)
      .eq("id", item.id);

    if (updateError) {
      errors.push({
        row: 0,
        pageId: item.data.page_id as string,
        field: "update",
        message: updateError.message,
      });
    } else {
      rowsUpdated++;
    }
  }

  // Log the import
  await supabase.from("import_logs").insert({
    filename: filename || "unknown",
    rows_imported: rows.length,
    rows_created: rowsCreated,
    rows_updated: rowsUpdated,
    errors: errors.length > 0 ? errors : null,
    imported_by: user.id,
  });

  const result: ImportResult = {
    filename: filename || "unknown",
    rowsImported: rows.length,
    rowsCreated,
    rowsUpdated,
    rowsArchived: 0,
    errors,
  };

  return NextResponse.json({ data: result }, { status: errors.length > 0 ? 207 : 200 });
}
