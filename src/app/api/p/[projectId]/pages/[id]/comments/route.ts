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
    return NextResponse.json({ error: "Page not found in this project" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .eq("page_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return flat array — CommentThread expects res.json() to be Comment[]
  return NextResponse.json(data ?? []);
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
    return NextResponse.json({ error: "Page not found in this project" }, { status: 404 });
  }

  const body = await request.json();
  const { content } = body as { content: string };

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ page_id: id, user_id: user.id, content })
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return flat object — CommentThread expects res.json() to be Comment
  return NextResponse.json(data, { status: 201 });
}
