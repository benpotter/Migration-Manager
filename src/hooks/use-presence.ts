"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPresenceChannel } from "@/lib/supabase/realtime";
import { useCurrentUser } from "./use-current-user";

export interface PresenceUser {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  currentPageId: string | null;
}

export function usePresence() {
  const { user } = useCurrentUser();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof createPresenceChannel> | null>(
    null
  );
  const currentPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const channel = createPresenceChannel(supabase);
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = [];
        for (const key of Object.keys(state)) {
          const presences = state[key];
          if (presences && presences.length > 0) {
            users.push(presences[0] as PresenceUser);
          }
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: user.id,
            name: user.name ?? user.email,
            email: user.email,
            avatar: user.avatar_url,
            currentPageId: currentPageIdRef.current,
          });
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user]);

  const updateCurrentPage = useCallback(
    async (pageId: string | null) => {
      currentPageIdRef.current = pageId;
      if (channelRef.current && user) {
        await channelRef.current.track({
          userId: user.id,
          name: user.name ?? user.email,
          email: user.email,
          avatar: user.avatar_url,
          currentPageId: pageId,
        });
      }
    },
    [user]
  );

  return { onlineUsers, updateCurrentPage };
}
