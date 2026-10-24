CREATE TABLE IF NOT EXISTS club_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('victory','record','founding','tradition','player','ground','competition','other')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_bible (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL UNIQUE REFERENCES clubs(id) ON DELETE CASCADE,
  generated_narrative TEXT,  -- AI-generated club story
  last_generated_at TIMESTAMPTZ,
  generation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS club_milestones_club_idx ON club_milestones(club_id, year DESC);

ALTER TABLE club_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_bible ENABLE ROW LEVEL SECURITY;

-- Milestones: club members can read, admins can write
DROP POLICY IF EXISTS "club_milestones: member read" ON club_milestones;
CREATE POLICY "club_milestones: member read" ON club_milestones
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_milestones.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "club_milestones: admin write" ON club_milestones;
CREATE POLICY "club_milestones: admin write" ON club_milestones
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_milestones.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_milestones.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));

-- Club Bible: members read, admins can update
DROP POLICY IF EXISTS "club_bible: member read" ON club_bible;
CREATE POLICY "club_bible: member read" ON club_bible
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_bible.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "club_bible: admin write" ON club_bible;
CREATE POLICY "club_bible: admin write" ON club_bible
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_bible.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_bible.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));
