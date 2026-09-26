import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, ProfileWithStats, UserStats } from "@/src/types";

export type LeaderboardMetric = "time" | "sessions" | "days";

const ORDER_COLUMN: Record<LeaderboardMetric, keyof UserStats> = {
  time: "total_seconds",
  sessions: "total_sessions",
  days: "practice_days",
};

/**
 * Top users by a metric. user_stats uses the viewer's permissions
 * (security_invoker), so private accounts only have non-zero totals for
 * their accepted followers; users with nothing visible are left out.
 * `demo` picks the demo accounts instead of the real ones.
 */
export async function fetchLeaderboard(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  metric: LeaderboardMetric,
  { limit = 50, demo = false }: { limit?: number; demo?: boolean } = {}
): Promise<ProfileWithStats[]> {
  const orderColumn = ORDER_COLUMN[metric];

  const { data: stats, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("is_demo", demo)
    .gt("total_sessions", 0)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  if (error || !stats || stats.length === 0) {
    if (error) console.error("Error fetching leaderboard:", error);
    return [];
  }

  const typedStats = stats as UserStats[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", typedStats.map((s) => s.user_id));

  const profileById = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));

  // Keep the database's order
  return typedStats.flatMap((userStats) => {
    const profile = profileById.get(userStats.user_id);
    if (!profile) return [];
    return [
      {
        ...profile,
        stats: userStats,
        followers_count: 0,
        following_count: 0,
        is_following: false,
        follow_status: "none" as const,
      },
    ];
  });
}
