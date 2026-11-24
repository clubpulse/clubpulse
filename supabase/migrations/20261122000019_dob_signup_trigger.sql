-- 1. The sign-up trigger now copies the date of birth from the sign-up metadata onto the profile.
--
-- Until now ensure_profile_and_roles() ignored it, so profiles.date_of_birth stayed empty until the app's /auth/callback
-- ran, and an account confirmed from a different browser never got one. The date is taken only when it is a real
-- YYYY-MM-DD date, not in the future and not more than 110 years ago (the same test as the app's isPlausibleDob), and
-- it is only ever written when the profile has none: an existing date is never overwritten. Everything else in the
-- function is unchanged from 20261122000011.

CREATE OR REPLACE FUNCTION public.ensure_profile_and_roles(p_id UUID, p_email TEXT, p_meta JSONB) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  meta JSONB := COALESCE(p_meta, '{}'::jsonb);
  nm TEXT;
  r TEXT;
  first_role BOOLEAN := TRUE;
  dob_text TEXT;
  dob DATE;
BEGIN
  nm := left(btrim(COALESCE(NULLIF(meta->>'full_name', ''), NULLIF(meta->>'name', ''), '')), 100);
  IF nm = '' THEN nm := COALESCE(NULLIF(split_part(COALESCE(p_email, ''), '@', 1), ''), 'Athlete'); END IF;

  -- A plausible date of birth from the metadata, or NULL
  dob_text := btrim(COALESCE(meta->>'date_of_birth', ''));
  IF dob_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    BEGIN
      dob := dob_text::date;
    EXCEPTION WHEN OTHERS THEN
      dob := NULL;   -- not a real date, such as 2026-02-30
    END;
    IF dob IS NOT NULL AND (dob > CURRENT_DATE OR dob < CURRENT_DATE - INTERVAL '110 years') THEN dob := NULL; END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, display_name, email, date_of_birth)
  VALUES (p_id, nm, split_part(nm, ' ', 1), COALESCE(p_email, ''), dob)
  ON CONFLICT (id) DO NOTHING;

  -- A profile that already exists without a date of birth gets one; one that has a date keeps it
  IF dob IS NOT NULL THEN
    UPDATE public.profiles SET date_of_birth = dob WHERE id = p_id AND date_of_birth IS NULL;
  END IF;

  -- Roles only for someone who has none yet, so an existing person's roles are never touched
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_id) THEN
    IF jsonb_typeof(meta->'roles') = 'array' THEN
      FOR r IN
        SELECT x FROM jsonb_array_elements_text(meta->'roles') WITH ORDINALITY AS t(x, n)
        WHERE x IN ('player', 'volunteer', 'parent', 'coach') ORDER BY n
      LOOP
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_id AND role = r::public.user_role) THEN
          INSERT INTO public.user_roles (user_id, role, is_primary) VALUES (p_id, r::public.user_role, first_role);
          first_role := FALSE;
        END IF;
      END LOOP;
    END IF;
    IF first_role THEN
      INSERT INTO public.user_roles (user_id, role, is_primary) VALUES (p_id, 'player', TRUE);
    END IF;
  END IF;
END;
$$;

-- Same lock-down as before: only the trigger and the service role run it
REVOKE ALL ON FUNCTION public.ensure_profile_and_roles(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_and_roles(UUID, TEXT, JSONB) TO service_role;

-- Backfill: profiles with no date of birth whose sign-up metadata has a plausible one. Row by row, so one bad value
-- cannot stop the rest. Never overwrites a date; safe to run again.
DO $$
DECLARE u RECORD; d DATE;
BEGIN
  FOR u IN
    SELECT p.id, a.raw_user_meta_data->>'date_of_birth' AS dob_text
    FROM public.profiles p JOIN auth.users a ON a.id = p.id
    WHERE p.date_of_birth IS NULL AND a.raw_user_meta_data->>'date_of_birth' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  LOOP
    BEGIN
      d := u.dob_text::date;
      IF d <= CURRENT_DATE AND d >= CURRENT_DATE - INTERVAL '110 years' THEN
        UPDATE public.profiles SET date_of_birth = d WHERE id = u.id AND date_of_birth IS NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;   -- not a real date: leave it for the person to enter
    END;
  END LOOP;
END;
$$;

-- 2. community_connection_approvals is for the service role only. Row-level security with no policies already denies
-- everyone else; this also removes the table privileges, so access is refused before security rules are even asked.
REVOKE ALL ON public.community_connection_approvals FROM anon, authenticated;
