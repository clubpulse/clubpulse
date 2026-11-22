-- Follow-up to 20261122000012 and 20261122000014, which are already applied to production and so are not edited.
-- A test run on a fresh Supabase branch found two gaps. Both statements are no-ops where they are already satisfied
-- (production has neither the extra policy nor needs the column added).

-- 1. A branch created from the schema history can carry a pre-existing "profiles: read authenticated"
--    (FOR SELECT TO authenticated USING (true)), which leaves every profile, with email and phone, readable by any
--    signed-in user. 000012 only dropped the "Public profiles are viewable" policy. Drop any SELECT policy on
--    profiles that is not an own-row check, by name and by condition, and list what remains.
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, qual FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
      AND (policyname ILIKE 'profiles: read authenticated%' OR policyname ILIKE 'Public profiles are viewable%'
           OR btrim(COALESCE(qual, ''), '() ') = 'true')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
    RAISE NOTICE 'Dropped policy % on public.profiles (using %)', pol.policyname, pol.qual;
  END LOOP;
  FOR pol IN SELECT policyname, cmd, roles::text AS roles, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' ORDER BY policyname
  LOOP
    RAISE NOTICE 'profiles policy remaining: % [%] roles=% using=%', pol.policyname, pol.cmd, pol.roles, pol.qual;
  END LOOP;
END;
$$;

-- 2. Production's user_roles also has a sport column (public.sport). Add it where it is missing and the type exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'sport') THEN
    ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS sport public.sport;
  END IF;
END;
$$;
