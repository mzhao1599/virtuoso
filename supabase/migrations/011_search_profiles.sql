-- ============================================
-- MIGRATION 011: Parameterized user search
-- search_profiles(search_query) replaces the client-built PostgREST filter,
-- which interpolated the raw query into the filter string. The query is a
-- bound parameter here, and LIKE wildcards in it (% and _) are escaped so
-- they match literally.
-- Private accounts are returned too (profiles are readable by everyone, and
-- being findable is how someone sends a follow request); their sessions,
-- stats, kudos and comments stay protected by RLS. SECURITY INVOKER, so the
-- caller's RLS applies. Safe to re-run.
-- ============================================

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
    AND (
      p.username ILIKE '%' || q.escaped || '%' ESCAPE '\'
      OR p.display_name ILIKE '%' || q.escaped || '%' ESCAPE '\'
    )
  ORDER BY
    lower(p.username) = lower(q.raw) DESC,          -- exact username first
    p.username ILIKE q.escaped || '%' ESCAPE '\' DESC, -- then prefix matches
    p.username
  LIMIT LEAST(GREATEST(COALESCE(result_limit, 20), 1), 50);
$$;

REVOKE ALL ON FUNCTION public.search_profiles(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_profiles(TEXT, INTEGER) TO anon, authenticated;
