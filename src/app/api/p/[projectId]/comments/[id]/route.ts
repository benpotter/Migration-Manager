import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";

// PATCH /api/p/[projectId]/comments/[id] - Update own comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor"]);
  if (isErrorResponse(result)) return result;
  const { user, supabase } = result;

  // Fetch comment and verify it belongs to a page in this project
  const { data: existing } = await supabase
    .from("comments")
    .select("user_id, page_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Verify the comment's page belongs to this project
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", existing.page_id)
    .eq("project_id", projectId)
    .single();

  if (!page) {
    return NextResponse.json({ error: "Comment not found in this project" }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: can only edit own comments" }, { status: 403 });
  }

  const body = await request.json();
  const { content } = body as { content: string };

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .update({ content })
    .eq("id", id)
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .single();

  if (error) {
    console.error("[PATCH /api/p/comments]", error);
    return NextResponse.json({ data: null, error: "Failed to update comment" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null });
}

// DELETE /api/p/[projectId]/comments/[id] - Delete own comment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor"]);
  if (isErrorResponse(result)) return result;
  const { user, supabase } = result;

  const { data: existing } = await supabase
    .from("comments")
    .select("user_id, page_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Verify the comment's page belongs to this project
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", existing.page_id)
    .eq("project_id", projectId)
    .single();

  if (!page) {
    return NextResponse.json({ error: "Comment not found in this project" }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: can only delete own comments" }, { status: 403 });
  }

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[DELETE /api/p/comments]", error);
    return NextResponse.json({ data: null, error: "Failed to delete comment" }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true }, error: null });
}
