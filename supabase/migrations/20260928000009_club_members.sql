CREATE TABLE IF NOT EXISTS club_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    UUID NOT NULL,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin','coach','volunteer')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (club_id, user_id)
);

CREATE INDEX IF NOT EXISTS club_members_user_idx ON club_members(user_id);
CREATE INDEX IF NOT EXISTS club_members_club_idx ON club_members(club_id);

ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

-- Members see their own membership; club admins see (and manage) every row for their club.
-- is_club_admin() is SECURITY DEFINER, so this policy doesn't recurse into itself.
DROP POLICY IF EXISTS "club_members: own rows" ON club_members;
CREATE POLICY "club_members: own rows" ON club_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "club_members: admins read club" ON club_members;
CREATE POLICY "club_members: admins read club" ON club_members
  FOR SELECT TO authenticated USING (is_club_admin(club_id));

DROP POLICY IF EXISTS "club_members: admins write club" ON club_members;
CREATE POLICY "club_members: admins write club" ON club_members
  FOR ALL TO authenticated
  USING (is_club_admin(club_id))
  WITH CHECK (is_club_admin(club_id));
