-- Posts, comments and private messages record when their text was last changed. There is no edit feature and nothing in the
-- app updates these rows today; this is so that, if an edit is ever made (by staff, a future feature, or a mistake), the
-- change is visible to a scan for edited content. RLS is unchanged: still service role only, no policies.
-- Idempotent.

ALTER TABLE public.community_posts    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Existing rows have not been edited: their last change is when they were created. Only rows still without a value.
UPDATE public.community_posts    SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE public.community_comments SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE public.community_messages SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE public.community_posts    ALTER COLUMN updated_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.community_comments ALTER COLUMN updated_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.community_messages ALTER COLUMN updated_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.community_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- Only a change to the text counts. Staff holding, allowing or removing an item changes its status, which is logged in
  -- community_moderation_events; counting that here would make every moderated item look edited to a scan.
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.community_touch_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS community_posts_touch_updated_at ON public.community_posts;
CREATE TRIGGER community_posts_touch_updated_at BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_touch_updated_at();

DROP TRIGGER IF EXISTS community_comments_touch_updated_at ON public.community_comments;
CREATE TRIGGER community_comments_touch_updated_at BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_touch_updated_at();

DROP TRIGGER IF EXISTS community_messages_touch_updated_at ON public.community_messages;
CREATE TRIGGER community_messages_touch_updated_at BEFORE UPDATE ON public.community_messages
  FOR EACH ROW EXECUTE FUNCTION public.community_touch_updated_at();
