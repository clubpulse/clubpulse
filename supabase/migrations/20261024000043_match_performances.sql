-- Core match/performance table that feeds the Nemesis, Form Guide, and Rivalry Engine
CREATE TABLE IF NOT EXISTS match_performances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  match_date      DATE NOT NULL,
  opponent        TEXT NOT NULL,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- batting
  runs_scored     INTEGER DEFAULT 0,
  balls_faced     INTEGER DEFAULT 0,
  dismissal_type  TEXT,  -- 'bowled','caught','lbw','run_out','stumped','not_out', etc.
  dismissed_by    UUID REFERENCES auth.users(id),  -- user_id of the bowler who got them out
  -- bowling
  overs_bowled    NUMERIC(4,1) DEFAULT 0,
  runs_conceded   INTEGER DEFAULT 0,
  wickets_taken   INTEGER DEFAULT 0,
  -- fielding
  catches         INTEGER DEFAULT 0,
  run_outs        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS match_performances_user_idx ON match_performances(user_id, match_date DESC);
CREATE INDEX IF NOT EXISTS match_performances_dismissed_by_idx ON match_performances(dismissed_by);
CREATE INDEX IF NOT EXISTS match_performances_club_idx ON match_performances(club_id, match_date DESC);
ALTER TABLE match_performances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_performances: club members read" ON match_performances
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = match_performances.club_id AND cm.user_id = auth.uid() AND cm.is_active));
CREATE POLICY "match_performances: own insert" ON match_performances
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "match_performances: admins write" ON match_performances
  FOR ALL TO authenticated
  USING (is_club_admin(club_id)) WITH CHECK (is_club_admin(club_id));

-- Materialised nemesis pairs — recomputed by a scheduled function or on-demand
CREATE TABLE IF NOT EXISTS nemesis_pairs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batter_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bowler_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissals      INTEGER NOT NULL DEFAULT 0,
  last_dismissal  DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batter_id, bowler_id)
);
ALTER TABLE nemesis_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nemesis_pairs: authenticated read" ON nemesis_pairs FOR SELECT TO authenticated USING (TRUE);

-- Function to refresh nemesis pairs from match_performances
CREATE OR REPLACE FUNCTION refresh_nemesis_pairs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO nemesis_pairs (batter_id, bowler_id, dismissals, last_dismissal, updated_at)
  SELECT
    mp.user_id AS batter_id,
    mp.dismissed_by AS bowler_id,
    COUNT(*) AS dismissals,
    MAX(mp.match_date) AS last_dismissal,
    NOW()
  FROM match_performances mp
  WHERE mp.dismissed_by IS NOT NULL
  GROUP BY mp.user_id, mp.dismissed_by
  ON CONFLICT (batter_id, bowler_id) DO UPDATE
    SET dismissals = EXCLUDED.dismissals,
        last_dismissal = EXCLUDED.last_dismissal,
        updated_at = NOW();
END;
$$;
