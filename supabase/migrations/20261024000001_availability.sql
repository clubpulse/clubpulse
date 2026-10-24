-- fixtures: upcoming matches for a club
CREATE TABLE IF NOT EXISTS fixtures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  opponent    TEXT NOT NULL,
  match_date  DATE NOT NULL,
  match_time  TIME,
  venue       TEXT,
  format      TEXT DEFAULT 'league', -- 'league','cup','friendly','tour'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fixtures_club_date_idx ON fixtures(club_id, match_date);
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fixtures: club members read" ON fixtures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = fixtures.club_id AND cm.user_id = auth.uid() AND cm.is_active));
CREATE POLICY "fixtures: admins write" ON fixtures FOR ALL TO authenticated
  USING (is_club_admin(club_id)) WITH CHECK (is_club_admin(club_id));

-- availability: player declares availability per fixture
CREATE TABLE IF NOT EXISTS fixture_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id  UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('available','unavailable','maybe','unknown')),
  note        TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fixture_id, user_id)
);
CREATE INDEX IF NOT EXISTS fixture_availability_fixture_idx ON fixture_availability(fixture_id);
CREATE INDEX IF NOT EXISTS fixture_availability_user_idx ON fixture_availability(user_id);
ALTER TABLE fixture_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fixture_availability: own rows" ON fixture_availability
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixture_availability: club admins read" ON fixture_availability
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM fixtures f WHERE f.id = fixture_id AND is_club_admin(f.club_id)));
