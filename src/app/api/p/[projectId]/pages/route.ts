import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";
import { generatePageId, depthFromPageId, slugifyPageName } from "@/lib/page-id-generator";
import type { PageRow } from "@/types";

// GET /api/p/[projectId]/pages - List pages with filtering, sorting, pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor", "viewer"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search") || "";
  const status = sp.getAll("status");
  const pageStyle = sp.getAll("pageStyle");
  const contentResponsibility = sp.getAll("contentResponsibility");
  const migrationOwner = sp.getAll("migrationOwner");
  const sortBy = sp.get("sortBy") || "sort_order";
  const sortOrder = sp.get("sortOrder") === "desc" ? false : true;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(sp.get("pageSize") || "100", 10)));
  const showArchived = sp.get("showArchived") === "true";

  let query = supabase
    .from("pages")
    .select("*", { count: "exact" })
    .eq("project_id", projectId);

  if (!showArchived) {
    query = query.eq("is_archived", false);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,page_id.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (status.length > 0) query = query.in("status", status);
  if (pageStyle.length > 0) query = query.in("page_style", pageStyle);
  if (contentResponsibility.length > 0) query = query.in("content_responsibility", contentResponsibility);
  if (migrationOwner.length > 0) query = query.in("migration_owner", migrationOwner);

  const allowedSortColumns = [
    "sort_order", "name", "page_id", "status", "page_style",
    "content_responsibility", "migration_owner", "updated_at", "created_at", "depth",
  ];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : "sort_order";

  query = query
    .order(safeSortBy, { ascending: sortOrder })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data as PageRow[],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  });
}

// POST /api/p/[projectId]/pages - Create a new page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const result = await requireProjectRole(projectId, ["admin", "editor"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const body = await request.json();
  const { name, parent_page_id, page_style, slug, content_responsibility, status, ...rest } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Auto-generate page_id if not provided
  let pageId = body.page_id;
  if (!pageId) {
    // Look up parent's page_id if parent is specified by UUID
    let parentPageIdStr: string | null = null;
    if (parent_page_id) {
      const { data: parentPage } = await supabase
        .from("pages")
        .select("page_id")
        .eq("id", parent_page_id)
        .eq("project_id", projectId)
        .single();

      if (!parentPage) {
        return NextResponse.json({ error: "Parent page not found in this project" }, { status: 404 });
      }
      parentPageIdStr = parentPage.page_id;
    }

    // Get existing siblings to compute next page_id
    const { data: siblings } = await supabase
      .from("pages")
      .select("page_id")
      .eq("project_id", projectId);

    const siblingIds = (siblings ?? []).map((s) => s.page_id);
    pageId = generatePageId(parentPageIdStr, siblingIds);
  }

  // Validate page_id uniqueness within project
  const { data: existing } = await supabase
    .from("pages")
    .select("id")
    .eq("project_id", projectId)
    .eq("page_id", pageId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: `page_id "${pageId}" already exists in this project` },
      { status: 409 }
    );
  }

  // Auto-compute depth
  const depth = body.depth ?? depthFromPageId(pageId);

  // Auto-compute sort_order: max existing + 1
  let sortOrder = body.sort_order;
  if (sortOrder == null) {
    const { data: maxSort } = await supabase
      .from("pages")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    sortOrder = (maxSort?.sort_order ?? 0) + 1;
  }

  // Auto-generate slug if not provided
  const finalSlug = slug ?? slugifyPageName(name);

  const { data, error } = await supabase
    .from("pages")
    .insert({
      ...rest,
      name,
      page_id: pageId,
      parent_page_id: parent_page_id ?? null,
      page_style: page_style ?? null,
      slug: finalSlug,
      content_responsibility: content_responsibility ?? null,
      status: status ?? "not_started",
      depth,
      sort_order: sortOrder,
      project_id: projectId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
