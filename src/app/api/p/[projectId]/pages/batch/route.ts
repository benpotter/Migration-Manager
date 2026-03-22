import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";

// PATCH /api/p/[projectId]/pages/batch - Batch update multiple pages
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor"]);
  if (isErrorResponse(result)) return result;
  const { user, supabase } = result;

  const body = await request.json();
  // Accept both "pageIds" (frontend convention) and "ids" (bulk route convention)
  const { ids, pageIds, updates } = body as {
    ids?: string[];
    pageIds?: string[];
    updates: Record<string, unknown>;
  };
  const resolvedIds = ids ?? pageIds;

  if (!resolvedIds || !Array.isArray(resolvedIds) || resolvedIds.length === 0) {
    return NextResponse.json({ error: "ids or pageIds array is required" }, { status: 400 });
  }

  if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "updates object is required" }, { status: 400 });
  }

  // Fetch current pages for audit logging, scoped to project
  const { data: currentPages } = await supabase
    .from("pages")
    .select("*")
    .in("id", resolvedIds)
    .eq("project_id", projectId);

  const editableFields = [
    "name", "type", "slug", "source_url", "content_draft_url", "page_style",
    "design_file_url", "content_notes", "content_responsibility", "content_author",
    "content_approver", "status", "migration_owner", "migrator", "mc_template",
    "parent_page_id", "depth", "sort_order", "is_archived",
  ];

  const editEntries: {
    page_id: string;
    user_id: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
  }[] = [];

  if (currentPages) {
    for (const page of currentPages) {
      for (const field of editableFields) {
        if (field in updates && updates[field] !== page[field as keyof typeof page]) {
          editEntries.push({
            page_id: page.id,
            user_id: user.id,
            field,
            old_value: page[field as keyof typeof page] != null
              ? String(page[field as keyof typeof page])
              : null,
            new_value: updates[field] != null ? String(updates[field]) : null,
          });
        }
      }
    }
  }

  // Perform bulk update scoped to project
  const { data, error } = await supabase
    .from("pages")
    .update(updates)
    .in("id", resolvedIds)
    .eq("project_id", projectId)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (editEntries.length > 0) {
    await supabase.from("page_edits").insert(editEntries);
  }

  return NextResponse.json({
    data,
    updated: data?.length ?? 0,
  });
}
