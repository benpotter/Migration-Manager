import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";

// GET /api/p/[projectId]/pages/[id]/comments - List comments for a page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor", "viewer"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  // Verify page belongs to this project
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();

  if (!page) {
    return NextResponse.json({ data: null, error: "Page not found in this project" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .eq("page_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error('[GET /api/p/[projectId]/pages/[id]/comments]', error);
    return NextResponse.json({ data: null, error: "Failed to fetch comments" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], error: null });
}

// POST /api/p/[projectId]/pages/[id]/comments - Create a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; id: string }> }
) {
  const { projectId, id } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor"]);
  if (isErrorResponse(result)) return result;
  const { user, supabase } = result;

  // Verify page belongs to this project
  const { data: page } = await supabase
    .from("pages")
    .select("id")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();

  if (!page) {
    return NextResponse.json({ data: null, error: "Page not found in this project" }, { status: 404 });
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
    console.error('[POST /api/p/[projectId]/pages/[id]/comments]', error);
    return NextResponse.json({ data: null, error: "Failed to create comment" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
