import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedSession, FeedSnippet, Session } from "@/src/types";

/** How long a signed clip URL stays valid. Pages are re-rendered well within this. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type SessionWithProfile = Session & {
  profiles: FeedSession["profile"];
};

type SnippetRow = {
  id: string;
  session_id: string;
  start_time_ms: number;
  duration_ms: number;
  storage_path: string | null;
  audio_url: string | null;
};

/**
 * Add kudos/comment counts, the viewer's kudo state and playable clip URLs
 * to a page of sessions. Every query runs with the caller's Supabase client,
 * so row-level security decides what is counted and which clips can be signed.
 */
export async function enrichSessions(
  // The generated Database type is hand-written and incomplete, so accept any schema here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  sessions: SessionWithProfile[],
  viewerId: string | null
): Promise<FeedSession[]> {
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((s) => s.id);

  const [{ data: kudos }, { data: comments }, { data: snippets }] = await Promise.all([
    supabase.from("kudos").select("session_id, user_id").in("session_id", sessionIds),
    supabase.from("comments").select("session_id").in("session_id", sessionIds),
    supabase
      .from("snippets")
      .select("id, session_id, start_time_ms, duration_ms, storage_path, audio_url")
      .in("session_id", sessionIds),
  ]);

  const kudosCounts = new Map<string, number>();
  const viewerKudos = new Set<string>();
  for (const k of (kudos ?? []) as { session_id: string; user_id: string }[]) {
    kudosCounts.set(k.session_id, (kudosCounts.get(k.session_id) ?? 0) + 1);
    if (viewerId && k.user_id === viewerId) viewerKudos.add(k.session_id);
  }

  const commentsCounts = new Map<string, number>();
  for (const c of (comments ?? []) as { session_id: string }[]) {
    commentsCounts.set(c.session_id, (commentsCounts.get(c.session_id) ?? 0) + 1);
  }

  const snippetRows = (snippets ?? []) as SnippetRow[];
  const signedUrls = await signSnippetPaths(
    supabase,
    snippetRows.map((s) => s.storage_path).filter((p): p is string => !!p)
  );

  const snippetsBySession = new Map<string, FeedSnippet[]>();
  for (const s of snippetRows) {
    const list = snippetsBySession.get(s.session_id) ?? [];
    list.push({
      id: s.id,
      start_time_ms: s.start_time_ms,
      duration_ms: s.duration_ms,
      playback_url: s.storage_path
        ? signedUrls.get(s.storage_path) ?? null
        : staticClipUrl(s.audio_url),
    });
    snippetsBySession.set(s.session_id, list);
  }

  return sessions.map(({ profiles, ...session }) => ({
    ...session,
    profile: profiles,
    kudos_count: kudosCounts.get(session.id) ?? 0,
    comments_count: commentsCounts.get(session.id) ?? 0,
    has_kudoed: viewerKudos.has(session.id),
    snippets: snippetsBySession.get(session.id) ?? [],
  }));
}

async function signSnippetPaths(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  paths: string[]
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;

  const { data, error } = await supabase.storage
    .from("snippets")
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) {
    console.error("Error signing snippet URLs:", error);
    return urls;
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

/** Rows without a storage object (the demo data) point at a file served by this app. */
function staticClipUrl(audioUrl: string | null): string | null {
  return audioUrl && audioUrl.startsWith("/") && !audioUrl.startsWith("//") ? audioUrl : null;
}
