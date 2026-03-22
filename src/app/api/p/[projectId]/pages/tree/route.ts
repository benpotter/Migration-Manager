import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";
import { buildTree } from "@/lib/tree-builder";
import type { PageRow } from "@/types";

// GET /api/p/[projectId]/pages/tree - Get nested tree JSON
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor", "viewer"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  // Fetch all pages in batches, scoped to project
  const allPages: PageRow[] = [];
  const batchSize = 1000;
  let from = 0;
  let keepFetching = true;

  while (keepFetching) {
    const { data: batch, error: batchError } = await supabase
      .from("pages")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .range(from, from + batchSize - 1);

    if (batchError) {
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    if (batch && batch.length > 0) {
      allPages.push(...(batch as PageRow[]));
      from += batchSize;
      if (batch.length < batchSize) keepFetching = false;
    } else {
      keepFetching = false;
    }
  }

  const tree = buildTree(allPages);

  return NextResponse.json({ data: tree });
}
