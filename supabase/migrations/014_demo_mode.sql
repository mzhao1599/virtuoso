-- ============================================
-- MIGRATION 014: Read-only demo accounts
-- Profiles with is_demo = true hold the fictional data shown at /demo
-- (loaded by supabase/seed/demo.sql). The database, not just the UI,
-- keeps that data read-only:
--   * RESTRICTIVE policies reject any insert/update/delete that touches a
--     demo profile, a demo user's sessions, kudos, comments, snippets or
--     follows - including kudos, comments or follows from real users.
--   * is_demo (and username) can't be changed through the API: profile
--     updates are limited to an explicit column list.
-- Demo accounts are left out of search and the signed-in leaderboard.
-- Run this before the seed. Safe to re-run.
-- ============================================

-- 1. Flag ----------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_demo ON public.profiles(is_demo) WHERE is_demo;

-- 2. Profile columns users may write ------------------------------------------
-- Profiles are created by the handle_new_user trigger (SECURITY DEFINER), so
-- clients never need INSERT. UPDATE is limited to the settings form's fields
-- (username, avatar_url and is_demo are not among them).
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name, bio, primary_instrument, account_type, weekly_goal_minutes)
  ON public.profiles TO authenticated;

-- 3. Helpers (SECURITY DEFINER so they see rows the caller's RLS hides) -------
CREATE OR REPLACE FUNCTION public.is_demo_user(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT is_demo FROM public.profiles WHERE id = uid), false);
$$;

CREATE OR REPLACE FUNCTION public.is_demo_session(sid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT p.is_demo FROM public.sessions s JOIN public.profiles p ON p.id = s.user_id WHERE s.id = sid),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_demo_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_demo_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_demo_user(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_session(UUID) TO anon, authenticated;

-- 4. Restrictive policies: combined with AND on top of the existing ones ----
-- profiles
DROP POLICY IF EXISTS "Demo profiles are read-only" ON public.profiles;
CREATE POLICY "Demo profiles are read-only"
  ON public.profiles AS RESTRICTIVE FOR UPDATE
  USING (NOT is_demo)
  WITH CHECK (NOT is_demo);

-- sessions
DROP POLICY IF EXISTS "Demo sessions: no inserts" ON public.sessions;
CREATE POLICY "Demo sessions: no inserts"
  ON public.sessions AS RESTRICTIVE FOR INSERT
  WITH CHECK (NOT public.is_demo_user(user_id));

DROP POLICY IF EXISTS "Demo sessions: no updates" ON public.sessions;
CREATE POLICY "Demo sessions: no updates"
  ON public.sessions AS RESTRICTIVE FOR UPDATE
  USING (NOT public.is_demo_user(user_id))
  WITH CHECK (NOT public.is_demo_user(user_id));

DROP POLICY IF EXISTS "Demo sessions: no deletes" ON public.sessions;
CREATE POLICY "Demo sessions: no deletes"
  ON public.sessions AS RESTRICTIVE FOR DELETE
  USING (NOT public.is_demo_user(user_id));

-- kudos (neither from demo users nor on demo sessions)
DROP POLICY IF EXISTS "Demo kudos: no inserts" ON public.kudos;
CREATE POLICY "Demo kudos: no inserts"
  ON public.kudos AS RESTRICTIVE FOR INSERT
  WITH CHECK (NOT public.is_demo_user(user_id) AND NOT public.is_demo_session(session_id));

DROP POLICY IF EXISTS "Demo kudos: no deletes" ON public.kudos;
CREATE POLICY "Demo kudos: no deletes"
  ON public.kudos AS RESTRICTIVE FOR DELETE
  USING (NOT public.is_demo_user(user_id) AND NOT public.is_demo_session(session_id));

-- comments
DROP POLICY IF EXISTS "Demo comments: no inserts" ON public.comments;
CREATE POLICY "Demo comments: no inserts"
  ON public.comments AS RESTRICTIVE FOR INSERT
  WITH CHECK (NOT public.is_demo_user(user_id) AND NOT public.is_demo_session(session_id));

DROP POLICY IF EXISTS "Demo comments: no updates" ON public.comments;
CREATE POLICY "Demo comments: no updates"
  ON public.comments AS RESTRICTIVE FOR UPDATE
  USING (NOT public.is_demo_user(user_id) AND NOT public.is_demo_session(session_id))
  WITH CHECK (NOT public.is_demo_user(user_id) AND NOT public.is_demo_session(session_id));

DROP POLICY IF EXISTS "Demo comments: no deletes" ON public.comments;
CREATE POLICY "Demo comments: no deletes"
  ON public.comments AS RESTRICTIVE FOR DELETE
  USING (NOT public.is_demo_user(user_id) AND NOT public.is_demo_session(session_id));

-- follows (a real user cannot follow, or be followed by, a demo account)
DROP POLICY IF EXISTS "Demo follows: no inserts" ON public.follows;
CREATE POLICY "Demo follows: no inserts"
  ON public.follows AS RESTRICTIVE FOR INSERT
  WITH CHECK (NOT public.is_demo_user(follower_id) AND NOT public.is_demo_user(following_id));

DROP POLICY IF EXISTS "Demo follows: no updates" ON public.follows;
CREATE POLICY "Demo follows: no updates"
  ON public.follows AS RESTRICTIVE FOR UPDATE
  USING (NOT public.is_demo_user(follower_id) AND NOT public.is_demo_user(following_id))
  WITH CHECK (NOT public.is_demo_user(follower_id) AND NOT public.is_demo_user(following_id));

DROP POLICY IF EXISTS "Demo follows: no deletes" ON public.follows;
CREATE POLICY "Demo follows: no deletes"
  ON public.follows AS RESTRICTIVE FOR DELETE
  USING (NOT public.is_demo_user(follower_id) AND NOT public.is_demo_user(following_id));

-- snippets
DROP POLICY IF EXISTS "Demo snippets: no inserts" ON public.snippets;
CREATE POLICY "Demo snippets: no inserts"
  ON public.snippets AS RESTRICTIVE FOR INSERT
  WITH CHECK (NOT public.is_demo_user(user_id));

DROP POLICY IF EXISTS "Demo snippets: no deletes" ON public.snippets;
CREATE POLICY "Demo snippets: no deletes"
  ON public.snippets AS RESTRICTIVE FOR DELETE
  USING (NOT public.is_demo_user(user_id));

-- 5. user_stats gains is_demo so the leaderboards can filter on it ----------
CREATE OR REPLACE VIEW public.user_stats
WITH (security_invoker = true) AS
SELECT
  p.id AS user_id,
  COUNT(DISTINCT s.id) AS total_sessions,
  COALESCE(SUM(s.duration_seconds), 0) AS total_seconds,
  COUNT(DISTINCT DATE(s.created_at AT TIME ZONE 'UTC')) AS practice_days,
  MAX(s.created_at) AS last_practice_at,
  p.is_demo
FROM public.profiles p
LEFT JOIN public.sessions s ON s.user_id = p.id
GROUP BY p.id;

-- 6. Search leaves demo accounts out -------------------------------------------
CREATE OR REPLACE FUNCTION public.search_profiles(search_query TEXT, result_limit INTEGER DEFAULT 20)
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH q AS (
    SELECT
      btrim(search_query) AS raw,
      replace(replace(replace(btrim(search_query), '\', '\\'), '%', '\%'), '_', '\_') AS escaped
  )
  SELECT p.*
  FROM public.profiles p, q
  WHERE char_length(q.raw) BETWEEN 2 AND 50
    AND NOT p.is_demo
    AND (
      p.username ILIKE '%' || q.escaped || '%' ESCAPE '\'
      OR p.display_name ILIKE '%' || q.escaped || '%' ESCAPE '\'
    )
  ORDER BY
    lower(p.username) = lower(q.raw) DESC,
    p.username ILIKE q.escaped || '%' ESCAPE '\' DESC,
    p.username
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 20), 1), 50);
$$;
