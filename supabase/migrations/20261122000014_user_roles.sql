-- public.user_roles exists in production but was never created by a migration, so a fresh database (a Supabase
-- branch, a new environment) had no table for the sign-up trigger and onboarding code to write to.
-- Reconstructed from how the code uses it (src/lib/auth/onboarding.ts, src/app/api/profile/roles/route.ts).
-- Every statement is IF NOT EXISTS, so on production this changes nothing it already has.
-- The enum is the one club_members.role already uses (see 20261024000036_fix_is_club_admin.sql).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('player', 'volunteer', 'coach', 'club_admin', 'parent', 'merchant');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.user_role NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  club_id    UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role, club_id)
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles (user_id);

-- Written only by the server (service role). A signed-in person may read their own roles.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles: read own" ON public.user_roles;
CREATE POLICY "user_roles: read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
