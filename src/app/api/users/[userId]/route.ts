import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

const VALID_ROLES: UserRole[] = ["admin", "editor", "viewer"];

// PATCH /api/users/[userId] - Update user role (superadmin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
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
    return NextResponse.json(
      { error: "Forbidden: superadmin required" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const role = body.role as UserRole;

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabase
    .from("user_profiles")
    .update({ role })
    .eq("id", userId)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: "User not found or update not permitted" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
