import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isAllowedDomain, getRoleForEmail } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Handle email confirmation links (token_hash + type from Supabase)
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  // Also handle PKCE code exchange (used by signUp emailRedirectTo)
  const code = searchParams.get("code");

  const supabase = await createServerSupabaseClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "signup" | "recovery",
    });

    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/error?error=confirmation_failed`
      );
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/error?error=confirmation_failed`
      );
    }
  } else {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  // Get the now-authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(`${origin}/auth/error?error=no_user`);
  }

  // Domain validation safety net
  if (!isAllowedDomain(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/error?error=domain`);
  }

  // Create or update user profile with correct role
  const role = getRoleForEmail(user.email);

  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!existingProfile) {
    await supabase.from("user_profiles").insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.email.split("@")[0],
      avatar_url: null,
      role,
    });
  } else if (role === "admin" && existingProfile.role !== "admin") {
    // Promote to admin if their email is in the admin list but profile isn't admin yet
    await supabase
      .from("user_profiles")
      .update({ role })
      .eq("id", user.id);
  }

  return NextResponse.redirect(`${origin}/`);
}
