-- ============================================
-- MIGRATION 007: Private snippet storage
-- - The `snippets` bucket becomes private; the app serves clips through
--   short-lived signed URLs instead of public URLs.
-- - Each snippet row stores the object path (`storage_path`) it points to.
-- - Uploads are only allowed into `<own user id>/<own session id>/...`.
-- - Audio objects and snippet rows are readable only when the session they
--   belong to is readable (same rule as public.sessions).
-- Safe to re-run.
-- ============================================

-- 1. Store the storage object path on each snippet ---------------------------
ALTER TABLE public.snippets ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Backfill from the public URLs saved so far:
--   https://<project>.supabase.co/storage/v1/object/public/snippets/<path>
UPDATE public.snippets
SET storage_path = split_part(audio_url, '/storage/v1/object/public/snippets/', 2)
WHERE storage_path IS NULL
  AND audio_url LIKE '%/storage/v1/object/public/snippets/%';

CREATE UNIQUE INDEX IF NOT EXISTS idx_snippets_storage_path
  ON public.snippets(storage_path);

-- New uploads only set storage_path; audio_url is kept for rows that point
-- at a static file instead (the demo data).
ALTER TABLE public.snippets ALTER COLUMN audio_url DROP NOT NULL;

ALTER TABLE public.snippets DROP CONSTRAINT IF EXISTS snippets_has_audio;
ALTER TABLE public.snippets
  ADD CONSTRAINT snippets_has_audio CHECK (storage_path IS NOT NULL OR audio_url IS NOT NULL);

-- 2. Snippet rows: readable with their session; insert only for own session --
DROP POLICY IF EXISTS "Snippets are viewable by everyone" ON public.snippets;
DROP POLICY IF EXISTS "Snippets are viewable with their session" ON public.snippets;
CREATE POLICY "Snippets are viewable with their session"
  ON public.snippets FOR SELECT
  USING (
    -- public.sessions has its own RLS, so this only finds readable sessions
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = snippets.session_id)
  );

DROP POLICY IF EXISTS "Users can insert own snippets" ON public.snippets;
CREATE POLICY "Users can insert own snippets"
  ON public.snippets FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND audio_url IS NULL
    AND storage_path LIKE auth.uid()::text || '/' || session_id::text || '/%'
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = snippets.session_id AND s.user_id = auth.uid()
    )
  );

-- 3. Storage bucket and object policies -------------------------------------
UPDATE storage.buckets SET public = false WHERE id = 'snippets';

DROP POLICY IF EXISTS "Authenticated users can upload snippets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read snippets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own snippets" ON storage.objects;
DROP POLICY IF EXISTS "Users upload snippets to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Snippet audio is readable with its session" ON storage.objects;
DROP POLICY IF EXISTS "Users delete their own snippet audio" ON storage.objects;

-- Path layout: <user id>/<session id>/<random>.wav
CREATE POLICY "Users upload snippets to their own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'snippets'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id::text = (storage.foldername(name))[2]
        AND s.user_id = auth.uid()
    )
  );

-- Signing a URL requires SELECT on the object, so this decides who can play it.
CREATE POLICY "Snippet audio is readable with its session"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'snippets'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      -- public.snippets RLS (above) limits this to readable sessions
      OR EXISTS (SELECT 1 FROM public.snippets sn WHERE sn.storage_path = objects.name)
    )
  );

CREATE POLICY "Users delete their own snippet audio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'snippets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
