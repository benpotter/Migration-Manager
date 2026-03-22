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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
