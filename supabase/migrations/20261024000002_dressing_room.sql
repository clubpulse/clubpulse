CREATE TABLE IF NOT EXISTS dressing_room_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL DEFAULT 'chat' CHECK (kind IN ('announcement','chat','poll')),
  body         TEXT NOT NULL,
  poll_options JSONB,
  poll_votes   JSONB DEFAULT '{}',
  pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dressing_room_posts_club_idx
  ON dressing_room_posts(club_id, created_at DESC);

ALTER TABLE dressing_room_posts ENABLE ROW LEVEL SECURITY;

-- Club members can read all posts in their club
CREATE POLICY "dressing_room_posts: members read" ON dressing_room_posts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = dressing_room_posts.club_id
      AND cm.user_id = auth.uid()
      AND cm.is_active
  ));

-- Members can insert chat posts only
CREATE POLICY "dressing_room_posts: members chat" ON dressing_room_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND kind = 'chat'
    AND EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = dressing_room_posts.club_id
        AND cm.user_id = auth.uid()
        AND cm.is_active
    )
  );

-- Admins can insert any kind
CREATE POLICY "dressing_room_posts: admins insert" ON dressing_room_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_club_admin(club_id));

-- Admins can update (for pinning, poll results)
CREATE POLICY "dressing_room_posts: admins update" ON dressing_room_posts
  FOR UPDATE TO authenticated
  USING (is_club_admin(club_id));

-- Own posts can be deleted
CREATE POLICY "dressing_room_posts: own delete" ON dressing_room_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
