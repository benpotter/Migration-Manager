import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWorkflowStages } from "@/lib/workflow";
import type { ProjectSummary } from "@/types";

// GET /api/projects/summary — lightweight project stats for homepage cards
export async function GET() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  // Check if superadmin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let projects: any[];

  if (profile?.is_superadmin) {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("status", "active")
      .order("updated_at", { ascending: false });
    if (error) {
      console.error('[GET /api/projects/summary]', error);
      return NextResponse.json({ data: null, error: "Failed to fetch projects" }, { status: 500 });
    }
    projects = data ?? [];
  } else {
    const { data: memberships, error } = await supabase
      .from("project_members")
      .select("project:projects(*)")
      .eq("user_id", user.id);
    if (error) {
      console.error('[GET /api/projects/summary]', error);
      return NextResponse.json({ data: null, error: "Failed to fetch projects" }, { status: 500 });
    }
    projects = (memberships ?? [])
      .map((m) => m.project)
      .filter((p: any) => p && p.status === "active");
  }

  // Fetch lightweight page stats for all projects in one query
  const projectIds = projects.map((p) => p.id as string);

  if (projectIds.length === 0) {
    return NextResponse.json({ data: [], error: null });
  }

  // Get page counts grouped by project_id
  const { data: pages } = await supabase
    .from("pages")
    .select("project_id, status, is_blocked, updated_at")
    .in("project_id", projectIds)
    .or("is_archived.is.null,is_archived.eq.false");

  // Build per-project stats
  const statsMap: Record<string, { total: number; published: number; blocked: number; lastActivity: string | null }> = {};
  for (const id of projectIds) {
    statsMap[id] = { total: 0, published: 0, blocked: 0, lastActivity: null };
  }

  for (const page of pages ?? []) {
    const pid = page.project_id;
    if (!statsMap[pid]) continue;
    statsMap[pid].total++;

    // Determine "published" = final stage. Need project settings for this.
    // For efficiency, check if status matches the project's final stage
    const proj = projects.find((p: any) => p.id === pid);
    const stages = getWorkflowStages(proj?.settings);
    const finalStageId = stages[stages.length - 1]?.id ?? "published";
    if (page.status === finalStageId) statsMap[pid].published++;

    if (page.is_blocked) statsMap[pid].blocked++;

    if (!statsMap[pid].lastActivity || page.updated_at > statsMap[pid].lastActivity!) {
      statsMap[pid].lastActivity = page.updated_at;
    }
  }

  const summaries: ProjectSummary[] = projects.map((p: any) => {
    const id = p.id as string;
    const stats = statsMap[id] ?? { total: 0, published: 0, blocked: 0, lastActivity: null };
    return {
      id,
      name: p.name as string,
      slug: p.slug as string,
      client_name: p.client_name as string | null,
      color: (p.color as string) ?? "#6b7280",
      status: p.status as ProjectSummary["status"],
      totalPages: stats.total,
      publishedCount: stats.published,
      blockedCount: stats.blocked,
      lastActivityAt: stats.lastActivity,
    };
  });

  return NextResponse.json({ data: summaries, error: null });
}
