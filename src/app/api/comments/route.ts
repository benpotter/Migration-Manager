import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/comments?pageId=... - List comments for a page
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const pageId = request.nextUrl.searchParams.get("pageId");
  if (!pageId) {
    return NextResponse.json({ data: null, error: "pageId query param is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .eq("page_id", pageId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error('[GET /api/comments]', error);
    return NextResponse.json({ data: null, error: "Failed to fetch comments" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], error: null });
}

// POST /api/comments - Create a comment
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  // Check editor+ role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "editor"].includes(profile.role)) {
    return NextResponse.json({ data: null, error: "Forbidden: editor role required" }, { status: 403 });
  }

  const body = await request.json();
  const { page_id, content } = body as { page_id: string; content: string };

  if (!page_id || !content) {
    return NextResponse.json(
      { data: null, error: "page_id and content are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ page_id, user_id: user.id, content })
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .single();

  if (error) {
    console.error('[POST /api/comments]', error);
    return NextResponse.json({ data: null, error: "Failed to create comment" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
