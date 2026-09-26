"use server";

import { createClient } from "@/lib/supabase/server";
import type { NotificationItem } from "@/src/types";

/**
 * The signed-in user's most recent notifications, newest first.
 * Rows are created by database triggers (migration 012).
 */
export async function getNotifications(limit = 50): Promise<NotificationItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id,
      type,
      created_at,
      read_at,
      actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url),
      session:sessions(id, instrument, piece_name),
      comment:comments(content)
      `
    )
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("Error fetching notifications:", error);
    return [];
  }

  return data as unknown as NotificationItem[];
}

/** Number of unread notifications for the navbar badge (0 when signed out). */
export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error counting notifications:", error);
    return 0;
  }
  return count ?? 0;
}

/** Mark every unread notification as read (only read_at is writable). */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("notifications")
    // @ts-expect-error - Supabase types will be properly generated after DB setup
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error marking notifications read:", error);
  }
}
