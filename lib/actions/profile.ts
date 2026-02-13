"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProfileWithStats, UserStats, Profile } from "@/src/types";

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
 * Calculate current streak for a user
 */
export async function calculateStreak(userId: string): Promise<number> {
  const supabase = await createClient();

  // Get all session dates
  const { data: sessions } = await supabase
    .from("sessions")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!sessions || sessions.length === 0) {
    return 0;
  }

  // Extract unique dates (YYYY-MM-DD)
  const uniqueDates = new Set(
    sessions.map((s: { created_at: string }) => new Date(s.created_at).toISOString().split("T")[0])
  );

  const sortedDates = Array.from(uniqueDates).sort().reverse();

  // Check if streak is current (practiced today or yesterday)
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0;
  }

  // Count consecutive days
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.floor(
      (prevDate.getTime() - currDate.getTime()) / 86400000
    );

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
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

  return data.map((follow: any) => follow.profiles).filter(Boolean);
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

  return data.map((follow: any) => follow.profiles).filter(Boolean);
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

  const { data: stats, error } = await supabase
    .from("user_stats")
    .select("*")
    .order(orderColumn, { ascending: false })
    .limit(limit);

  if (error || !stats) {
    return [];
  }

  // Get profiles for these users (show all users, not just public)
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

  return data.map((follow: any) => follow.profiles).filter(Boolean);
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

/**
 * Search for users by username or display name
 */
export async function searchUsers(query: string): Promise<Profile[]> {
  const supabase = await createClient();

  if (!query || query.length < 2) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("account_type", "public")
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);

  if (error || !data) {
    return [];
  }

  return data as Profile[];
}

/**
 * Get practice calendar data for heat map (last 12 months)
 */
export async function getPracticeCalendarData(
  userId: string
): Promise<{ created_at: string; duration_seconds: number }[]> {
  const supabase = await createClient();

  // Calculate date 12 months ago
  const today = new Date();
  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setMonth(today.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const { data, error } = await supabase
    .from("sessions")
    .select("created_at, duration_seconds")
    .eq("user_id", userId)
    .gte("created_at", twelveMonthsAgo.toISOString())
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  // Return raw session data - let client group by local date
  return data.map((session: any) => ({
    created_at: session.created_at,
    duration_seconds: session.duration_seconds || 0,
  }));
}
