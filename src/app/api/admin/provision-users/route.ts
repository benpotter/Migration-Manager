import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";

interface ProvisionUser {
  email: string;
  name: string;
  role?: "admin" | "editor" | "viewer";
}

export async function POST(request: NextRequest) {
  // Verify the caller is a superadmin
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

  const adminClient = createServiceRoleClient();
  const body = await request.json();
  const users: ProvisionUser[] = body.users;

  if (!Array.isArray(users) || users.length === 0) {
    return NextResponse.json(
      { data: null, error: "users array is required" },
      { status: 400 }
    );
  }

  let created = 0;
  let skipped = 0;
  const errors: Array<{ email: string; error: string }> = [];

  for (const u of users) {
    const email = u.email?.trim().toLowerCase();
    if (!email || email === "n/a") {
      skipped++;
      continue;
    }

    try {
      // Try to create the user in Supabase Auth
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: u.name },
        });

      let userId: string | null = null;

      if (createError) {
        // User already exists — look them up
        if (
          createError.message.includes("already been registered") ||
          createError.status === 422
        ) {
          const { data: listData } =
            await adminClient.auth.admin.listUsers();
          const existing = listData?.users?.find(
            (au) => au.email?.toLowerCase() === email
          );
          if (existing) {
            userId = existing.id;
            skipped++;
          } else {
            errors.push({ email, error: "User exists but could not be found" });
            continue;
          }
        } else {
          errors.push({ email, error: createError.message });
          continue;
        }
      } else {
        userId = newUser.user.id;
        created++;
      }

      // Upsert user_profiles row
      if (userId) {
        await adminClient.from("user_profiles").upsert(
          {
            id: userId,
            email,
            name: u.name,
            role: u.role ?? "editor",
          },
          { onConflict: "id" }
        );
      }
    } catch (err) {
      errors.push({
        email,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ data: { created, skipped, errors }, error: null });
}
