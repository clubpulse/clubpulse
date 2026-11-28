-- One checked path for role and junior status. Repo only, not applied anywhere. Idempotent.
-- Adds: a reason and source on every audit row, audit rows for new members, a date-of-birth check before
-- junior status is cleared, and a function that adds members. Server code no longer writes these columns directly.

ALTER TABLE public.club_member_role_log ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.club_member_role_log ADD COLUMN IF NOT EXISTS source TEXT;

CREATE OR REPLACE FUNCTION public.club_members_guard_standing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  actor UUID;
  why TEXT;
  src TEXT;
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND (TG_OP = 'INSERT' OR NEW.role IS DISTINCT FROM OLD.role OR NEW.is_junior IS DISTINCT FROM OLD.is_junior) THEN
    RAISE EXCEPTION 'Role and junior status are changed through SHIFTUP' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW.role IS DISTINCT FROM OLD.role OR NEW.is_junior IS DISTINCT FROM OLD.is_junior THEN
    BEGIN
      actor := NULLIF(current_setting('app.member_change_actor', true), '')::uuid;
      why := NULLIF(current_setting('app.member_change_reason', true), '');
      src := NULLIF(current_setting('app.member_change_source', true), '');
    EXCEPTION WHEN others THEN
      actor := NULL; why := NULL; src := NULL;
    END;
    -- A change that did not come through set_club_member_standing / add_club_member is still logged,
    -- with no actor and no reason, so a direct service-role write cannot pass unseen.
    INSERT INTO public.club_member_role_log (
      club_id, member_id, user_id, previous_role, new_role, previous_junior, new_junior, changed_by, reason, source
    ) VALUES (
      NEW.club_id, NEW.id, NEW.user_id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.role END, NEW.role,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.is_junior END, NEW.is_junior,
      actor, why, COALESCE(src, 'unchecked_direct_write')
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

DROP FUNCTION IF EXISTS public.set_club_member_standing(UUID, TEXT, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION public.set_club_member_standing(
  p_member UUID,
  p_role TEXT,
  p_junior BOOLEAN,
  p_actor UUID,
  p_reason TEXT,
  p_source TEXT DEFAULT 'club_admin',
  p_platform BOOLEAN DEFAULT FALSE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  row public.club_members%ROWTYPE;
  admins INT;
  dob DATE;
  confirmed_by UUID;
BEGIN
  SELECT * INTO row FROM public.club_members WHERE id = p_member FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  IF p_role IS NULL OR p_role !~ '^[a-z_]{2,40}$' THEN
    RAISE EXCEPTION 'That role is not valid';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is needed';
  END IF;
  IF NOT p_platform AND NOT EXISTS (
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
  -- Clearing junior status needs a date of birth that a club admin has confirmed, showing 18 or over,
  -- and nobody can clear their own.
  IF row.is_junior AND NOT p_junior THEN
    IF p_actor = row.user_id THEN
      RAISE EXCEPTION 'You cannot clear your own junior status';
    END IF;
    SELECT date_of_birth, dob_confirmed_by INTO dob, confirmed_by FROM public.profiles WHERE id = row.user_id;
    IF dob IS NULL OR confirmed_by IS NULL THEN
      RAISE EXCEPTION 'Confirm the date of birth before clearing junior status';
    END IF;
    IF dob > (CURRENT_DATE - INTERVAL '18 years')::date THEN
      RAISE EXCEPTION 'This member is under 18';
    END IF;
  END IF;
  PERFORM set_config('app.member_change_actor', p_actor::text, true);
  PERFORM set_config('app.member_change_reason', btrim(p_reason), true);
  PERFORM set_config('app.member_change_source', COALESCE(p_source, 'club_admin'), true);
  UPDATE public.club_members SET role = p_role, is_junior = p_junior WHERE id = p_member;
END;
$$;

REVOKE ALL ON FUNCTION public.set_club_member_standing(UUID, TEXT, BOOLEAN, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_club_member_standing(UUID, TEXT, BOOLEAN, UUID, TEXT, TEXT, BOOLEAN) TO service_role;

-- Adds a member, or switches a lapsed one back on. A date of birth under 18 always makes them a junior.
CREATE OR REPLACE FUNCTION public.add_club_member(
  p_club UUID,
  p_user UUID,
  p_role TEXT,
  p_actor UUID,
  p_reason TEXT,
  p_source TEXT DEFAULT 'club_admin',
  p_platform BOOLEAN DEFAULT FALSE
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing public.club_members%ROWTYPE;
  dob DATE;
  junior BOOLEAN;
  new_id UUID;
BEGIN
  IF p_role IS NULL OR p_role !~ '^[a-z_]{2,40}$' THEN
    RAISE EXCEPTION 'That role is not valid';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason is needed';
  END IF;
  IF NOT p_platform AND NOT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = p_actor AND club_id = p_club AND role = 'club_admin' AND is_active
  ) THEN
    RAISE EXCEPTION 'Only a club admin can add a member';
  END IF;
  SELECT date_of_birth INTO dob FROM public.profiles WHERE id = p_user;
  junior := dob IS NOT NULL AND dob > (CURRENT_DATE - INTERVAL '18 years')::date;
  PERFORM set_config('app.member_change_actor', p_actor::text, true);
  PERFORM set_config('app.member_change_reason', btrim(p_reason), true);
  PERFORM set_config('app.member_change_source', COALESCE(p_source, 'club_admin'), true);
  SELECT * INTO existing FROM public.club_members WHERE club_id = p_club AND user_id = p_user FOR UPDATE;
  IF FOUND THEN
    -- Switching back on keeps their role, and never clears a junior mark.
    UPDATE public.club_members SET is_active = TRUE, is_junior = (existing.is_junior OR junior) WHERE id = existing.id;
    RETURN existing.id;
  END IF;
  INSERT INTO public.club_members (club_id, user_id, role, is_active, is_junior)
  VALUES (p_club, p_user, p_role, TRUE, junior) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_club_member(UUID, UUID, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_club_member(UUID, UUID, TEXT, UUID, TEXT, TEXT, BOOLEAN) TO service_role;
