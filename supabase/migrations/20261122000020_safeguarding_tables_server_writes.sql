-- Safeguarding tables: writes go through the server only.
--
-- Found while checking how a parent becomes "verified". These four tables had RLS policies that let a signed-in user
-- write to them directly through the Supabase API with the public key, which sidestepped every check in the app:
--
--   parent_child_links  "pcl: own"            FOR ALL  (parent_id = auth.uid())
--       -> anyone could insert a link to ANY child record with verified_at already set, and so become a "verified
--          parent" without a club admin ever seeing it.
--   child_profiles      "child: parent"       FOR ALL  (is_parent_of_child(id))
--       -> through that link, read and edit the child's record (medical notes, emergency contacts, linked_user_id,
--          date_of_birth). "child: admin" was also FOR ALL, so an admin could change linked_user_id and skip the
--          DBS check that linking a child to an account requires.
--   consent_records     "consent: parent write" INSERT (parent_id = auth.uid())
--       -> anyone could record photo or data consent for any child.
--   dbs_checks          "dbs: admin"          FOR ALL  (is_club_admin(club_id))
--       -> a club admin could add their own 'valid' check, which is what the DBS gates for linking a child and
--          verifying a parent rely on.
--
-- Nothing in the app writes these tables with a user's own session: every writer uses the service role (checked by
-- reading each call site), and the service role is not affected by RLS or by these revokes. Reads keep working:
-- parents still see their own rows, admins still see their club's.
--
-- Idempotent. Check on a Supabase branch before production.

-- ── parent_child_links ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pcl: own" ON public.parent_child_links;
DROP POLICY IF EXISTS "pcl: own read" ON public.parent_child_links;
CREATE POLICY "pcl: own read" ON public.parent_child_links FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

REVOKE ALL ON public.parent_child_links FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.parent_child_links FROM authenticated;

-- ── child_profiles ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "child: parent" ON public.child_profiles;
DROP POLICY IF EXISTS "child: parent read" ON public.child_profiles;
CREATE POLICY "child: parent read" ON public.child_profiles FOR SELECT TO authenticated
  USING (public.is_parent_of_child(id));

DROP POLICY IF EXISTS "child: admin" ON public.child_profiles;
DROP POLICY IF EXISTS "child: admin read" ON public.child_profiles;
CREATE POLICY "child: admin read" ON public.child_profiles FOR SELECT TO authenticated
  USING (public.is_club_admin(club_id));

REVOKE ALL ON public.child_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.child_profiles FROM authenticated;

-- ── consent_records ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "consent: parent write" ON public.consent_records;

REVOKE ALL ON public.consent_records FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.consent_records FROM authenticated;

-- ── dbs_checks ──────────────────────────────────────────────────────────────
-- Recorded by ClubPulse (service role or the SQL editor), never by the person being checked or by a club admin
DROP POLICY IF EXISTS "dbs: admin" ON public.dbs_checks;
DROP POLICY IF EXISTS "dbs: admin read" ON public.dbs_checks;
CREATE POLICY "dbs: admin read" ON public.dbs_checks FOR SELECT TO authenticated
  USING (public.is_club_admin(club_id));

REVOKE ALL ON public.dbs_checks FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.dbs_checks FROM authenticated;
