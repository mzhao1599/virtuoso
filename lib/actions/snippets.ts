"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_SNIPPET_BYTES = 3 * 1024 * 1024; // matches serverActions.bodySizeLimit
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Upload an audio snippet to the private `snippets` bucket and persist a record.
 *
 * Expects FormData with:
 *   file          — WAV Blob
 *   session_id    — UUID of the parent practice session (must be the caller's)
 *   start_time_ms — offset from session start (ms)
 *   duration_ms   — snippet duration (ms)
 *
 * Each session can have at most one snippet. The file is stored at
 * `<user id>/<session id>/<random>.wav`; storage policies reject any other path.
 */
export async function uploadSnippet(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const file = formData.get("file");
  const sessionId = formData.get("session_id");
  const startTimeMs = parseInt(String(formData.get("start_time_ms")), 10);
  const durationMs = parseInt(String(formData.get("duration_ms")), 10);

  if (!(file instanceof Blob) || typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
    throw new Error("Missing required fields");
  }
  if (file.size === 0 || file.size > MAX_SNIPPET_BYTES) {
    throw new Error("Clip is empty or too large");
  }

  // ── Check snippet limit (1 per session) ───────────────────
  const { count, error: countError } = await supabase
    .from("snippets")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (countError) {
    console.error("Error checking snippet count:", countError);
  }

  if (count && count >= 1) {
    throw new Error("Only one clip can be saved per session.");
  }

  // ── 1. Upload to Supabase Storage ─────────────────────────
  const storagePath = `${user.id}/${sessionId}/${crypto.randomUUID()}.wav`;

  const { error: uploadError } = await supabase.storage
    .from("snippets")
    .upload(storagePath, file, {
      contentType: "audio/wav",
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error("Failed to upload audio file");
  }

  // ── 2. Insert DB record ───────────────────────────────────
  // @ts-expect-error - Supabase types will be properly generated after DB setup
  const { error: dbError } = await supabase.from("snippets").insert({
    session_id: sessionId,
    user_id: user.id,
    storage_path: storagePath,
    start_time_ms: Number.isFinite(startTimeMs) ? Math.max(0, startTimeMs) : 0,
    duration_ms: Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0,
  });

  if (dbError) {
    console.error("DB insert error:", dbError);
    // Attempt to clean up the uploaded file
    await supabase.storage.from("snippets").remove([storagePath]);
    throw new Error("Failed to save snippet record");
  }

  revalidatePath("/dashboard");
}
