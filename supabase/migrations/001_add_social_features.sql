-- ============================================
-- MIGRATION: Add Social Features
-- Run this AFTER the initial schema.sql
-- ============================================

-- Add account_type to profiles (default: public)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'public' CHECK (account_type IN ('public', 'private'));

-- Create index for account_type lookups
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

-- Update RLS policies to respect account_type
-- Drop old policy and recreate with privacy check
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (
    account_type = 'public' 
    OR id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.follows 
      WHERE following_id = profiles.id 
      AND follower_id = auth.uid()
    )
  );

-- Sessions should only be visible if profile is public or user is following
DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.sessions;

CREATE POLICY "Sessions are viewable by everyone"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = sessions.user_id
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
