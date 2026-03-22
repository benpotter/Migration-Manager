import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface ProjectMembership {
  user: User;
  role: UserRole;
  supabase: SupabaseClient;
}

/**
 * Check if the current user is a member of the given project.
 * Returns membership info + supabase client, or null if not a member / not authenticated.
 */
export async function getProjectMembership(
  projectId: string
): Promise<ProjectMembership | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return null;

  return {
    user,
    role: membership.role as UserRole,
    supabase,
  };
}

/**
 * Require the current user to have one of the allowed roles in the project.
 * Returns membership info on success, or a 401/403 NextResponse on failure.
 */
export async function requireProjectRole(
  projectId: string,
  allowedRoles: UserRole[]
): Promise<ProjectMembership | NextResponse> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !allowedRoles.includes(membership.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    user,
    role: membership.role as UserRole,
    supabase,
  };
}

/** Type guard: true if the result is an error response rather than a membership. */
export function isErrorResponse(
  result: ProjectMembership | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
