"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Upload an audio snippet to Supabase Storage and persist a record.
 *
 * Expects FormData with:
 *   file         — WAV Blob
 *   session_id   — UUID of the parent practice session
 *   start_time_ms — offset from session start (ms)
 *   duration_ms   — snippet duration (ms)
 * 
 * Note: Free users are limited to 1 snippet per session.
 */
export async function uploadSnippet(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const file = formData.get("file") as File;
  const sessionId = formData.get("session_id") as string;
  const startTimeMs = parseInt(formData.get("start_time_ms") as string, 10);
  const durationMs = parseInt(formData.get("duration_ms") as string, 10);

  if (!file || !sessionId) {
    throw new Error("Missing required fields");
  }

  // ── Check snippet limit (1 per session for all users) ────
  const { count, error: countError } = await supabase
    .from("snippets")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (countError) {
    console.error("Error checking snippet count:", countError);
  }

  if (count && count >= 1) {
    throw new Error("Maximum 1 snippet per session. Upgrade for more!");
  }

  // ── 1. Upload to Supabase Storage ─────────────────────────
  const fileName = `${user.id}/${sessionId}/${crypto.randomUUID()}.wav`;

  const { error: uploadError } = await supabase.storage
    .from("snippets")
    .upload(fileName, file, {
      contentType: "audio/wav",
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error("Failed to upload audio file");
  }

  // ── 2. Get public URL ─────────────────────────────────────
  const { data: urlData } = supabase.storage
    .from("snippets")
    .getPublicUrl(fileName);

  const audioUrl = urlData.publicUrl;

  // ── 3. Insert DB record ───────────────────────────────────
  // @ts-expect-error - Supabase types will be properly generated after DB setup
  const { error: dbError } = await supabase.from("snippets").insert({
    session_id: sessionId,
    user_id: user.id,
    audio_url: audioUrl,
    start_time_ms: startTimeMs || 0,
    duration_ms: durationMs || 0,
  });

  if (dbError) {
    console.error("DB insert error:", dbError);
    // Attempt to clean up the uploaded file
    await supabase.storage.from("snippets").remove([fileName]);
    throw new Error("Failed to save snippet record");
  }

  revalidatePath("/dashboard");
  return { audioUrl };
}
