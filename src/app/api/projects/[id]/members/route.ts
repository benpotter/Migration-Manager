import { NextRequest, NextResponse } from "next/server";
import { requireProjectRole, isErrorResponse } from "@/lib/project-auth";

// GET /api/projects/[id]/members - List project members
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await requireProjectRole(id, ["admin", "editor", "viewer"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const { data, error } = await supabase
    .from("project_members")
    .select("*, user:user_profiles!project_members_user_profile_fk(id, email, name, avatar_url, role)")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/projects/members]", error);
    return NextResponse.json({ data: null, error: "Failed to fetch members" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], error: null });
}

// POST /api/projects/[id]/members - Add member (admin only)
// Accepts { user_id, role } OR { email, role } (email lookup)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await requireProjectRole(id, ["admin"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const body = await request.json();
  const { user_id, email, role } = body as {
    user_id?: string;
    email?: string;
    role: string;
  };

  if (!role || !["admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json(
      { error: "Valid role is required (admin, editor, viewer)" },
      { status: 400 }
    );
  }

  let resolvedUserId = user_id;

  // If email provided instead of user_id, look up the user
  if (!resolvedUserId && email) {
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: "No user found with that email address" },
        { status: 404 }
      );
    }
    resolvedUserId = userProfile.id;
  }

  if (!resolvedUserId) {
    return NextResponse.json(
      { error: "user_id or email is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("project_members")
    .insert({ project_id: id, user_id: resolvedUserId, role })
    .select("*, user:user_profiles!project_members_user_profile_fk(id, email, name, avatar_url, role)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { data: null, error: "User is already a member of this project" },
        { status: 409 }
      );
    }
    console.error("[POST /api/projects/members]", error);
    return NextResponse.json({ data: null, error: "Failed to add member" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}

// PATCH /api/projects/[id]/members - Update member role (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await requireProjectRole(id, ["admin"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const body = await request.json();
  const { user_id, role } = body as { user_id: string; role: string };

  if (!user_id || !role || !["admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json(
      { error: "user_id and valid role are required" },
      { status: 400 }
    );
  }

  // Prevent demoting the last admin
  if (role !== "admin") {
    const { data: admins } = await supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", id)
      .eq("role", "admin");

    if (admins && admins.length <= 1 && admins[0]?.user_id === user_id) {
      return NextResponse.json(
        { error: "Cannot demote the last admin" },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("project_id", id)
    .eq("user_id", user_id)
    .select("*, user:user_profiles!project_members_user_profile_fk(id, email, name, avatar_url, role)")
    .single();

  if (error) {
    console.error("[PATCH /api/projects/members]", error);
    return NextResponse.json({ data: null, error: "Failed to update member role" }, { status: 500 });
  }

  return NextResponse.json({ data, error: null });
}

// DELETE /api/projects/[id]/members - Remove member (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await requireProjectRole(id, ["admin"]);
  if (isErrorResponse(result)) return result;
  const { supabase } = result;

  const body = await request.json();
  const { user_id } = body as { user_id: string };

  if (!user_id) {
    return NextResponse.json(
      { error: "user_id is required" },
      { status: 400 }
    );
  }

  // Prevent removing the last admin
  const { data: admins } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", id)
    .eq("role", "admin");

  if (admins && admins.length <= 1 && admins[0]?.user_id === user_id) {
    return NextResponse.json(
      { error: "Cannot remove the last admin from a project" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", id)
    .eq("user_id", user_id);

  if (error) {
    console.error("[DELETE /api/projects/members]", error);
    return NextResponse.json({ data: null, error: "Failed to remove member" }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true }, error: null });
}
