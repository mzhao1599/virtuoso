-- ============================================
-- MIGRATION: Follow Requests System
-- Adds pending/accepted status to follows
-- ============================================

-- Add status column to follows table
ALTER TABLE public.follows 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted'));

-- Create index for status lookups
CREATE INDEX IF NOT EXISTS idx_follows_status ON public.follows(status);
CREATE INDEX IF NOT EXISTS idx_follows_following_status ON public.follows(following_id, status);
CREATE INDEX IF NOT EXISTS idx_follows_follower_status ON public.follows(follower_id, status);

-- Update RLS policy for profiles to show ALL profiles (even private)
-- But sessions will still be filtered
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "All profiles are viewable" ON public.profiles;

CREATE POLICY "All profiles are viewable"
  ON public.profiles FOR SELECT
  USING (true);

-- Update sessions policy to only show from accepted follows
DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.sessions;
DROP POLICY IF EXISTS "Sessions viewable based on privacy and follow status" ON public.sessions;

CREATE POLICY "Sessions viewable based on privacy and follow status"
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
          AND status = 'accepted'
        )
      )
    )
  );

-- Function to automatically set status based on target user's account type
CREATE OR REPLACE FUNCTION set_follow_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user being followed has a private account
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.following_id 
    AND account_type = 'private'
  ) THEN
    NEW.status = 'pending';
  ELSE
    NEW.status = 'accepted';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set follow status on insert
DROP TRIGGER IF EXISTS set_follow_status_trigger ON public.follows;
CREATE TRIGGER set_follow_status_trigger
  BEFORE INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION set_follow_status();

-- Allow users to update follow status for requests directed at them
DROP POLICY IF EXISTS "Users can accept/reject follow requests" ON public.follows;
CREATE POLICY "Users can accept/reject follow requests"
  ON public.follows FOR UPDATE
  USING (auth.uid() = following_id AND status = 'pending')
  WITH CHECK (auth.uid() = following_id AND status IN ('accepted', 'pending'));

-- Allow users to delete (reject) follow requests directed at them
DROP POLICY IF EXISTS "Users can delete follow requests" ON public.follows;
CREATE POLICY "Users can delete follow requests"
  ON public.follows FOR DELETE
  USING (auth.uid() = following_id AND status = 'pending');
