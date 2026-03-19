"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  subscribeToPageChanges,
  subscribeToComments,
  subscribeToNotifications,
} from "@/lib/supabase/realtime";

export function useRealtimePages(onUpdate: (payload: unknown) => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = subscribeToPageChanges(supabase, onUpdate);
    return () => {
      channel.unsubscribe();
    };
  }, [onUpdate]);
}

export function useRealtimeComments(
  pageId: string,
  onInsert: (payload: unknown) => void
) {
  useEffect(() => {
    if (!pageId) return;
    const supabase = createClient();
    const channel = subscribeToComments(supabase, pageId, onInsert);
    return () => {
      channel.unsubscribe();
    };
  }, [pageId, onInsert]);
}

export function useRealtimeNotifications(
  userId: string,
  onInsert: (payload: unknown) => void
) {
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = subscribeToNotifications(supabase, userId, onInsert);
    return () => {
      channel.unsubscribe();
    };
  }, [userId, onInsert]);
}
