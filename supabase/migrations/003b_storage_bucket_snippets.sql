-- ============================================
-- STORAGE BUCKET SETUP FOR SNIPPETS
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Create the 'snippets' bucket (public for easy playback)
INSERT INTO storage.buckets (id, name, public)
VALUES ('snippets', 'snippets', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Authenticated users can upload snippets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read snippets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own snippets" ON storage.objects;

-- 2. Allow authenticated users to upload snippets
CREATE POLICY "Authenticated users can upload snippets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'snippets' AND auth.role() = 'authenticated');

-- 3. Allow anyone to read/download snippets (for playback)
CREATE POLICY "Anyone can read snippets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'snippets');

-- 4. Allow users to delete their own snippets
CREATE POLICY "Users can delete own snippets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'snippets' AND auth.uid()::text = (storage.foldername(name))[1]);
