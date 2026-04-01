import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// PATCH /api/comments/[id] - Update own comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
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
    console.error("[PATCH /api/comments]", error);
    return NextResponse.json({ data: null, error: "Failed to update comment" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/comments/[id] - Delete own comment
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: can only delete own comments" }, { status: 403 });
  }

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[DELETE /api/comments]", error);
    return NextResponse.json({ data: null, error: "Failed to delete comment" }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true }, error: null });
}
