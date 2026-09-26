-- ============================================
-- MIGRATION 008: Tighten read access
-- - Kudos and comments are readable only when their session is readable,
--   and can only be added to sessions the user can read.
-- - Comment authors can edit the text of their comments, nothing else.
-- - Pending follow requests are visible only to the two users involved.
-- - user_stats runs with the caller's permissions (security_invoker), so
--   it no longer exposes totals of private accounts to everyone.
-- - Drop the unused sessions_with_counts view.
-- Requires Postgres 15+ (security_invoker). Safe to re-run.
-- ============================================

-- Kudos ----------------------------------------------------------------------
DROP POLICY IF EXISTS "Kudos are viewable by everyone" ON public.kudos;
DROP POLICY IF EXISTS "Kudos are viewable with their session" ON public.kudos;
CREATE POLICY "Kudos are viewable with their session"
  ON public.kudos FOR SELECT
  USING (
    -- public.sessions has its own RLS, so this only finds readable sessions
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = kudos.session_id)
  );

DROP POLICY IF EXISTS "Users can give kudos" ON public.kudos;
CREATE POLICY "Users can give kudos"
  ON public.kudos FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = kudos.session_id)
  );

-- Comments -------------------------------------------------------------------
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Comments are viewable with their session" ON public.comments;
CREATE POLICY "Comments are viewable with their session"
  ON public.comments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = comments.session_id)
  );

DROP POLICY IF EXISTS "Users can post comments" ON public.comments;
CREATE POLICY "Users can post comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = comments.session_id)
  );

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the text can change (updated_at is set by its trigger).
REVOKE UPDATE ON public.comments FROM anon, authenticated;
GRANT UPDATE (content) ON public.comments TO authenticated;

-- Follows --------------------------------------------------------------------
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
DROP POLICY IF EXISTS "Accepted follows are public, requests are private" ON public.follows;
CREATE POLICY "Accepted follows are public, requests are private"
  ON public.follows FOR SELECT
  USING (
    status = 'accepted'
    OR auth.uid() = follower_id
    OR auth.uid() = following_id
  );

-- Views ----------------------------------------------------------------------
ALTER VIEW public.user_stats SET (security_invoker = true);

DROP VIEW IF EXISTS public.sessions_with_counts;
