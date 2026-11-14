-- club_members.role is the user_role enum in production (player, volunteer, coach, club_admin,
-- parent, merchant), so the original role = 'admin' check raised "invalid input value for enum"
-- whenever a policy called this. Same signature and grants; only the role value changes.
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND role = 'club_admin'
      AND is_active
  );
END;
$$;

REVOKE ALL ON FUNCTION is_club_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_club_admin(UUID) TO authenticated, service_role;
