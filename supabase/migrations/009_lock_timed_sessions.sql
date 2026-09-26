-- ============================================
-- MIGRATION 009: Lock measured fields of timed sessions
-- A session recorded with the timer (is_manual_entry = false) keeps the
-- duration, breaks and start time the timer measured. Manual entries stay
-- fully editable. Whether a session is manual cannot change after insert,
-- so a timed session cannot be relabelled to get around this.
-- Safe to re-run.
-- ============================================

CREATE OR REPLACE FUNCTION public.protect_timed_session_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_manual_entry IS DISTINCT FROM OLD.is_manual_entry THEN
    RAISE EXCEPTION 'is_manual_entry cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT OLD.is_manual_entry AND (
       NEW.duration_seconds IS DISTINCT FROM OLD.duration_seconds
    OR NEW.break_seconds    IS DISTINCT FROM OLD.break_seconds
    OR NEW.break_timeline   IS DISTINCT FROM OLD.break_timeline
    OR NEW.created_at       IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'The duration, breaks and start time of a timed session cannot be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_timed_session_fields ON public.sessions;
CREATE TRIGGER protect_timed_session_fields
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.protect_timed_session_fields();
