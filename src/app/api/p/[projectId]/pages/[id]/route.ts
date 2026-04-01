import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";

// GET /api/p/[projectId]/pages/[id] - Get single page with comments and edits
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor", "viewer"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .eq("page_id", id)
    .order("created_at", { ascending: true });

  const { data: edits } = await supabase
    .from("page_edits")
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .eq("page_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    data: {
      ...page,
      comments: comments ?? [],
      edits: edits ?? [],
    },
  });
}

// PATCH /api/p/[projectId]/pages/[id] - Update page fields and log edits
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor"]);
  if (isErrorResponse(result)) return result;
  const { user, supabase } = result;

  const body = await request.json();

  // Fetch current page for audit logging
  const { data: currentPage, error: fetchError } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();

  if (fetchError || !currentPage) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const editableFields = [
    "name", "type", "slug", "source_url", "content_draft_url", "page_style",
    "design_file_url", "content_notes", "content_responsibility", "content_author",
    "content_approver", "status", "migration_owner", "migrator", "mc_template",
    "parent_page_id", "depth", "sort_order", "is_archived",
    "is_blocked", "blocked_reason", "blocked_at",
  ];

  const editEntries: {
    page_id: string;
    user_id: string;
    field: string;
    old_value: string | null;
    new_value: string | null;
  }[] = [];

  for (const field of editableFields) {
    if (field in body && body[field] !== currentPage[field]) {
      editEntries.push({
        page_id: id,
        user_id: user.id,
        field,
        old_value: currentPage[field] != null ? String(currentPage[field]) : null,
        new_value: body[field] != null ? String(body[field]) : null,
      });
    }
  }

  const { data: updatedPage, error: updateError } = await supabase
    .from("pages")
    .update(body)
    .eq("id", id)
    .eq("project_id", projectId)
    .select()
    .single();

  if (updateError) {
    console.error("[PATCH /api/p/pages]", updateError);
    return NextResponse.json({ data: null, error: "Failed to update page" }, { status: 500 });
  }

  if (editEntries.length > 0) {
    await supabase.from("page_edits").insert(editEntries);
  }

  return NextResponse.json({ data: updatedPage });
}

// DELETE /api/p/[projectId]/pages/[id] - Delete a page (admin only)
// Query param: ?cascade=true to also delete descendants
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;

  const result = await requireProjectRole(projectId, ["admin"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const cascade = request.nextUrl.searchParams.get("cascade") === "true";

  // Fetch the page to get its parent_page_id for orphaning children
  const { data: page } = await supabase
    .from("pages")
    .select("id, parent_page_id")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  if (cascade) {
    // Collect all descendant IDs recursively
    const idsToDelete = [id];
    const queue = [id];

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const { data: children } = await supabase
        .from("pages")
        .select("id")
        .eq("parent_page_id", parentId)
        .eq("project_id", projectId);

      if (children) {
        for (const child of children) {
          idsToDelete.push(child.id);
          queue.push(child.id);
        }
      }
    }

    const { error } = await supabase
      .from("pages")
      .delete()
      .in("id", idsToDelete)
      .eq("project_id", projectId);

    if (error) {
      console.error("[DELETE /api/p/pages cascade]", error);
      return NextResponse.json({ data: null, error: "Failed to delete pages" }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true, deleted: idsToDelete.length }, error: null });
  }

  // No cascade: orphan children to the deleted page's parent (or root)
  const { error: orphanError } = await supabase
    .from("pages")
    .update({ parent_page_id: page.parent_page_id })
    .eq("parent_page_id", id)
    .eq("project_id", projectId);

  if (orphanError) {
    console.error("[DELETE /api/p/pages orphan]", orphanError);
    return NextResponse.json({ data: null, error: "Failed to update child pages" }, { status: 500 });
  }

  const { error } = await supabase
    .from("pages")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) {
    console.error("[DELETE /api/p/pages]", error);
    return NextResponse.json({ data: null, error: "Failed to delete page" }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true, deleted: 1 }, error: null });
}
