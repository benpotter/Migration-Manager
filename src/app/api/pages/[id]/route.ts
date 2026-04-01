import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth";

// GET /api/pages/[id] - Get single page with comments and edits
export async function GET(
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

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Fetch comments with user profiles
  const { data: comments } = await supabase
    .from("comments")
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .eq("page_id", id)
    .order("created_at", { ascending: true });

  // Fetch recent edits with user profiles
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

// PATCH /api/pages/[id] - Update page fields and log edits
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

  // Check editor+ role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "editor"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden: editor role required" }, { status: 403 });
  }

  const body = await request.json();

  // Fetch current page for audit logging
  const { data: currentPage, error: fetchError } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !currentPage) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Build edit log entries for changed fields
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

  // Update the page
  const { data: updatedPage, error: updateError } = await supabase
    .from("pages")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("[PATCH /api/pages]", updateError);
    return NextResponse.json({ data: null, error: "Failed to update page" }, { status: 500 });
  }

  // Insert edit log entries
  if (editEntries.length > 0) {
    await supabase.from("page_edits").insert(editEntries);
  }

  return NextResponse.json({ data: updatedPage, error: null });
}

// DELETE /api/pages/[id] - Delete a page (admin only)
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

  // Check admin role
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

  const { error } = await supabase
    .from("pages")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[DELETE /api/pages]", error);
    return NextResponse.json({ data: null, error: "Failed to delete page" }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true }, error: null });
}
