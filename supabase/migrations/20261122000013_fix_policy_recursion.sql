-- "infinite recursion detected in policy" (42P17) between child_profiles and parent_child_links
-- (20261115000004_parent_safeguarding.sql):
--   "child: parent" on child_profiles reads parent_child_links,
--   "pcl: admin"    on parent_child_links reads child_profiles,
-- and each read re-applies the other table's policies. The checks move into SECURITY DEFINER functions, which read
-- the tables without re-entering their policies. Who can see what is unchanged.

CREATE OR REPLACE FUNCTION public.is_parent_of_child(p_child_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.parent_child_links WHERE child_id = p_child_id AND parent_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_child(p_child_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = p_child_id AND public.is_club_admin(cp.club_id));
$$;

REVOKE ALL ON FUNCTION public.is_parent_of_child(UUID), public.is_admin_of_child(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parent_of_child(UUID), public.is_admin_of_child(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "child: parent" ON public.child_profiles;
CREATE POLICY "child: parent" ON public.child_profiles FOR ALL TO authenticated
  USING (public.is_parent_of_child(id));

DROP POLICY IF EXISTS "pcl: admin" ON public.parent_child_links;
CREATE POLICY "pcl: admin" ON public.parent_child_links FOR SELECT TO authenticated
  USING (public.is_admin_of_child(child_id));
