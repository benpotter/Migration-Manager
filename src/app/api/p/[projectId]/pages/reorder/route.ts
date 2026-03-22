import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";
import { generatePageId, depthFromPageId } from "@/lib/page-id-generator";

// PATCH /api/p/[projectId]/pages/reorder - Move a page to a new parent/position
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor"]);
  if (isErrorResponse(result)) return result;
  const { user, supabase } = result;

  const body = await request.json();
  const { pageId, newParentPageId, newSortOrder } = body as {
    pageId: string; // UUID of the page to move
    newParentPageId: string | null; // UUID of new parent (null = root)
    newSortOrder: number;
  };

  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  // Fetch the page being moved
  const { data: page } = await supabase
    .from("pages")
    .select("id, page_id, parent_page_id, depth")
    .eq("id", pageId)
    .eq("project_id", projectId)
    .single();

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Cycle detection: ensure newParent is not a descendant of pageId
  if (newParentPageId) {
    const visited = new Set<string>();
    let current = newParentPageId;
    while (current) {
      if (current === pageId) {
        return NextResponse.json(
          { error: "Cannot move a page under its own descendant" },
          { status: 400 }
        );
      }
      if (visited.has(current)) break;
      visited.add(current);

      const { data: parent } = await supabase
        .from("pages")
        .select("id, parent_page_id")
        .eq("id", current)
        .eq("project_id", projectId)
        .single();

      current = parent?.parent_page_id ?? null;
    }
  }

  // Get new parent's page_id string for regenerating page_id
  let newParentPageIdStr: string | null = null;
  if (newParentPageId) {
    const { data: newParent } = await supabase
      .from("pages")
      .select("page_id")
      .eq("id", newParentPageId)
      .eq("project_id", projectId)
      .single();

    if (!newParent) {
      return NextResponse.json({ error: "New parent not found" }, { status: 404 });
    }
    newParentPageIdStr = newParent.page_id;
  }

  // Get all existing page_ids for regeneration
  const { data: allPages } = await supabase
    .from("pages")
    .select("page_id")
    .eq("project_id", projectId);

  const existingIds = (allPages ?? []).map((p) => p.page_id);
  const newPageIdStr = generatePageId(newParentPageIdStr, existingIds);
  const newDepth = depthFromPageId(newPageIdStr);

  // Update the page
  const { error: updateError } = await supabase
    .from("pages")
    .update({
      parent_page_id: newParentPageId,
      page_id: newPageIdStr,
      depth: newDepth,
      sort_order: newSortOrder ?? 0,
    })
    .eq("id", pageId)
    .eq("project_id", projectId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Cascade depth recalculation for descendants
  async function recalcDescendants(parentUuid: string, parentPageIdStr: string) {
    const { data: children } = await supabase
      .from("pages")
      .select("id, page_id")
      .eq("parent_page_id", parentUuid)
      .eq("project_id", projectId);

    if (!children) return;

    for (const child of children) {
      const childNewPageId = generatePageId(
        parentPageIdStr,
        (await supabase.from("pages").select("page_id").eq("project_id", projectId)).data?.map(p => p.page_id) ?? []
      );
      const childNewDepth = depthFromPageId(childNewPageId);

      await supabase
        .from("pages")
        .update({ page_id: childNewPageId, depth: childNewDepth })
        .eq("id", child.id)
        .eq("project_id", projectId);

      await recalcDescendants(child.id, childNewPageId);
    }
  }

  await recalcDescendants(pageId, newPageIdStr);

  // Log the edit
  await supabase.from("page_edits").insert({
    page_id: pageId,
    user_id: user.id,
    field: "parent_page_id",
    old_value: page.parent_page_id,
    new_value: newParentPageId,
  });

  return NextResponse.json({ success: true });
}
