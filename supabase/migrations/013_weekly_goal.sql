-- ============================================
-- MIGRATION 013: Optional weekly practice goal
-- Minutes per week; NULL means no goal. Progress is computed in the app
-- from the user's sessions in their local week. Safe to re-run.
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_goal_minutes INTEGER;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_weekly_goal_range;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_weekly_goal_range
  CHECK (weekly_goal_minutes IS NULL OR weekly_goal_minutes BETWEEN 1 AND 10080);
