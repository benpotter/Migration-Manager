"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Notification } from "@/types";
import { useCurrentUser } from "./use-current-user";
import { useRealtimeNotifications } from "./use-realtime";

export function useNotifications() {
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch initial notifications
  useEffect(() => {
    if (!user) return;

    async function fetchNotifications() {
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data as Notification[]);
      }
    }

    fetchNotifications();
  }, [user]);

  // Handle realtime inserts
  const handleInsert = useCallback((payload: unknown) => {
    const record = (payload as { new: Notification }).new;
    if (record) {
      setNotifications((prev) => [record, ...prev]);
    }
  }, []);

  useRealtimeNotifications(user?.id ?? "", handleInsert);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [user]);

  return { notifications, unreadCount, markAsRead, markAllRead };
}
