CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('urgent','normal','info')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notices_club_idx ON notices(club_id, is_pinned DESC, created_at DESC);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- Members read active notices
DROP POLICY IF EXISTS "notices: member read" ON notices;
CREATE POLICY "notices: member read" ON notices FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = notices.club_id AND cm.user_id = auth.uid())
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Admin write
DROP POLICY IF EXISTS "notices: admin all" ON notices;
CREATE POLICY "notices: admin all" ON notices FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = notices.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = notices.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));
