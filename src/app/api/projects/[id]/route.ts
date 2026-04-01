import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getProjectMembership,
  requireProjectRole,
  isErrorResponse,
} from "@/lib/project-auth";

// GET /api/projects/[id] - Project details + user's role
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  // Try membership first
  const membership = await getProjectMembership(id);

  if (!membership) {
    // Superadmin fallback
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_superadmin) {
      return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 });
    }

    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !project) {
      return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: { ...project, userRole: "admin" as const },
      error: null,
    });
  }

  const { data: project, error } = await membership.supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    return NextResponse.json({ data: null, error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: { ...project, userRole: membership.role },
    error: null,
  });
}

// PATCH /api/projects/[id] - Update project (admin or superadmin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await requireProjectRole(id, ["admin"]);

  // If not a project admin, check superadmin fallback
  if (isErrorResponse(result)) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_superadmin) {
      return result;
    }

    const body = await request.json();
    const { data: project, error } = await supabase
      .from("projects")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/projects]", error);
      return NextResponse.json({ data: null, error: "Failed to update project" }, { status: 500 });
    }

    return NextResponse.json({ data: project, error: null });
  }

  const body = await request.json();
  const { data: project, error } = await result.supabase
    .from("projects")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/projects]", error);
    return NextResponse.json({ data: null, error: "Failed to update project" }, { status: 500 });
  }

  return NextResponse.json({ data: project, error: null });
}

// DELETE /api/projects/[id] - Delete project (admin or superadmin)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await requireProjectRole(id, ["admin"]);

  if (isErrorResponse(result)) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_superadmin) {
      return result;
    }

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/projects]", error);
      return NextResponse.json({ data: null, error: "Failed to delete project" }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true }, error: null });
  }

  const { error } = await result.supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[DELETE /api/projects]", error);
    return NextResponse.json({ data: null, error: "Failed to delete project" }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true }, error: null });
}
