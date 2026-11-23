-- Members can report a session or a Short-for-Saturday game as itself, not only a post, comment, message or profile.
-- The review queue (src/lib/community/review.ts) already reads and resolves these two kinds.
--
-- The existing check is dropped by looking it up (its name is the default, but production was edited by hand in places),
-- then re-added under a fixed name. Idempotent.

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.community_reports'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%kind%'
  LOOP
    EXECUTE format('ALTER TABLE public.community_reports DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.community_reports
  ADD CONSTRAINT community_reports_kind_check CHECK (kind IN ('post','comment','message','profile','session','shortage'));
