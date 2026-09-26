"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enrichSessions, type SessionWithProfile } from "@/lib/sessions/enrich";
import type { SessionInsert, FeedSession, Session, Profile } from "@/src/types";

/**
 * Create a new practice session
 */
export async function createSession(
  data: Omit<SessionInsert, "user_id" | "is_manual_entry">
): Promise<Session> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: session, error } = await supabase
    .from("sessions")
    // @ts-expect-error - Supabase types will be properly generated after DB setup
    .insert({
      ...data,
      user_id: user.id,
      audio_url: data.audio_url || null,
      is_manual_entry: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating session:", error);
    throw new Error("Failed to create session");
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  
  return session as Session;
}

/**
 * Create a new manual practice session
 */
export async function createManualSession(data: {
  duration_seconds: number;
  instrument: string;
  piece_name: string | null;
  skills_practiced: string | null;
  description: string | null;
  focus: "clear_goals" | "mid" | "noodling" | null;
  entropy: "few_measures" | "in_between" | "whole_piece" | null;
  enjoyment: "progress" | "ok" | "stuck" | null;
  created_at?: string;
}): Promise<Session> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: session, error } = await supabase
    .from("sessions")
    // @ts-expect-error - Supabase types will be properly generated after DB setup
    .insert({
      user_id: user.id,
      instrument: data.instrument,
      duration_seconds: data.duration_seconds,
      break_seconds: 0,
      break_timeline: [],
      piece_name: data.piece_name,
      skills_practiced: data.skills_practiced,
      description: data.description,
      focus: data.focus,
      entropy: data.entropy,
      enjoyment: data.enjoyment,
      audio_url: null,
      is_manual_entry: true,
      created_at: data.created_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating manual session:", error);
    throw new Error("Failed to create manual session");
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  
  return session as Session;
}

/**
 * Update an existing practice session
 */
export async function updateSession(
  sessionId: string,
  data: {
    piece_name?: string | null;
    skills_practiced?: string | null;
    description?: string | null;
    focus?: "clear_goals" | "mid" | "noodling" | null;
    entropy?: "few_measures" | "in_between" | "whole_piece" | null;
    enjoyment?: "progress" | "ok" | "stuck" | null;
    created_at?: string; // Allow updating timestamp for manual entries
    duration_seconds?: number; // Allow updating duration for manual entries
    instrument?: string; // Allow updating instrument for manual entries
  }
): Promise<Session> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Verify session belongs to user and check if it's a manual entry
  const { data: existingSession } = await supabase
    .from("sessions")
    .select("user_id, is_manual_entry")
    .eq("id", sessionId)
    .single();

  type SessionWithUserIdAndManual = { user_id: string; is_manual_entry: boolean };

  if (!existingSession || (existingSession as SessionWithUserIdAndManual).user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  // Only allow updating created_at, duration, and instrument for manual entries
  const updateData: Partial<Session> = {
    piece_name: data.piece_name,
    skills_practiced: data.skills_practiced,
    description: data.description,
    focus: data.focus,
    entropy: data.entropy,
    enjoyment: data.enjoyment,
  };
  
  if ((existingSession as SessionWithUserIdAndManual).is_manual_entry) {
    if (data.created_at) updateData.created_at = data.created_at;
    if (data.duration_seconds !== undefined) updateData.duration_seconds = data.duration_seconds;
    if (data.instrument) updateData.instrument = data.instrument;
  }

  const { data: session, error } = await supabase
    .from("sessions")
    // @ts-expect-error - Supabase types will be properly generated after DB setup
    .update(updateData)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating session:", error);
    throw new Error("Failed to update session");
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  
  return session as Session;
}

/**
 * Delete a practice session
 */
export async function deleteSession(sessionId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Verify session belongs to user
  const { data: existingSession } = await supabase
    .from("sessions")
    .select("user_id")
    .eq("id", sessionId)
    .single();

  type SessionWithUserId = { user_id: string };

  if (!existingSession || (existingSession as SessionWithUserId).user_id !== user.id) {
    throw new Error("Unauthorized");
  }

  // Snippet rows cascade with the session; their audio files do not.
  const { data: snippets } = await supabase
    .from("snippets")
    .select("storage_path")
    .eq("session_id", sessionId);

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("Error deleting session:", error);
    throw new Error("Failed to delete session");
  }

  const paths = ((snippets ?? []) as { storage_path: string | null }[])
    .map((s) => s.storage_path)
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("snippets").remove(paths);
    if (storageError) {
      console.error("Error deleting snippet audio:", storageError);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

/**
 * Get a single session by ID (for editing - must be own session)
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Only fetch if session belongs to current user
  const { data: session, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return null;
  }

  if (!session) {
    return null;
  }

  return session as Session;
}

/**
 * Get feed sessions (from followed users + own)
 */
export async function getFeedSessions(limit = 20): Promise<FeedSession[]> {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get followed user IDs (only accepted follows)
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .eq("status", "accepted");

  const followingIds = (follows as Array<{ following_id: string }> || []).map((f) => f.following_id);
  const userIds = [user.id, ...followingIds];

  // Fetch sessions with counts and profile info
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(
      `
      *,
      profiles!inner(id, username, display_name, avatar_url)
      `
    )
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching feed:", error);
    return [];
  }

  return enrichSessions(supabase, sessions as unknown as SessionWithProfile[], user.id);
}

/**
 * Toggle kudo on a session
 */
export async function toggleKudo(sessionId: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Check if already kudoed
  const { data: existing } = await supabase
    .from("kudos")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  type KudoWithId = { id: string };

  if (existing) {
    // Remove kudo
    await supabase.from("kudos").delete().eq("id", (existing as KudoWithId).id);
  } else {
    // Add kudo
    // @ts-expect-error - Supabase types will be properly generated after DB setup
    await supabase.from("kudos").insert({
      session_id: sessionId,
      user_id: user.id,
    });
  }

  revalidatePath("/dashboard");
}

/**
 * Add a comment to a session
 */
export async function addComment(sessionId: string, content: string) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // @ts-expect-error - Supabase types will be properly generated after DB setup
  const { error } = await supabase.from("comments").insert({
    session_id: sessionId,
    user_id: user.id,
    content,
  });

  if (error) {
    console.error("Error adding comment:", error);
    throw new Error("Failed to add comment");
  }

  revalidatePath("/dashboard");
}

/**
 * Get user's own sessions
 */
export async function getUserSessions(userId: string, limit = 20) {
  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select(
      `
      *,
      profiles!inner(id, username, display_name, avatar_url)
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching user sessions:", error);
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return enrichSessions(supabase, sessions as unknown as SessionWithProfile[], user?.id ?? null);
}

/**
 * Get comments for a session
 */
export async function getSessionComments(sessionId: string) {
  const supabase = await createClient();

  const { data: comments, error } = await supabase
    .from("comments")
    .select(`
      id,
      content,
      created_at,
      profiles!inner(id, username, display_name, avatar_url)
    `)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }

  type CommentWithProfile = {
    id: string;
    content: string;
    created_at: string;
    profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  };

  return (comments as unknown as CommentWithProfile[]).map((comment) => ({
    id: comment.id,
    content: comment.content,
    created_at: comment.created_at,
    author: comment.profiles,
  }));
}

/**
 * Get users who gave kudos to a session
 */
export async function getSessionKudos(sessionId: string) {
  const supabase = await createClient();

  const { data: kudos, error } = await supabase
    .from("kudos")
    .select(`
      profiles!inner(id, username, display_name, avatar_url)
    `)
    .eq("session_id", sessionId);

  if (error) {
    console.error("Error fetching kudos:", error);
    return [];
  }

  type KudoWithProfile = {
    profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  };

  return (kudos as unknown as KudoWithProfile[]).map((kudo) => kudo.profiles);
}
