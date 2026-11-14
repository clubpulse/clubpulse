CREATE TABLE IF NOT EXISTS match_moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('pumped','nervous','tired','focused','injured','unknown')),
  set_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, fixture_id)
);

CREATE INDEX IF NOT EXISTS match_moods_user_idx ON match_moods(user_id, set_at DESC);
CREATE INDEX IF NOT EXISTS match_moods_fixture_idx ON match_moods(fixture_id);

ALTER TABLE match_moods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_moods: own rows" ON match_moods;
CREATE POLICY "match_moods: own rows" ON match_moods
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin read: see team mood for their club's fixtures
DROP POLICY IF EXISTS "match_moods: admin read" ON match_moods;
CREATE POLICY "match_moods: admin read" ON match_moods
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fixtures f
      JOIN club_members cm ON cm.club_id = f.club_id
      WHERE f.id = match_moods.fixture_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('club_admin','coach')
    )
  );

-- View: mood vs performance correlation per user
-- Guards against missing tables (match_performances, form_ratings) with DO block
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_performances')
  THEN
    CREATE OR REPLACE VIEW mood_performance_correlation AS
    SELECT
      mm.user_id,
      mm.mood,
      COUNT(*) AS total_games,
      ROUND(AVG(COALESCE(mp.runs_scored, 0))::NUMERIC, 1) AS avg_runs,
      ROUND(AVG(COALESCE(mp.wickets_taken, 0))::NUMERIC, 2) AS avg_wickets,
      ROUND(AVG(COALESCE(fr.rating, 50))::NUMERIC, 1) AS avg_form_rating
    FROM match_moods mm
    -- match_performances has no fixture_id: match the fixture by club and date instead
    JOIN fixtures f ON f.id = mm.fixture_id
    LEFT JOIN match_performances mp
      ON mp.user_id = mm.user_id AND mp.club_id = f.club_id AND mp.match_date = f.match_date
    LEFT JOIN form_ratings fr ON fr.user_id = mm.user_id
    GROUP BY mm.user_id, mm.mood;
  ELSE
    -- Minimal view that still works without match_performances
    CREATE OR REPLACE VIEW mood_performance_correlation AS
    SELECT
      mm.user_id,
      mm.mood,
      COUNT(*) AS total_games,
      0::NUMERIC AS avg_runs,
      0::NUMERIC AS avg_wickets,
      50::NUMERIC AS avg_form_rating
    FROM match_moods mm
    GROUP BY mm.user_id, mm.mood;
  END IF;
END;
$$;
