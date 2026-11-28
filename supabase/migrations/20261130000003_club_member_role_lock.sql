-- Club admins cannot change role or is_junior through the database API.
-- Those changes go through set_club_member_standing, which checks the caller and writes an audit row.
-- Repo only. Idempotent.

CREATE TABLE IF NOT EXISTS public.club_member_role_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  member_id UUID,
  user_id UUID,
  previous_role TEXT,
  new_role TEXT,
  previous_junior BOOLEAN,
  new_junior BOOLEAN,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.club_member_role_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_member_role_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.club_member_role_log TO service_role;

CREATE OR REPLACE FUNCTION public.club_members_guard_standing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  actor UUID;
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role OR NEW.is_junior IS DISTINCT FROM OLD.is_junior) THEN
    RAISE EXCEPTION 'Role and junior status are changed through SHIFTUP' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_junior IS DISTINCT FROM OLD.is_junior) THEN
    BEGIN
      actor := NULLIF(current_setting('app.member_change_actor', true), '')::uuid;
    EXCEPTION WHEN others THEN
      actor := NULL;
    END;
    INSERT INTO public.club_member_role_log (
      club_id, member_id, user_id, previous_role, new_role, previous_junior, new_junior, changed_by
    ) VALUES (
      NEW.club_id, NEW.id, NEW.user_id, OLD.role, NEW.role, OLD.is_junior, NEW.is_junior, actor
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.club_members_guard_standing() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS club_members_guard_standing ON public.club_members;
CREATE TRIGGER club_members_guard_standing
  BEFORE INSERT OR UPDATE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.club_members_guard_standing();

CREATE OR REPLACE FUNCTION public.set_club_member_standing(
  p_member UUID,
  p_role TEXT,
  p_junior BOOLEAN,
  p_actor UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row public.club_members%ROWTYPE;
  admins INT;
BEGIN
  SELECT * INTO row FROM public.club_members WHERE id = p_member FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  IF p_role IS NULL OR p_role !~ '^[a-z_]{2,40}$' THEN
    RAISE EXCEPTION 'That role is not valid';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = p_actor AND club_id = row.club_id AND role = 'club_admin' AND is_active
  ) THEN
    RAISE EXCEPTION 'Only a club admin can change a role';
  END IF;
  IF row.role = 'club_admin' AND row.is_active AND p_role <> 'club_admin' THEN
    SELECT count(*) INTO admins FROM public.club_members
    WHERE club_id = row.club_id AND role = 'club_admin' AND is_active AND id <> row.id;
    IF admins = 0 THEN
      RAISE EXCEPTION 'A club needs at least one active admin';
    END IF;
  END IF;
  PERFORM set_config('app.member_change_actor', p_actor::text, true);
  UPDATE public.club_members
  SET role = p_role, is_junior = p_junior
  WHERE id = p_member;
END;
$$;

REVOKE ALL ON FUNCTION public.set_club_member_standing(UUID, TEXT, BOOLEAN, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_club_member_standing(UUID, TEXT, BOOLEAN, UUID) TO service_role;
