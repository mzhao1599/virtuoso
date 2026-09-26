import { cache } from "react";
import { createDemoClient } from "@/lib/demo/client";
import { demoShiftMs, shiftIso } from "@/lib/demo/shift";
import { fetchLeaderboard, type LeaderboardMetric } from "@/lib/leaderboard";
import { enrichSessions, type SessionWithProfile } from "@/lib/sessions/enrich";
import { fetchSessionPage, SESSION_WITH_PROFILE_SELECT } from "@/lib/sessions/page";
import type {
  FeedPage,
  FeedSession,
  PracticeHistoryEntry,
  Profile,
  ProfileWithStats,
  SessionComment,
  UserStats,
} from "@/src/types";

/*
 * Read-only loaders for the /demo pages. They use an anonymous client, so
 * they can only see what RLS shows a signed-out visitor, and they only ask
 * for demo accounts (profiles.is_demo). All timestamps are shifted by whole
 * days so the demo stays current (see lib/demo/shift.ts).
 */

const EMPTY_PAGE: FeedPage = { sessions: [], nextCursor: null };

/** Whole-day shift for this request, from the newest demo session. */
const getShift = cache(async (): Promise<number> => {
  const supabase = createDemoClient();
  if (!supabase) return 0;
  const { data } = await supabase
    .from("sessions")
    .select("created_at, profiles!inner(is_demo)")
    .eq("profiles.is_demo", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return demoShiftMs((data as { created_at: string } | null)?.created_at, new Date());
});

function shiftSession(session: FeedSession, shift: number): FeedSession {
  return {
    ...session,
    created_at: shiftIso(session.created_at, shift),
    updated_at: shiftIso(session.updated_at, shift),
  };
}

function shiftPage(page: FeedPage, shift: number): FeedPage {
  // The cursor keeps the stored (unshifted) timestamp, which is what the query needs.
  return { ...page, sessions: page.sessions.map((s) => shiftSession(s, shift)) };
}

export async function getDemoFeedPage(cursor?: string | null): Promise<FeedPage> {
  const supabase = createDemoClient();
  if (!supabase) return EMPTY_PAGE;
  const [page, shift] = await Promise.all([
    fetchSessionPage(supabase, { demo: true }, cursor, null),
    getShift(),
  ]);
  return shiftPage(page, shift);
}

export async function getDemoUserSessions(userId: string, cursor?: string | null): Promise<FeedPage> {
  const supabase = createDemoClient();
  if (!supabase) return EMPTY_PAGE;
  const [page, shift] = await Promise.all([
    fetchSessionPage(supabase, { userIds: [userId] }, cursor, null),
    getShift(),
  ]);
  // userId comes from the demo profile page, but don't trust it blindly
  return shiftPage({ ...page, sessions: page.sessions.filter((s) => s.profile.is_demo) }, shift);
}

export const getDemoMusicians = cache(async (): Promise<Profile[]> => {
  const supabase = createDemoClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_demo", true)
    .order("display_name");
  return (data ?? []) as Profile[];
});

export interface DemoProfile {
  profile: ProfileWithStats;
  history: PracticeHistoryEntry[];
}

export async function getDemoProfile(username: string): Promise<DemoProfile | null> {
  const supabase = createDemoClient();
  if (!supabase) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_demo", true)
    .maybeSingle();
  if (!profile) return null;
  const typed = profile as Profile;

  const [{ data: stats }, followers, following, { data: history }, shift] = await Promise.all([
    supabase.from("user_stats").select("*").eq("user_id", typed.id).maybeSingle(),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", typed.id)
      .eq("status", "accepted"),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", typed.id)
      .eq("status", "accepted"),
    // A demo account has a few hundred sessions at most, well under one page
    supabase
      .from("sessions")
      .select("created_at, duration_seconds, piece_name")
      .eq("user_id", typed.id)
      .order("created_at", { ascending: false })
      .limit(1000),
    getShift(),
  ]);

  return {
    profile: {
      ...typed,
      stats: (stats ?? {
        user_id: typed.id,
        total_sessions: 0,
        total_seconds: 0,
        practice_days: 0,
        last_practice_at: null,
        is_demo: true,
      }) as UserStats,
      followers_count: followers.count ?? 0,
      following_count: following.count ?? 0,
      is_following: false,
      follow_status: "none",
    },
    history: ((history ?? []) as PracticeHistoryEntry[]).map((h) => ({
      ...h,
      created_at: shiftIso(h.created_at, shift),
    })),
  };
}

export interface DemoSessionDetail {
  session: FeedSession;
  comments: SessionComment[];
}

export async function getDemoSession(id: string): Promise<DemoSessionDetail | null> {
  const supabase = createDemoClient();
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null;

  const [{ data: row }, { data: comments }, shift] = await Promise.all([
    supabase
      .from("sessions")
      .select(SESSION_WITH_PROFILE_SELECT)
      .eq("id", id)
      .eq("profiles.is_demo", true)
      .maybeSingle(),
    supabase
      .from("comments")
      .select("id, session_id, user_id, content, created_at, updated_at, profiles!inner(id, username, display_name, avatar_url)")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
    getShift(),
  ]);
  if (!row) return null;

  const [session] = await enrichSessions(supabase, [row as unknown as SessionWithProfile], null);
  if (!session) return null;

  type CommentRow = Omit<SessionComment, "author"> & { profiles: SessionComment["author"] };
  return {
    session: shiftSession(session, shift),
    comments: ((comments ?? []) as unknown as CommentRow[]).map(({ profiles, ...c }) => ({
      ...c,
      author: profiles,
      created_at: shiftIso(c.created_at, shift),
      updated_at: shiftIso(c.updated_at, shift),
    })),
  };
}

export async function getDemoLeaderboard(metric: LeaderboardMetric): Promise<ProfileWithStats[]> {
  const supabase = createDemoClient();
  if (!supabase) return [];
  return fetchLeaderboard(supabase, metric, { demo: true });
}
