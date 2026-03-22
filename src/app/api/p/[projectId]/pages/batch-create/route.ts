import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";
import { generatePageId, depthFromPageId, slugifyPageName } from "@/lib/page-id-generator";

// POST /api/p/[projectId]/pages/batch-create - Create multiple pages at once
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const body = await request.json();
  const { pages, commonFields } = body as {
    pages: { name: string }[];
    commonFields?: {
      parent_page_id?: string | null;
      page_style?: string;
      content_responsibility?: string;
      status?: string;
    };
  };

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return NextResponse.json({ error: "pages array is required" }, { status: 400 });
  }

  // Resolve parent page_id string if parent specified
  let parentPageIdStr: string | null = null;
  const parentUuid = commonFields?.parent_page_id ?? null;
  if (parentUuid) {
    const { data: parent } = await supabase
      .from("pages")
      .select("page_id")
      .eq("id", parentUuid)
      .eq("project_id", projectId)
      .single();

    if (!parent) {
      return NextResponse.json({ error: "Parent page not found" }, { status: 404 });
    }
    parentPageIdStr = parent.page_id;
  }

  // Get existing page IDs for generation
  const { data: existing } = await supabase
    .from("pages")
    .select("page_id, sort_order")
    .eq("project_id", projectId);

  let existingIds = (existing ?? []).map((p) => p.page_id);
  const maxSort = Math.max(0, ...(existing ?? []).map((p) => p.sort_order ?? 0));

  const toInsert = [];
  for (let i = 0; i < pages.length; i++) {
    const { name } = pages[i];
    if (!name?.trim()) continue;

    const pageId = generatePageId(parentPageIdStr, existingIds);
    existingIds.push(pageId); // Track for next iteration

    toInsert.push({
      name: name.trim(),
      page_id: pageId,
      slug: slugifyPageName(name.trim()),
      depth: depthFromPageId(pageId),
      sort_order: maxSort + i + 1,
      parent_page_id: parentUuid,
      page_style: commonFields?.page_style ?? null,
      content_responsibility: commonFields?.content_responsibility ?? null,
      status: commonFields?.status ?? "not_started",
      project_id: projectId,
    });
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ error: "No valid pages to create" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pages")
    .insert(toInsert)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, created: data?.length ?? 0 }, { status: 201 });
}
