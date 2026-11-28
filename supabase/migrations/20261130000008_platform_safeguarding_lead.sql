-- Platform safeguarding lead, an atomic flag close, an append-only audit log, and hand-over to a new welfare officer.
-- Repo only, not applied anywhere. Idempotent. Only after AGE_VERIFICATION_ENABLED is switched on does anything use it.

-- 1. The lead role. Named users only: there is no self-service grant, and clients cannot read or write this table.
--    It is inactive unless BOTH dates are current. Windows (a policy choice, change them here and in lead.ts together):
--    enhanced DBS check no older than 3 years, safeguarding training no older than 12 months.
CREATE TABLE IF NOT EXISTS public.platform_safeguarding_leads (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dbs_checked_on DATE,
  training_completed_on DATE,
  revoked_at TIMESTAMPTZ,
  note TEXT
);
ALTER TABLE public.platform_safeguarding_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_safeguarding_leads FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.platform_safeguarding_leads TO service_role;

CREATE OR REPLACE FUNCTION public.platform_lead_is_active(p_user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_safeguarding_leads l
    WHERE l.user_id = p_user
      AND l.revoked_at IS NULL
      AND l.dbs_checked_on IS NOT NULL AND l.dbs_checked_on <= CURRENT_DATE AND l.dbs_checked_on > CURRENT_DATE - INTERVAL '3 years'
      AND l.training_completed_on IS NOT NULL AND l.training_completed_on <= CURRENT_DATE AND l.training_completed_on > CURRENT_DATE - INTERVAL '1 year'
  );
$$;
REVOKE ALL ON FUNCTION public.platform_lead_is_active(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_lead_is_active(UUID) TO service_role;

-- 2. Audit log of everything a lead sees or decides. Append only: updates and deletes are refused for every role.
CREATE TABLE IF NOT EXISTS public.safeguarding_lead_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view_queue', 'resolve', 'refused')),
  club_id UUID,
  flag_ids UUID[] NOT NULL DEFAULT '{}',
  note TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS safeguarding_lead_audit_lead_idx ON public.safeguarding_lead_audit (lead_id, at DESC);
ALTER TABLE public.safeguarding_lead_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.safeguarding_lead_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.safeguarding_lead_audit TO service_role;

CREATE OR REPLACE FUNCTION public.safeguarding_lead_audit_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'The safeguarding lead audit log cannot be changed' USING ERRCODE = 'insufficient_privilege';
END;
$$;
REVOKE ALL ON FUNCTION public.safeguarding_lead_audit_append_only() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS safeguarding_lead_audit_append_only ON public.safeguarding_lead_audit;
CREATE TRIGGER safeguarding_lead_audit_append_only
  BEFORE UPDATE OR DELETE ON public.safeguarding_lead_audit
  FOR EACH ROW EXECUTE FUNCTION public.safeguarding_lead_audit_append_only();

-- 3. How a flag was closed.
ALTER TABLE public.age_squad_mismatches
  ADD COLUMN IF NOT EXISTS resolved_via TEXT CHECK (resolved_via IS NULL OR resolved_via IN ('club_welfare_officer', 'platform_lead')),
  ADD COLUMN IF NOT EXISTS resolution_note TEXT;

-- 4. Close a flag and its safeguarding incident in ONE transaction. If the incident cannot be updated the flag stays open.
--    A platform lead is checked here as well as in the app: active role, a written note, not the player, not a member of
--    the club, not the person who reported the incident, and the club must really have no active welfare officer.
CREATE OR REPLACE FUNCTION public.resolve_age_squad_flag(
  p_flag UUID,
  p_club UUID,
  p_resolver UUID,
  p_via TEXT,
  p_note TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  f RECORD;
  stamp TIMESTAMPTZ := NOW();
  reporter UUID;
BEGIN
  IF p_via IS NULL OR p_via NOT IN ('club_welfare_officer', 'platform_lead') THEN
    RAISE EXCEPTION 'unknown resolution route';
  END IF;

  SELECT * INTO f FROM public.age_squad_mismatches
  WHERE id = p_flag AND club_id = p_club AND resolved_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'flag is not open' USING ERRCODE = 'P0002';
  END IF;

  IF p_via = 'platform_lead' THEN
    IF NOT public.platform_lead_is_active(p_resolver) THEN
      RAISE EXCEPTION 'not an active safeguarding lead' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p_note IS NULL OR btrim(p_note) = '' THEN
      RAISE EXCEPTION 'a lead must record why the flag is closed';
    END IF;
    IF f.user_id = p_resolver THEN
      RAISE EXCEPTION 'conflict of interest: the flag is about the lead' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF EXISTS (SELECT 1 FROM public.club_members WHERE club_id = p_club AND user_id = p_resolver AND is_active) THEN
      RAISE EXCEPTION 'conflict of interest: the lead belongs to this club' USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF f.incident_id IS NOT NULL THEN
      SELECT reported_by INTO reporter FROM public.safeguarding_incidents WHERE id = f.incident_id;
      IF reporter = p_resolver THEN
        RAISE EXCEPTION 'conflict of interest: the lead reported this incident' USING ERRCODE = 'insufficient_privilege';
      END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM public.club_members WHERE club_id = p_club AND role = 'welfare_officer' AND is_active) THEN
      RAISE EXCEPTION 'this club has a welfare officer' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  UPDATE public.age_squad_mismatches
  SET resolved_at = stamp, resolved_by = p_resolver, resolved_via = p_via, resolution_note = NULLIF(btrim(COALESCE(p_note, '')), '')
  WHERE id = p_flag;

  IF f.incident_id IS NOT NULL THEN
    UPDATE public.safeguarding_incidents
    SET status = 'resolved', resolved_at = stamp, updated_at = stamp
    WHERE id = f.incident_id AND club_id = p_club;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'the linked safeguarding incident could not be updated';
    END IF;
  END IF;

  IF p_via = 'platform_lead' THEN
    INSERT INTO public.safeguarding_lead_audit (lead_id, action, club_id, flag_ids, note)
    VALUES (p_resolver, 'resolve', p_club, ARRAY[p_flag], btrim(p_note));
  END IF;

  RETURN f.incident_id;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_age_squad_flag(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_age_squad_flag(UUID, UUID, UUID, TEXT, TEXT) TO service_role;

-- 5. Hand-over. When a club names (or re-activates) a welfare officer, every flag still open at that club is recorded as
--    handed to them. Nothing is deleted: the lead's audit rows and these rows stay as history. The officer is emailed by
--    the daily job (notified_at is empty until then).
CREATE TABLE IF NOT EXISTS public.age_flag_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID NOT NULL,
  club_id UUID NOT NULL,
  officer_id UUID NOT NULL,
  from_queue TEXT NOT NULL DEFAULT 'platform_lead_queue',
  handed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  UNIQUE (flag_id, officer_id)
);
CREATE INDEX IF NOT EXISTS age_flag_handovers_unnotified_idx ON public.age_flag_handovers (handed_at) WHERE notified_at IS NULL;
ALTER TABLE public.age_flag_handovers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.age_flag_handovers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.age_flag_handovers TO service_role;

CREATE OR REPLACE FUNCTION public.hand_over_open_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.age_flag_handovers (flag_id, club_id, officer_id)
  SELECT m.id, m.club_id, NEW.user_id
  FROM public.age_squad_mismatches m
  WHERE m.club_id = NEW.club_id AND m.resolved_at IS NULL
  ON CONFLICT (flag_id, officer_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.hand_over_open_flags() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS club_members_hand_over_flags ON public.club_members;
CREATE TRIGGER club_members_hand_over_flags
  AFTER INSERT OR UPDATE OF role, is_active ON public.club_members
  FOR EACH ROW
  WHEN (NEW.role = 'welfare_officer' AND NEW.is_active IS TRUE)
  EXECUTE FUNCTION public.hand_over_open_flags();
