-- ============================================
-- MIGRATION 012: Notifications inbox
-- Rows are created only by triggers (users cannot insert them):
--   kudos            someone gave kudos to your session
--   comment          someone commented on your session
--   follow           someone followed you (or you accepted their request)
--   follow_request   someone asked to follow your private account
--   follow_accepted  your follow request was accepted
-- Removing a kudo, comment or follow removes its notification. Recipients
-- can read, mark as read (read_at only) and delete their notifications.
-- Safe to re-run.
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('kudos', 'comment', 'follow', 'follow_request', 'follow_accepted')),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications(recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their notifications" ON public.notifications;
CREATE POLICY "Users read their notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users mark their notifications read" ON public.notifications;
CREATE POLICY "Users mark their notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users delete their notifications" ON public.notifications;
CREATE POLICY "Users delete their notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = recipient_id);

-- No INSERT policy: only the SECURITY DEFINER triggers below create rows.
REVOKE ALL ON public.notifications FROM anon;
REVOKE INSERT, UPDATE ON public.notifications FROM authenticated;
GRANT SELECT, DELETE ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

-- Kudos ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_kudos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT user_id INTO owner_id FROM public.sessions WHERE id = NEW.session_id;
    IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, session_id)
      VALUES (owner_id, NEW.user_id, 'kudos', NEW.session_id);
    END IF;
    RETURN NEW;
  END IF;

  DELETE FROM public.notifications
  WHERE type = 'kudos' AND actor_id = OLD.user_id AND session_id = OLD.session_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS notify_kudos ON public.kudos;
CREATE TRIGGER notify_kudos
  AFTER INSERT OR DELETE ON public.kudos
  FOR EACH ROW EXECUTE FUNCTION public.notify_kudos();

-- Comments (deleting a comment cascades to its notification) -----------------
CREATE OR REPLACE FUNCTION public.notify_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM public.sessions WHERE id = NEW.session_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.user_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, session_id, comment_id)
    VALUES (owner_id, NEW.user_id, 'comment', NEW.session_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_comment ON public.comments;
CREATE TRIGGER notify_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

-- Follows --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type)
    VALUES (
      NEW.following_id,
      NEW.follower_id,
      CASE WHEN NEW.status = 'pending' THEN 'follow_request' ELSE 'follow' END
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      -- The request in the recipient's inbox becomes a plain follow...
      UPDATE public.notifications
      SET type = 'follow'
      WHERE type = 'follow_request'
        AND recipient_id = NEW.following_id
        AND actor_id = NEW.follower_id;
      -- ...and the requester hears back.
      INSERT INTO public.notifications (recipient_id, actor_id, type)
      VALUES (NEW.follower_id, NEW.following_id, 'follow_accepted');
    END IF;
    RETURN NEW;
  END IF;

  -- DELETE: unfollow, cancelled or rejected request
  DELETE FROM public.notifications
  WHERE (type IN ('follow', 'follow_request') AND recipient_id = OLD.following_id AND actor_id = OLD.follower_id)
     OR (type = 'follow_accepted' AND recipient_id = OLD.follower_id AND actor_id = OLD.following_id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS notify_follow ON public.follows;
CREATE TRIGGER notify_follow
  AFTER INSERT OR UPDATE OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_follow();
