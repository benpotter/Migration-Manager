import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/users - List all user profiles (superadmin only)
export async function GET() {
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
      { data: null, error: "Forbidden: superadmin required" },
      { status: 403 }
    );
  }

  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/users]", error);
    return NextResponse.json({ data: null, error: "Failed to fetch users" }, { status: 500 });
  }

  return NextResponse.json({ data: users ?? [], error: null });
}
