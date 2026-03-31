import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";
import { parseExcelBuffer } from "@/lib/excel-parser";
import { slugifyPageName } from "@/lib/page-id-generator";
import type { ImportResult } from "@/types";

// POST /api/p/[projectId]/import - Import parsed page data (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const result = await requireProjectRole(projectId, ["admin"]);
  if (isErrorResponse(result)) return result;
  const { user, supabase } = result;

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

  // Fetch existing pages by page_id, scoped to this project.
  // Also look up trailing-dot variants (e.g. "3.2.") to match old data.
  const pageIds = rows.map((r) => r.page_id);
  const pageIdsWithDots = pageIds.map((id) => id + ".");
  const allLookupIds = [...new Set([...pageIds, ...pageIdsWithDots])];
  const existingMap = new Map<string, string>();
  const lookupBatchSize = 500;

  for (let i = 0; i < allLookupIds.length; i += lookupBatchSize) {
    const batch = allLookupIds.slice(i, i + lookupBatchSize);
    const { data: existingPages } = await supabase
      .from("pages")
      .select("id, page_id")
      .eq("project_id", projectId)
      .in("page_id", batch);

    if (existingPages) {
      for (const p of existingPages) {
        // Normalize: map both "3.2." and "3.2" to the cleaned page_id
        const normalized = p.page_id.replace(/\.+$/, "");
        existingMap.set(normalized, p.id);
      }
    }
  }

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
      slug: row.slug || slugifyPageName(row.name),
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
      project_id: projectId,
      is_archived: false,
    };

    const existingId = existingMap.get(row.page_id);
    if (existingId) {
      toUpdate.push({ id: existingId, data: pageData });
    } else {
      toInsert.push(pageData);
    }
  }

  // Insert in chunks to isolate failures
  const insertBatchSize = 200;
  for (let i = 0; i < toInsert.length; i += insertBatchSize) {
    const batch = toInsert.slice(i, i + insertBatchSize);
    const { error: insertError } = await supabase
      .from("pages")
      .insert(batch);

    if (insertError) {
      errors.push({
        row: 0,
        pageId: null,
        field: "insert",
        message: `Batch insert failed (rows ${i + 1}-${i + batch.length}): ${insertError.message}`,
      });
    } else {
      rowsCreated += batch.length;
    }
  }

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

  // Log the import with project_id
  await supabase.from("import_logs").insert({
    filename: filename || "unknown",
    rows_imported: rows.length,
    rows_created: rowsCreated,
    rows_updated: rowsUpdated,
    errors: errors.length > 0 ? errors : null,
    imported_by: user.id,
    project_id: projectId,
  });

  const importResult: ImportResult = {
    filename: filename || "unknown",
    rowsImported: rows.length,
    rowsCreated,
    rowsUpdated,
    rowsArchived: 0,
    errors,
  };

  return NextResponse.json({ data: importResult }, { status: errors.length > 0 ? 207 : 200 });
}
