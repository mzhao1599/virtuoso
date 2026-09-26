"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeSearchQuery } from "@/lib/search/query";
import type { ProfileWithStats, UserStats, Profile, PracticeHistoryEntry } from "@/src/types";

/**
 * Get profile with stats by username
 */
export async function getProfileByUsername(
  username: string
): Promise<ProfileWithStats | null> {
  const supabase = await createClient();

  // Get current user for is_following check
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Get profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !profile) {
    return null;
  }

  type ProfileRow = Profile;
  const typedProfile = profile as ProfileRow;

  // Get stats
  const { data: stats } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", typedProfile.id)
    .single();

  // Get followers count (only accepted)
  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", typedProfile.id)
    .eq("status", "accepted");

  // Get following count (only accepted)
  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", typedProfile.id)
    .eq("status", "accepted");

  // Check follow status with current user
  let isFollowing = false;
  let followStatus: 'none' | 'pending' | 'accepted' | 'requested' = 'none';
  
  if (currentUser && currentUser.id !== typedProfile.id) {
    // Check if current user is following this profile
    const { data: followData } = await supabase
      .from("follows")
      .select("status")
      .eq("follower_id", currentUser.id)
      .eq("following_id", typedProfile.id)
      .maybeSingle();

    if (followData) {
      const status = (followData as { status: string }).status;
      followStatus = status as 'pending' | 'accepted';
      isFollowing = status === 'accepted';
    }
    
    // Also check if this profile has requested to follow current user
    if (followStatus === 'none') {
      const { data: reverseFollowData } = await supabase
        .from("follows")
        .select("status")
        .eq("follower_id", typedProfile.id)
        .eq("following_id", currentUser.id)
        .eq("status", "pending")
        .maybeSingle();
      
      if (reverseFollowData) {
        followStatus = 'requested';
      }
    }
  }

  return {
    ...typedProfile,
    stats: (stats ?? {
      user_id: typedProfile.id,
      total_sessions: 0,
      total_seconds: 0,
      practice_days: 0,
      last_practice_at: null,
    }) as UserStats,
    followers_count: followersCount || 0,
    following_count: followingCount || 0,
    is_following: isFollowing,
    follow_status: followStatus,
  };
}

/**
 * Toggle follow status for a user
 * - If not following: creates follow (pending for private, accepted for public)
 * - If following or pending: removes follow
 */
export async function toggleFollow(targetUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id === targetUserId) {
    throw new Error("Invalid follow action");
  }

  // Check if already following or have pending request
  const { data: existing } = await supabase
    .from("follows")
    .select("*")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .single();

  if (existing) {
    // Unfollow or cancel request
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);
  } else {
    // Follow (trigger will auto-set status based on account type)
    // @ts-expect-error - Supabase types will be properly generated after DB setup
    await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: targetUserId,
    });
  }
}

/**
 * Accept a pending follow request
 */
export async function acceptFollowRequest(followerUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Update the follow status to accepted
  const { error } = await supabase
    .from("follows")
    // @ts-expect-error - Supabase types will be properly generated after DB setup
    .update({ status: 'accepted' })
    .eq("follower_id", followerUserId)
    .eq("following_id", user.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Reject a pending follow request
 */
export async function rejectFollowRequest(followerUserId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Delete the follow request
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerUserId)
    .eq("following_id", user.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Get list of followers for a user
 */
export async function getFollowers(userId: string): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follows")
    .select(`
      follower_id,
      profiles!follows_follower_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        bio,
        primary_instrument,
        created_at,
        updated_at,
        account_type
      )
    `)
    .eq("following_id", userId)
    .eq("status", "accepted");

  if (error || !data) {
    return [];
  }

  return (data as unknown as { profiles: Profile | null }[])
    .map((follow) => follow.profiles)
    .filter((profile): profile is Profile => profile !== null);
}

/**
 * Get list of users a user is following
 */
export async function getFollowing(userId: string): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("follows")
    .select(`
      following_id,
      profiles!follows_following_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        bio,
        primary_instrument,
        created_at,
        updated_at,
        account_type
      )
    `)
    .eq("follower_id", userId)
    .eq("status", "accepted");

  if (error || !data) {
    return [];
  }

  return (data as unknown as { profiles: Profile | null }[])
    .map((follow) => follow.profiles)
    .filter((profile): profile is Profile => profile !== null);
}

/**
 * Get leaderboard by metric
 */
export async function getLeaderboard(
  metric: "time" | "sessions" | "days",
  limit: number = 50
): Promise<ProfileWithStats[]> {
  const supabase = await createClient();

  // Get user stats sorted by the metric
  let orderColumn: string;
  switch (metric) {
    case "time":
      orderColumn = "total_seconds";
      break;
    case "sessions":
      orderColumn = "total_sessions";
      break;
    case "days":
      orderColumn = "practice_days";
      break;
  }

  // user_stats uses the viewer's permissions (security_invoker), so private
  // accounts only have non-zero totals for their accepted followers.
  const { data: stats, error } = await supabase
    .from("user_stats")
    .select("*")
    .gt("total_sessions", 0)
    .order(orderColumn, { ascending: false })
    .limit(limit);

  if (error || !stats) {
    return [];
  }

  const userIds = stats.map((s: UserStats) => s.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (!profiles) {
    return [];
  }

  // Combine profiles with stats
  const leaderboard = profiles.map((profile: Profile) => {
    const userStats = stats.find((s: UserStats) => s.user_id === profile.id);
    return {
      ...profile,
      stats: userStats!,
      followers_count: 0,
      following_count: 0,
      is_following: false,
      follow_status: 'none' as const,
    };
  });

  // Sort to match the original stats order
  leaderboard.sort((a, b) => {
    const aValue = a.stats[orderColumn as keyof UserStats] as number;
    const bValue = b.stats[orderColumn as keyof UserStats] as number;
    return bValue - aValue;
  });

  return leaderboard;
}

/**
 * Get pending follow requests for the current user
 */
export async function getPendingFollowRequests(): Promise<Profile[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("follows")
    .select(`
      follower_id,
      profiles!follows_follower_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        bio,
        primary_instrument,
        created_at,
        updated_at,
        account_type
      )
    `)
    .eq("following_id", user.id)
    .eq("status", "pending");

  if (error || !data) {
    return [];
  }

  return (data as unknown as { profiles: Profile | null }[])
    .map((follow) => follow.profiles)
    .filter((profile): profile is Profile => profile !== null);
}

/**
 * Number of pending follow requests for the current user
 */
export async function getPendingFollowRequestCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", user.id)
    .eq("status", "pending");

  return count ?? 0;
}

/**
 * Update profile settings
 */
export async function updateProfile(updates: {
  display_name?: string;
  bio?: string;
  primary_instrument?: string;
  account_type?: "public" | "private";
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("profiles")
    // @ts-expect-error - Supabase types will be properly generated after DB setup
    .update(updates)
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export type SearchResult = Profile & {
  follow_status: "none" | "pending" | "accepted" | "self";
};

/**
 * Search users by username or display name. The query is normalized here and
 * passed as a bound parameter to the search_profiles() SQL function.
 * Private accounts are included (with their public profile fields only).
 */
export async function searchUsers(rawQuery: string): Promise<SearchResult[]> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) {
    return [];
  }

  const supabase = await createClient();

  const [{ data, error }, { data: { user } }] = await Promise.all([
    // @ts-expect-error - Supabase types will be properly generated after DB setup
    supabase.rpc("search_profiles", { search_query: query, result_limit: 20 }),
    supabase.auth.getUser(),
  ]);

  if (error || !data) {
    if (error) console.error("Error searching users:", error);
    return [];
  }

  const profiles = data as Profile[];
  const statusById = new Map<string, "pending" | "accepted">();

  if (user && profiles.length > 0) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id, status")
      .eq("follower_id", user.id)
      .in("following_id", profiles.map((p) => p.id));

    for (const f of (follows ?? []) as { following_id: string; status: "pending" | "accepted" }[]) {
      statusById.set(f.following_id, f.status);
    }
  }

  return profiles.map((profile) => ({
    ...profile,
    follow_status: profile.id === user?.id ? "self" : statusById.get(profile.id) ?? "none",
  }));
}

/**
 * Every session's start time and duration for a user, newest first, for the
 * practice calendar and streak. Grouping into days happens in the browser so
 * it uses the viewer's time zone. Fetched in pages because PostgREST caps a
 * single response (1000 rows by default on Supabase).
 */
export async function getPracticeHistory(userId: string): Promise<PracticeHistoryEntry[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const history: PracticeHistoryEntry[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("sessions")
      .select("created_at, duration_seconds")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error || !data) {
      if (error) console.error("Error fetching practice history:", error);
      break;
    }

    for (const row of data as { created_at: string; duration_seconds: number | null }[]) {
      history.push({
        created_at: row.created_at,
        duration_seconds: row.duration_seconds || 0,
      });
    }
    if (data.length < PAGE) break;
  }

  return history;
}
