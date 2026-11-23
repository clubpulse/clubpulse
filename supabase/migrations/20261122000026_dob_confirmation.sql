-- Club-confirmed date of birth. A date of birth typed in at sign-up is only a declaration. A club admin can confirm a
-- junior member's date of birth, and the app records who and when here. The app checks the admin belongs to the junior's
-- club and writes these two columns with the service role only.
--
-- The trigger makes that true for every other writer: a signed-in user (or anon) calling the API cannot set, change or
-- clear the confirmation, on their own profile or any other, whatever the profiles policies allow. Changing the date of
-- birth itself clears the confirmation, so a confirmed date cannot be quietly swapped for another. The service role, the
-- SQL editor and database owners are not blocked. Idempotent.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dob_confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dob_confirmed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.profiles_guard_dob_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_user IN ('anon', 'authenticated') AND (NEW.dob_confirmed_by IS NOT NULL OR NEW.dob_confirmed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'A date of birth can only be confirmed by a club admin through ClubPulse' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.dob_confirmed_by IS DISTINCT FROM OLD.dob_confirmed_by OR NEW.dob_confirmed_at IS DISTINCT FROM OLD.dob_confirmed_at THEN
    IF current_user IN ('anon', 'authenticated') THEN
      RAISE EXCEPTION 'A date of birth can only be confirmed by a club admin through ClubPulse' USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSIF NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN
    -- A different date is not the one that was confirmed
    NEW.dob_confirmed_by := NULL;
    NEW.dob_confirmed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_guard_dob_confirmation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_dob_confirmation ON public.profiles;
CREATE TRIGGER profiles_guard_dob_confirmation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_dob_confirmation();
