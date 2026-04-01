import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

// GET /api/projects - List user's projects (superadmin sees all)
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

  if (profile?.is_superadmin) {
    // Superadmin sees all projects
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[/api/projects]", error);
    return NextResponse.json({ data: null, error: "Failed to fetch projects" }, { status: 500 });
    }

    return NextResponse.json({
      data: (projects ?? []).map((p) => ({ ...p, userRole: "admin" as const })),
    });
  }

  // Regular user: projects they are a member of
  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("role, project:projects(*)")
    .eq("user_id", user.id);

  if (error) {
    console.error("[/api/projects]", error);
    return NextResponse.json({ data: null, error: "Failed to fetch projects" }, { status: 500 });
  }

  const data = (memberships ?? [])
    .filter((m) => m.project)
    .map((m) => {
      const project = m.project as unknown as Record<string, unknown>;
      return { ...project, userRole: m.role };
    });

  return NextResponse.json({ data });
}

// POST /api/projects - Create project (superadmin only)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_superadmin) {
    return NextResponse.json(
      { error: "Forbidden: superadmin required" },
      { status: 403 }
    );
  }

  const adminClient = createServiceRoleClient();

  const body = await request.json();

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ data: null, error: "name is required" }, { status: 400 });
  }

  if (!body.slug || typeof body.slug !== "string") {
    return NextResponse.json({ data: null, error: "slug is required" }, { status: 400 });
  }

  const { data: project, error: projectError } = await adminClient
    .from("projects")
    .insert({
      name: body.name,
      slug: body.slug,
      client_name: body.client_name ?? null,
      description: body.description ?? null,
      data_mode: body.data_mode ?? "import",
      status: body.status ?? "active",
      color: body.color ?? "#3B82F6",
      allowed_domains: body.allowed_domains ?? [],
      settings: body.settings ?? {},
      created_by: user.id,
    })
    .select()
    .single();

  if (projectError) {
    console.error("[POST /api/projects]", projectError);
    return NextResponse.json({ data: null, error: "Failed to create project" }, { status: 500 });
  }

  // Auto-add creator as admin member
  await adminClient.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "admin",
  });

  return NextResponse.json({ data: project }, { status: 201 });
}
