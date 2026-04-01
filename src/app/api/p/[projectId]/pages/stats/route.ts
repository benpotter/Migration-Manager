import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";
import type { MigrationStats, PageRow } from "@/types";

// GET /api/p/[projectId]/pages/stats - Aggregate stats for dashboard
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor", "viewer"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  // Fetch all non-archived pages for aggregation, scoped to project
  type StatsPage = Pick<
    PageRow,
    "id" | "status" | "content_responsibility" | "page_style" | "migration_owner" | "name" | "is_blocked"
  >;
  const allPages: StatsPage[] = [];
  const batchSize = 1000;
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    const { data: batch, error: batchError } = await supabase
      .from("pages")
      .select("id, status, content_responsibility, page_style, migration_owner, name, is_blocked")
      .eq("project_id", projectId)
      .or("is_archived.is.null,is_archived.eq.false")
      .range(from, from + batchSize - 1);

    if (batchError) {
      console.error('[GET /api/p/[projectId]/pages/stats]', batchError);
      return NextResponse.json({ data: null, error: "Failed to fetch page stats" }, { status: 500 });
    }

    if (batch && batch.length > 0) {
      allPages.push(...(batch as StatsPage[]));
      from += batchSize;
      if (batch.length < batchSize) keepFetching = false;
    } else {
      keepFetching = false;
    }
  }

  // Compute aggregates
  const byStatus: Record<string, number> = {};
  const byResponsibility: Record<string, number> = {};
  const byPageStyle: Record<string, number> = {};
  const byMigrationOwner: Record<string, number> = {};
  let blockedCount = 0;

  for (const page of allPages) {
    byStatus[page.status] = (byStatus[page.status] || 0) + 1;

    if (page.is_blocked) blockedCount++;

    const resp = page.content_responsibility || "Unassigned";
    byResponsibility[resp] = (byResponsibility[resp] || 0) + 1;

    const style = page.page_style || "Unassigned";
    byPageStyle[style] = (byPageStyle[style] || 0) + 1;

    const owner = page.migration_owner || "Unassigned";
    byMigrationOwner[owner] = (byMigrationOwner[owner] || 0) + 1;
  }

  // Collect page IDs for scoping edits/comments
  const pageIds = allPages.map((p) => p.id);

  // Fetch recent edits scoped to project's pages
  const { data: recentEdits } = pageIds.length > 0
    ? await supabase
        .from("page_edits")
        .select("*, user:user_profiles(id, email, name, avatar_url, role), page:pages(name)")
        .in("page_id", pageIds)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  // Fetch recent comments scoped to project's pages
  const { data: recentComments } = pageIds.length > 0
    ? await supabase
        .from("comments")
        .select("*, user:user_profiles(id, email, name, avatar_url, role), page:pages(name)")
        .in("page_id", pageIds)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const edits = (recentEdits ?? []).map((e) => {
    const { page, ...rest } = e as Record<string, unknown>;
    return {
      ...rest,
      page_name: (page as { name: string } | null)?.name ?? undefined,
    };
  });

  const comments = (recentComments ?? []).map((c) => {
    const { page, ...rest } = c as Record<string, unknown>;
    return {
      ...rest,
      page_name: (page as { name: string } | null)?.name ?? undefined,
    };
  });

  const stats: MigrationStats = {
    totalPages: allPages.length,
    byStatus,
    byResponsibility,
    byPageStyle,
    byMigrationOwner,
    blockedCount,
    recentEdits: edits as MigrationStats["recentEdits"],
    recentComments: comments as MigrationStats["recentComments"],
  };

  return NextResponse.json({ data: stats, error: null });
}
