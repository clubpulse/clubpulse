-- Age verification support: a locked date of birth, how a club official checked it, an audit
-- of club corrections, a third-party check result with no documents, and a squad mismatch
-- record that does not store a date of birth.
-- Repo only until it is applied on purpose. Idempotent.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dob_confirmation_method TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_dob_confirmation_method_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_dob_confirmation_method_check
      CHECK (dob_confirmation_method IS NULL OR dob_confirmation_method IN (
        'passport_in_person', 'birth_certificate', 'driving_licence', 'existing_registration',
        'video_call', 'verified_parent_vouch', 'third_party_check'
      ));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.dob_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  previous_dob DATE,
  new_dob DATE NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.age_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'unavailable')),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.age_squad_mismatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  age_group TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('mismatch', 'unverified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dob_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.age_squad_mismatches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.dob_change_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.dob_change_log TO service_role;

REVOKE ALL ON public.age_verifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.age_verifications TO authenticated;
GRANT ALL ON public.age_verifications TO service_role;

REVOKE ALL ON public.age_squad_mismatches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.age_squad_mismatches TO authenticated;
GRANT ALL ON public.age_squad_mismatches TO service_role;

DROP POLICY IF EXISTS age_verifications_own_read ON public.age_verifications;
CREATE POLICY age_verifications_own_read ON public.age_verifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS age_squad_mismatch_read ON public.age_squad_mismatches;
CREATE POLICY age_squad_mismatch_read ON public.age_squad_mismatches
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = age_squad_mismatches.club_id
        AND cm.user_id = auth.uid()
        AND cm.is_active
        AND cm.role IN ('club_admin', 'coach', 'welfare_officer')
    )
  );

-- A signed-in person cannot change a saved date of birth, or set the confirmation, including the method.
-- Club correction and confirmation use the service role and write the audit log themselves.
CREATE OR REPLACE FUNCTION public.profiles_guard_dob_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_user IN ('anon', 'authenticated') AND (
      NEW.dob_confirmed_by IS NOT NULL OR NEW.dob_confirmed_at IS NOT NULL OR NEW.dob_confirmation_method IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'A date of birth can only be confirmed by a club official through SHIFTUP' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
    IF current_user IN ('anon', 'authenticated') AND OLD.date_of_birth IS NOT NULL THEN
      RAISE EXCEPTION 'A date of birth cannot be changed here' USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.dob_confirmed_by := NULL;
    NEW.dob_confirmed_at := NULL;
    NEW.dob_confirmation_method := NULL;
  ELSIF NEW.dob_confirmed_by IS DISTINCT FROM OLD.dob_confirmed_by
     OR NEW.dob_confirmed_at IS DISTINCT FROM OLD.dob_confirmed_at
     OR NEW.dob_confirmation_method IS DISTINCT FROM OLD.dob_confirmation_method THEN
    IF current_user IN ('anon', 'authenticated') THEN
      RAISE EXCEPTION 'A date of birth can only be confirmed by a club official through SHIFTUP' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_guard_dob_confirmation() FROM PUBLIC, anon, authenticated;
