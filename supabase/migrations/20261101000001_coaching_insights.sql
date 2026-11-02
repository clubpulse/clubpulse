-- Tier 1 AI coaching: per-match batting/bowling lines and the insights generated from them.
-- match_id is a match_scorecards row (the Match Day flow). Rows are written server-side with the
-- service role when a match is completed; players read their own, club admins read their club's.

CREATE TABLE IF NOT EXISTS player_innings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id          UUID NOT NULL REFERENCES match_scorecards(id) ON DELETE CASCADE,
  runs              INTEGER NOT NULL DEFAULT 0,
  balls             INTEGER NOT NULL DEFAULT 0,
  dismissal_type    TEXT,
  batting_position  INTEGER,
  -- The scorecard doesn't record phase yet, so this stays NULL until something captures it
  phase             TEXT CHECK (phase IN ('powerplay', 'middle', 'death')),
  is_not_out        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, match_id)
);

CREATE INDEX IF NOT EXISTS player_innings_player_idx ON player_innings(player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS player_bowling (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id       UUID NOT NULL REFERENCES match_scorecards(id) ON DELETE CASCADE,
  overs          NUMERIC(4,1) NOT NULL DEFAULT 0,
  runs_conceded  INTEGER NOT NULL DEFAULT 0,
  wickets        INTEGER NOT NULL DEFAULT 0,
  -- Cricket notation: 3.4 overs = 3 overs and 4 balls = 22 balls
  economy        NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN overs > 0 THEN ROUND(runs_conceded * 6.0 / (FLOOR(overs) * 6 + ROUND((overs - FLOOR(overs)) * 10)), 2)
    END
  ) STORED,
  conditions     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, match_id)
);

CREATE INDEX IF NOT EXISTS player_bowling_player_idx ON player_bowling(player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS coaching_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id        UUID NOT NULL REFERENCES match_scorecards(id) ON DELETE CASCADE,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tier            INTEGER NOT NULL DEFAULT 1,
  insight_type    TEXT NOT NULL,
  finding         TEXT NOT NULL,
  recommendation  TEXT NOT NULL,
  acknowledged    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS coaching_insights_player_idx ON coaching_insights(player_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS coaching_insights_match_idx ON coaching_insights(match_id);

-- RLS on before anything is written
ALTER TABLE player_innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_bowling ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_innings: read own" ON player_innings;
CREATE POLICY "player_innings: read own" ON player_innings
  FOR SELECT TO authenticated USING (player_id = auth.uid());

DROP POLICY IF EXISTS "player_innings: club admins read" ON player_innings;
CREATE POLICY "player_innings: club admins read" ON player_innings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM match_scorecards ms WHERE ms.id = player_innings.match_id AND is_club_admin(ms.club_id)));

DROP POLICY IF EXISTS "player_bowling: read own" ON player_bowling;
CREATE POLICY "player_bowling: read own" ON player_bowling
  FOR SELECT TO authenticated USING (player_id = auth.uid());

DROP POLICY IF EXISTS "player_bowling: club admins read" ON player_bowling;
CREATE POLICY "player_bowling: club admins read" ON player_bowling
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM match_scorecards ms WHERE ms.id = player_bowling.match_id AND is_club_admin(ms.club_id)));

DROP POLICY IF EXISTS "coaching_insights: read own" ON coaching_insights;
CREATE POLICY "coaching_insights: read own" ON coaching_insights
  FOR SELECT TO authenticated USING (player_id = auth.uid());

DROP POLICY IF EXISTS "coaching_insights: club admins read" ON coaching_insights;
CREATE POLICY "coaching_insights: club admins read" ON coaching_insights
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM match_scorecards ms WHERE ms.id = coaching_insights.match_id AND is_club_admin(ms.club_id)));

-- Players may mark their own insights as read, and change nothing else
DROP POLICY IF EXISTS "coaching_insights: acknowledge own" ON coaching_insights;
CREATE POLICY "coaching_insights: acknowledge own" ON coaching_insights
  FOR UPDATE TO authenticated USING (player_id = auth.uid()) WITH CHECK (player_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON player_innings, player_bowling, coaching_insights FROM anon, authenticated;
GRANT UPDATE (acknowledged) ON coaching_insights TO authenticated;

-- Live updates for the dashboard card (Realtime applies the SELECT policies above)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'coaching_insights'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE coaching_insights;
  END IF;
END $$;
