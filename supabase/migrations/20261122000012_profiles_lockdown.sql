-- SECURITY: public.profiles was readable by anyone, including signed-out visitors, through a SELECT policy
-- ("Public profiles are viewable") that was created in production outside the migration history. It exposed
-- email, phone, date_of_birth, location and push_token for every active profile.
--
-- After this migration:
--   * a signed-in person can read only their own profile row through the API
--   * signed-out visitors (anon) can read none
--   * the app's server code reads other people's names with the service role, which bypasses RLS and is unaffected
--   * anything that needs a public "card" for an adult reads public.public_profile_cards, which carries only
--     id, display_name, avatar_url and club_name and never includes under-18s
--
-- Writes are unchanged: existing INSERT/UPDATE policies are not touched here.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop the exposed policy by name, however the full name is spelled in production ("... by everyone" etc.).
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname ILIKE 'Public profiles are viewable%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
    RAISE NOTICE 'Dropped policy % on public.profiles', pol.policyname;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "profiles: read own" ON public.profiles;
CREATE POLICY "profiles: read own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

-- Narrow public card for adults. Runs with its owner's rights on purpose (so it can read across rows) and exposes
-- nothing beyond the four columns below. Under-18s are excluded three ways: a junior club membership, a linked
-- child record, and a date of birth under 18.
CREATE OR REPLACE VIEW public.public_profile_cards AS
SELECT
  p.id,
  p.display_name,
  p.avatar_url,
  (SELECT c.name FROM public.club_members cm JOIN public.clubs c ON c.id = cm.club_id
    WHERE cm.user_id = p.id AND cm.is_active ORDER BY cm.club_id LIMIT 1) AS club_name
FROM public.profiles p
WHERE p.is_active IS NOT FALSE
  AND (p.date_of_birth IS NULL OR p.date_of_birth <= (CURRENT_DATE - INTERVAL '18 years'))
  AND NOT EXISTS (SELECT 1 FROM public.club_members j WHERE j.user_id = p.id AND j.is_junior)
  AND NOT EXISTS (SELECT 1 FROM public.child_profiles k WHERE k.linked_user_id = p.id);

REVOKE ALL ON public.public_profile_cards FROM PUBLIC, anon;
GRANT SELECT ON public.public_profile_cards TO authenticated, service_role;

-- Anything left that can still be read by someone who is not the profile's owner is listed here, so the run shows
-- whether another broad policy exists in production.
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, cmd, roles::text AS roles, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' ORDER BY policyname
  LOOP
    RAISE NOTICE 'profiles policy remaining: % [%] roles=% using=%', pol.policyname, pol.cmd, pol.roles, pol.qual;
  END LOOP;
END;
$$;
