import type { SupabaseClient } from "@supabase/supabase-js";
import { cursorFilter, encodeCursor, FEED_PAGE_SIZE, parseCursor } from "@/lib/feed/cursor";
import { enrichSessions, type SessionWithProfile } from "@/lib/sessions/enrich";
import type { FeedPage } from "@/src/types";

export const SESSION_WITH_PROFILE_SELECT = `
  *,
  profiles!inner(id, username, display_name, avatar_url, is_demo)
`;

type SessionScope =
  | { userIds: string[] } // these users' sessions
  | { demo: true }; // every demo account's sessions

/**
 * One page of sessions, newest first, keyset-paginated on (created_at, id).
 * RLS on the caller's client decides what is visible.
 */
export async function fetchSessionPage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  scope: SessionScope,
  rawCursor: string | null | undefined,
  viewerId: string | null
): Promise<FeedPage> {
  let query = supabase
    .from("sessions")
    .select(SESSION_WITH_PROFILE_SELECT)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1); // one extra row tells us whether there is another page

  query = "demo" in scope ? query.eq("profiles.is_demo", true) : query.in("user_id", scope.userIds);

  if (rawCursor) {
    const cursor = parseCursor(rawCursor);
    if (!cursor) {
      return { sessions: [], nextCursor: null };
    }
    query = query.or(cursorFilter(cursor));
  }

  const { data: sessions, error } = await query;

  if (error || !sessions) {
    console.error("Error fetching sessions:", error);
    return { sessions: [], nextCursor: null };
  }

  const rows = sessions as unknown as SessionWithProfile[];
  const page = rows.slice(0, FEED_PAGE_SIZE);
  const last = page[page.length - 1];

  return {
    sessions: await enrichSessions(supabase, page, viewerId),
    nextCursor: rows.length > FEED_PAGE_SIZE && last ? encodeCursor(last) : null,
  };
}
