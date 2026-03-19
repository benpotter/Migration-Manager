import { createClient } from "@/lib/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

export function createPresenceChannel(supabase: SupabaseClient) {
  return supabase.channel("migration-team");
}

export function subscribeToPageChanges(
  supabase: SupabaseClient,
  callback: (payload: unknown) => void
) {
  return supabase
    .channel("page-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pages" },
      callback
    )
    .subscribe();
}

export function subscribeToComments(
  supabase: SupabaseClient,
  pageId: string,
  callback: (payload: unknown) => void
) {
  return supabase
    .channel(`comments-${pageId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "comments",
        filter: `page_id=eq.${pageId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToNotifications(
  supabase: SupabaseClient,
  userId: string,
  callback: (payload: unknown) => void
) {
  return supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}
