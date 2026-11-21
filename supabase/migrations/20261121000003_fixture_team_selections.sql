-- Playing XI for ordinary fixtures (league, cup, friendly, tour).
-- Distinct from school_team_selections, which is keyed by date/opposition/age group for school sessions.

CREATE TABLE IF NOT EXISTS fixture_team_selections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id       UUID NOT NULL UNIQUE REFERENCES fixtures(id) ON DELETE CASCADE,
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  selected_players UUID[] NOT NULL DEFAULT '{}',
  twelfth_man      UUID,
  notes            TEXT,
  confirmed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fixture_team_selections_max_xi CHECK (cardinality(selected_players) <= 11)
);
CREATE INDEX IF NOT EXISTS fixture_team_selections_club_idx ON fixture_team_selections(club_id);
ALTER TABLE fixture_team_selections ENABLE ROW LEVEL SECURITY;

-- Members of the club can see who has been picked.
DROP POLICY IF EXISTS "fixture_team_selections: member read" ON fixture_team_selections;
CREATE POLICY "fixture_team_selections: member read" ON fixture_team_selections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = fixture_team_selections.club_id AND cm.user_id = auth.uid() AND cm.is_active
  ));

-- Only club admins and coaches can name the XI, and only for a fixture in their own club.
DROP POLICY IF EXISTS "fixture_team_selections: admin or coach write" ON fixture_team_selections;
CREATE POLICY "fixture_team_selections: admin or coach write" ON fixture_team_selections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = fixture_team_selections.club_id AND cm.user_id = auth.uid()
      AND cm.is_active AND cm.role IN ('club_admin','coach')
  ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = fixture_team_selections.club_id AND cm.user_id = auth.uid()
        AND cm.is_active AND cm.role IN ('club_admin','coach')
    )
    AND EXISTS (
      SELECT 1 FROM fixtures f
      WHERE f.id = fixture_team_selections.fixture_id AND f.club_id = fixture_team_selections.club_id
    )
  );

-- Coaches can read the availability grid too (players still write only their own rows).
DROP POLICY IF EXISTS "fixture_availability: club coaches read" ON fixture_availability;
CREATE POLICY "fixture_availability: club coaches read" ON fixture_availability FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM fixtures f
    JOIN club_members cm ON cm.club_id = f.club_id
    WHERE f.id = fixture_availability.fixture_id AND cm.user_id = auth.uid()
      AND cm.is_active AND cm.role = 'coach'
  ));
