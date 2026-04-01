import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";

// GET /api/p/[projectId]/import/logs - Get import history for this project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor", "viewer"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("import_logs")
    .select("*, user:user_profiles!imported_by(name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error('[GET /api/p/[projectId]/import/logs]', error);
    return NextResponse.json({ data: null, error: "Failed to fetch import logs" }, { status: 500 });
  }

  // Flatten user join for frontend compatibility
  const logs = (data ?? []).map((log) => ({
    id: log.id,
    filename: log.filename,
    rows_imported: log.rows_imported,
    rows_created: log.rows_created,
    rows_updated: log.rows_updated,
    rows_archived: log.rows_archived ?? 0,
    error_count: Array.isArray(log.errors) ? log.errors.length : 0,
    created_at: log.created_at,
    user_name: log.user?.name ?? null,
  }));

  return NextResponse.json({ data: logs, error: null });
}
