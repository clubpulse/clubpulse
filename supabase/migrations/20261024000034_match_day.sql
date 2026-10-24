CREATE TABLE IF NOT EXISTS match_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  fixture_id UUID,  -- nullable; links to fixtures table if it exists
  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  opposition TEXT NOT NULL,
  venue TEXT,
  our_innings JSONB NOT NULL DEFAULT '{"runs":0,"wickets":0,"overs":"0.0","extras":0}',
  their_innings JSONB NOT NULL DEFAULT '{"runs":0,"wickets":0,"overs":"0.0","extras":0}',
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup','our_batting','our_bowling','completed')),
  result TEXT,  -- "Won by 23 runs", "Lost by 4 wickets" etc
  scorer_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_player_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL REFERENCES match_scorecards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Batting
  runs INTEGER DEFAULT 0,
  balls_faced INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  how_out TEXT,  -- "bowled", "caught", "run out", "not out", "did not bat"
  batting_position INTEGER,
  -- Bowling
  overs_bowled NUMERIC(4,1) DEFAULT 0,
  runs_conceded INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  maidens INTEGER DEFAULT 0,
  -- Fielding
  catches INTEGER DEFAULT 0,
  run_outs INTEGER DEFAULT 0,
  stumpings INTEGER DEFAULT 0,
  -- Scores awarded
  creds_awarded INTEGER DEFAULT 0,
  UNIQUE(scorecard_id, user_id)
);

CREATE TABLE IF NOT EXISTS match_commentary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID NOT NULL REFERENCES match_scorecards(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  event_type TEXT DEFAULT 'update' CHECK (event_type IN ('update','milestone','wicket','boundary','six','result')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scorecards_club_date_idx ON match_scorecards(club_id, match_date DESC);
CREATE INDEX IF NOT EXISTS commentary_scorecard_idx ON match_commentary(scorecard_id, created_at DESC);

ALTER TABLE match_scorecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_commentary ENABLE ROW LEVEL SECURITY;

-- Club members read all
DROP POLICY IF EXISTS "match_scorecards: member read" ON match_scorecards;
CREATE POLICY "match_scorecards: member read" ON match_scorecards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = match_scorecards.club_id AND cm.user_id = auth.uid()));

-- Scorer (admin/coach) writes scorecard
DROP POLICY IF EXISTS "match_scorecards: scorer write" ON match_scorecards;
CREATE POLICY "match_scorecards: scorer write" ON match_scorecards FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = match_scorecards.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = match_scorecards.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));

DROP POLICY IF EXISTS "match_player_scores: member read" ON match_player_scores;
CREATE POLICY "match_player_scores: member read" ON match_player_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM match_scorecards sc, club_members cm WHERE sc.id = match_player_scores.scorecard_id AND cm.club_id = sc.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "match_player_scores: scorer write" ON match_player_scores;
CREATE POLICY "match_player_scores: scorer write" ON match_player_scores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM match_scorecards sc, club_members cm WHERE sc.id = match_player_scores.scorecard_id AND cm.club_id = sc.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM match_scorecards sc, club_members cm WHERE sc.id = match_player_scores.scorecard_id AND cm.club_id = sc.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));

DROP POLICY IF EXISTS "match_commentary: member read" ON match_commentary;
CREATE POLICY "match_commentary: member read" ON match_commentary FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM match_scorecards sc, club_members cm WHERE sc.id = match_commentary.scorecard_id AND cm.club_id = sc.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "match_commentary: scorer write" ON match_commentary;
CREATE POLICY "match_commentary: scorer write" ON match_commentary FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM match_scorecards sc, club_members cm WHERE sc.id = match_commentary.scorecard_id AND cm.club_id = sc.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));

-- Award match Scores SECURITY DEFINER
CREATE OR REPLACE FUNCTION award_match_creds(p_scorecard_id UUID, p_user_id UUID, p_amount INTEGER, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT sc.club_id INTO v_club_id FROM match_scorecards sc WHERE sc.id = p_scorecard_id;
  IF NOT EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = v_club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

  INSERT INTO creds_wallet (user_id, flexi_balance, reward_balance)
    VALUES (p_user_id, p_amount, 0)
    ON CONFLICT (user_id) DO UPDATE SET flexi_balance = creds_wallet.flexi_balance + p_amount, updated_at = NOW();

  UPDATE match_player_scores SET creds_awarded = creds_awarded + p_amount WHERE scorecard_id = p_scorecard_id AND user_id = p_user_id;

  INSERT INTO match_commentary (scorecard_id, message, event_type)
    VALUES (p_scorecard_id, '🏅 ' || p_user_id::TEXT || ' awarded ' || p_amount || ' Scores — ' || p_reason, 'milestone');

  RETURN jsonb_build_object('ok', true, 'awarded', p_amount);
END;
$$;
GRANT EXECUTE ON FUNCTION award_match_creds(UUID, UUID, INTEGER, TEXT) TO authenticated;
