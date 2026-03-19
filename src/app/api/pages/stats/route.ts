import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MigrationStats, PageRow } from "@/types";

// GET /api/pages/stats - Aggregate stats for dashboard
export async function GET() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all non-archived pages for aggregation (paginate past Supabase 1000-row default)
  type StatsPage = Pick<
    PageRow,
    "id" | "status" | "content_responsibility" | "page_style" | "migration_owner" | "name"
  >;
  const allPages: StatsPage[] = [];
  const batchSize = 1000;
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    const { data: batch, error: batchError } = await supabase
      .from("pages")
      .select("id, status, content_responsibility, page_style, migration_owner, name")
      .eq("is_archived", false)
      .range(from, from + batchSize - 1);

    if (batchError) {
      return NextResponse.json({ error: batchError.message }, { status: 500 });
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

  for (const page of allPages) {
    byStatus[page.status] = (byStatus[page.status] || 0) + 1;

    const resp = page.content_responsibility || "Unassigned";
    byResponsibility[resp] = (byResponsibility[resp] || 0) + 1;

    const style = page.page_style || "Unassigned";
    byPageStyle[style] = (byPageStyle[style] || 0) + 1;

    const owner = page.migration_owner || "Unassigned";
    byMigrationOwner[owner] = (byMigrationOwner[owner] || 0) + 1;
  }

  // Fetch recent edits with user and page name
  const { data: recentEdits } = await supabase
    .from("page_edits")
    .select("*, user:user_profiles(id, email, name, avatar_url, role), page:pages(name)")
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch recent comments with user and page name
  const { data: recentComments } = await supabase
    .from("comments")
    .select("*, user:user_profiles(id, email, name, avatar_url, role), page:pages(name)")
    .order("created_at", { ascending: false })
    .limit(20);

  // Flatten page name from join
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
    byStatus: byStatus as MigrationStats["byStatus"],
    byResponsibility,
    byPageStyle,
    byMigrationOwner,
    recentEdits: edits as MigrationStats["recentEdits"],
    recentComments: comments as MigrationStats["recentComments"],
  };

  return NextResponse.json({ data: stats });
}
