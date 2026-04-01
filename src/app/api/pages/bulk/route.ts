import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// PATCH /api/pages/bulk - Bulk update multiple pages
export async function PATCH(request: NextRequest) {
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
  const { ids, updates } = body as { ids: string[]; updates: Record<string, unknown> };

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "updates object is required" }, { status: 400 });
  }

  // Fetch current pages for audit logging
  const { data: currentPages } = await supabase
    .from("pages")
    .select("*")
    .in("id", ids);

  // Build edit log entries
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

  // Perform bulk update
  const { data, error } = await supabase
    .from("pages")
    .update(updates)
    .in("id", ids)
    .select();

  if (error) {
    console.error("[PATCH /api/pages/bulk]", error);
    return NextResponse.json({ data: null, error: "Failed to bulk update pages" }, { status: 500 });
  }

  // Insert edit log entries
  if (editEntries.length > 0) {
    await supabase.from("page_edits").insert(editEntries);
  }

  return NextResponse.json({
    data,
    updated: data?.length ?? 0,
  });
}
