CREATE TABLE IF NOT EXISTS player_legacy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  -- Written by admin
  display_name TEXT NOT NULL,
  nickname TEXT,
  years_at_club TEXT NOT NULL,  -- "2018–2025"
  primary_role TEXT NOT NULL,   -- "Opening Batsman", "Club Captain"
  career_summary TEXT NOT NULL, -- 2-3 sentence description
  career_highlight TEXT,        -- Single best moment
  best_season TEXT,             -- "2022 — 847 runs at 56 avg"
  total_matches INTEGER,
  total_runs INTEGER,
  total_wickets INTEGER,
  honours TEXT[],               -- ["Club Captain 2021-23", "Player of the Year 2022"]
  quote TEXT,                   -- A quote from the player
  -- Avatar (optional photo URL)
  photo_url TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired','departed','legend')),
  inducted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, club_id)
);

CREATE INDEX IF NOT EXISTS legacy_club_idx ON player_legacy(club_id, status, inducted_at DESC);

ALTER TABLE player_legacy ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read published legacies
DROP POLICY IF EXISTS "player_legacy: read published" ON player_legacy;
CREATE POLICY "player_legacy: read published" ON player_legacy FOR SELECT TO authenticated USING (is_published);

-- Members can read their own (to see draft)
DROP POLICY IF EXISTS "player_legacy: own read" ON player_legacy;
CREATE POLICY "player_legacy: own read" ON player_legacy FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admin write
DROP POLICY IF EXISTS "player_legacy: admin all" ON player_legacy;
CREATE POLICY "player_legacy: admin all" ON player_legacy FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = player_legacy.club_id AND cm.user_id = auth.uid() AND cm.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = player_legacy.club_id AND cm.user_id = auth.uid() AND cm.role = 'admin'));
