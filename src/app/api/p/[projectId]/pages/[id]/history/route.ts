import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";

// GET /api/p/[projectId]/pages/[id]/history - Get edit history for a page
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
    .from("page_edits")
    .select("*, user:user_profiles(id, email, name, avatar_url, role)")
    .eq("page_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return flat array — EditHistory expects res.json() to be PageEdit[]
  return NextResponse.json(data ?? []);
}
