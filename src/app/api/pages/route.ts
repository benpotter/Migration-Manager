import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth";
import type { PageRow } from "@/types";

// GET /api/pages - List pages with filtering, sorting, pagination
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const search = params.get("search") || "";
  const status = params.getAll("status");
  const pageStyle = params.getAll("pageStyle");
  const contentResponsibility = params.getAll("contentResponsibility");
  const migrationOwner = params.getAll("migrationOwner");
  const sortBy = params.get("sortBy") || "sort_order";
  const sortOrder = params.get("sortOrder") === "desc" ? false : true; // ascending by default
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(params.get("pageSize") || "100", 10)));
  const showArchived = params.get("showArchived") === "true";

  let query = supabase.from("pages").select("*", { count: "exact" });

  if (!showArchived) {
    query = query.or("is_archived.is.null,is_archived.eq.false");
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,page_id.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (status.length > 0) {
    query = query.in("status", status);
  }

  if (pageStyle.length > 0) {
    query = query.in("page_style", pageStyle);
  }

  if (contentResponsibility.length > 0) {
    query = query.in("content_responsibility", contentResponsibility);
  }

  if (migrationOwner.length > 0) {
    query = query.in("migration_owner", migrationOwner);
  }

  // Validate sortBy against allowed columns
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

// POST /api/pages - Create a new page (admin only)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const hasAdminRole = profile?.role === "admin";
  const hasAdminEmail = user.email && isAdminEmail(user.email);

  if (!hasAdminRole && !hasAdminEmail) {
    return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("pages")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
