-- Lock a session's age band once anyone has signed up.
--
-- A session's age_band ('adult' or 'junior') decides who may see it and join it. The server checks the
-- band when someone signs up, but nothing stopped the band being changed afterwards, which would leave
-- people (including juniors) signed up to a session of the wrong band. Once a signup row exists, the band
-- is fixed. To change it, cancel the session and create a new one.
--
-- The check lives in the database so it holds for every writer: the app, the SQL editor and any future
-- code. Idempotent: safe to run more than once.

CREATE OR REPLACE FUNCTION public.community_lock_session_age_band()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.age_band IS DISTINCT FROM OLD.age_band
     AND EXISTS (SELECT 1 FROM public.community_session_signups s WHERE s.session_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot change the age band of a session that already has signups (session %)', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.community_lock_session_age_band() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS community_sessions_lock_age_band ON public.community_sessions;
CREATE TRIGGER community_sessions_lock_age_band
  BEFORE UPDATE ON public.community_sessions
  FOR EACH ROW EXECUTE FUNCTION public.community_lock_session_age_band();
