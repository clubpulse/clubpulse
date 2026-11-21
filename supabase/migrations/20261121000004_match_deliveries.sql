-- Ball-by-ball scoring for Match Day, live updates and a public share link.

-- Public share token, same pattern as scout_sessions.share_token.
ALTER TABLE match_scorecards
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(12), 'hex');

CREATE TABLE IF NOT EXISTS match_deliveries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id       UUID NOT NULL REFERENCES match_scorecards(id) ON DELETE CASCADE,
  seq                INTEGER NOT NULL,                 -- 1, 2, 3 ... in the order the balls were bowled
  innings            TEXT NOT NULL CHECK (innings IN ('our','their')),
  over_number        INTEGER NOT NULL,                 -- 0-based over
  ball_in_over       INTEGER NOT NULL,                 -- legal balls completed in the over after this ball (0 to 6)
  is_legal_delivery  BOOLEAN NOT NULL DEFAULT TRUE,    -- wides and no-balls are not legal
  runs_off_bat       INTEGER NOT NULL DEFAULT 0 CHECK (runs_off_bat BETWEEN 0 AND 7),
  extra_type         TEXT NOT NULL DEFAULT 'none' CHECK (extra_type IN ('none','wide','no_ball','bye','leg_bye')),
  extra_runs         INTEGER NOT NULL DEFAULT 0 CHECK (extra_runs BETWEEN 0 AND 8),
  wicket             BOOLEAN NOT NULL DEFAULT FALSE,
  dismissal_type     TEXT CHECK (dismissal_type IN ('bowled','caught','lbw','run_out','stumped','hit_wicket','other')),
  dismissed_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fielder_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  striker_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- null when the opposition is batting
  non_striker_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bowler_user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- null when the opposition is bowling
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scorecard_id, seq)
);
CREATE INDEX IF NOT EXISTS match_deliveries_scorecard_seq_idx ON match_deliveries(scorecard_id, seq);
ALTER TABLE match_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_deliveries: member read" ON match_deliveries;
CREATE POLICY "match_deliveries: member read" ON match_deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM match_scorecards sc, club_members cm WHERE sc.id = match_deliveries.scorecard_id AND cm.club_id = sc.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "match_deliveries: scorer insert" ON match_deliveries;
CREATE POLICY "match_deliveries: scorer insert" ON match_deliveries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM match_scorecards sc, club_members cm WHERE sc.id = match_deliveries.scorecard_id AND cm.club_id = sc.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Delete exists only so the scorer can undo the last ball. No UPDATE policy: history is not edited in place.
DROP POLICY IF EXISTS "match_deliveries: scorer undo" ON match_deliveries;
CREATE POLICY "match_deliveries: scorer undo" ON match_deliveries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM match_scorecards sc, club_members cm WHERE sc.id = match_deliveries.scorecard_id AND cm.club_id = sc.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Commentary written for a ball goes when that ball is undone.
ALTER TABLE match_commentary
  ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES match_deliveries(id) ON DELETE CASCADE;

-- Live updates for signed-in members. RLS above still decides who receives which rows.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['match_scorecards','match_player_scores','match_commentary','match_deliveries'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
