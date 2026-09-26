-- ============================================
-- MIGRATION 010: Unique usernames on sign-up
-- The profile trigger used the email prefix as the username, so a second
-- person with the same prefix (jane@a.com, jane@b.com) failed to sign up.
-- Now the prefix is reduced to URL-safe characters and, if it is taken, a
-- number is appended: jane, jane1, jane2, ...
-- Existing usernames are not changed. Safe to re-run.
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_username TEXT;
  candidate TEXT;
  suffix INTEGER := 0;
BEGIN
  base_username := left(
    regexp_replace(
      COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'username', ''),
        split_part(COALESCE(NEW.email, ''), '@', 1)
      ),
      '[^A-Za-z0-9._-]', '', 'g'
    ),
    30
  );
  IF base_username = '' THEN
    base_username := 'musician';
  END IF;

  candidate := base_username;
  LOOP
    -- Skip names that are already taken
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
      suffix := suffix + 1;
      candidate := base_username || suffix::TEXT;
    END LOOP;

    BEGIN
      INSERT INTO public.profiles (id, username, display_name, avatar_url)
      VALUES (
        NEW.id,
        candidate,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
      );
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      -- Another sign-up took this name between the check and the insert:
      -- try the next number. Any other conflict (e.g. the id) is re-raised.
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) THEN
        RAISE;
      END IF;
    END;
  END LOOP;
END;
$$;
