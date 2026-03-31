"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRoleForEmail, isSuperadminDomain } from "@/lib/auth";
import { UserProfile } from "@/types";

export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfile() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        console.log("[auth] getUser result:", authUser?.id, authUser?.email);

        if (!authUser) {
          console.log("[auth] No authenticated user found");
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (profileError && profileError.code === "PGRST116") {
          // No profile row exists — create one
          console.log("[auth] No user_profiles row found, creating one for:", authUser.email);

          const newProfile = {
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.full_name ?? authUser.email!.split("@")[0],
            avatar_url: null,
            role: getRoleForEmail(authUser.email!),
            is_superadmin: isSuperadminDomain(authUser.email!),
          };

          const { data: created, error: insertError } = await supabase
            .from("user_profiles")
            .upsert(newProfile)
            .select()
            .single();

          if (insertError) {
            console.error("[auth] Failed to create user_profiles row:", insertError.message);
            throw new Error(insertError.message);
          }

          console.log("[auth] Created user_profiles row:", created);
          setUser(created as UserProfile);
        } else if (profileError) {
          console.error("[auth] Error fetching user_profiles:", profileError.message);
          throw new Error(profileError.message);
        } else {
          // Check if the profile needs promotion (role or superadmin)
          const expectedRole = getRoleForEmail(profile.email);
          const shouldBeSuperadmin = isSuperadminDomain(profile.email);
          const updates: Record<string, unknown> = {};

          if (expectedRole === "admin" && profile.role !== "admin") {
            updates.role = "admin";
          }
          if (shouldBeSuperadmin && !profile.is_superadmin) {
            updates.is_superadmin = true;
          }

          if (Object.keys(updates).length > 0) {
            console.log("[auth] Promoting user:", profile.email, updates);
            const { error: updateError } = await supabase
              .from("user_profiles")
              .update(updates)
              .eq("id", profile.id);

            if (!updateError) {
              if (updates.role) profile.role = updates.role as string;
              if (updates.is_superadmin) profile.is_superadmin = true;
            }
          }

          console.log("[auth] Loaded user profile:", profile?.name, profile?.role);
          setUser(profile as UserProfile);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load user"));
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      // Re-fetch profile on auth state change
      fetchProfile();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
