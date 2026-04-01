import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/pages/[id]/comments - List comments for a page
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
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .eq("page_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error('[GET /api/pages/[id]/comments]', error);
    return NextResponse.json({ data: null, error: "Failed to fetch comments" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], error: null });
}

// POST /api/pages/[id]/comments - Create a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content } = body as { content: string };

  if (!content) {
    return NextResponse.json({ data: null, error: "content is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ page_id: id, user_id: user.id, content })
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .single();

  if (error) {
    console.error('[POST /api/pages/[id]/comments]', error);
    return NextResponse.json({ data: null, error: "Failed to create comment" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
