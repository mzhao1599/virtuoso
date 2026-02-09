-- ============================================
-- MIGRATION: Add Snippets Table
-- Stores captured audio "miracles" from practice sessions
-- ============================================

-- Create snippets table
CREATE TABLE IF NOT EXISTS public.snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  audio_url TEXT NOT NULL,
  start_time_ms INTEGER NOT NULL DEFAULT 0, -- offset from session start
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_snippets_session_id ON public.snippets(session_id);
CREATE INDEX IF NOT EXISTS idx_snippets_user_id ON public.snippets(user_id);

-- Enable RLS
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe re-run)
DROP POLICY IF EXISTS "Snippets are viewable by everyone" ON public.snippets;
DROP POLICY IF EXISTS "Users can insert own snippets" ON public.snippets;
DROP POLICY IF EXISTS "Users can delete own snippets" ON public.snippets;

-- Policies
CREATE POLICY "Snippets are viewable by everyone"
  ON public.snippets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = snippets.user_id
      AND (
        profiles.account_type = 'public'
        OR profiles.id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.follows
          WHERE following_id = profiles.id
          AND follower_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert own snippets"
  ON public.snippets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snippets"
  ON public.snippets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Create Supabase Storage bucket for snippets
-- Run this in the Supabase SQL Editor:
-- ============================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('snippets', 'snippets', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- CREATE POLICY "Authenticated users can upload snippets"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'snippets' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "Anyone can read snippets"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'snippets');
--
-- CREATE POLICY "Users can delete own snippets"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'snippets' AND auth.uid()::text = (storage.foldername(name))[1]);
