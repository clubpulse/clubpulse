CREATE TABLE IF NOT EXISTS pitch_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  prediction TEXT NOT NULL CHECK (prediction IN ('flat','swing','spin','seam','random')),
  is_correct BOOLEAN,  -- NULL until resolved
  creds_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, fixture_id)
);

CREATE TABLE IF NOT EXISTS pitch_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL UNIQUE REFERENCES fixtures(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  actual_condition TEXT NOT NULL CHECK (actual_condition IN ('flat','swing','spin','seam','random')),
  notes TEXT,  -- "Good length area had some grass, played seam early"
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pitch_votes_fixture_idx ON pitch_votes(fixture_id);
CREATE INDEX IF NOT EXISTS pitch_votes_user_idx ON pitch_votes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pitch_results_club_idx ON pitch_results(club_id, recorded_at DESC);

ALTER TABLE pitch_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_results ENABLE ROW LEVEL SECURITY;

-- Pitch votes: own rows + club members can read aggregate
DROP POLICY IF EXISTS "pitch_votes: own" ON pitch_votes;
CREATE POLICY "pitch_votes: own" ON pitch_votes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pitch_votes: club read" ON pitch_votes;
CREATE POLICY "pitch_votes: club read" ON pitch_votes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = pitch_votes.club_id AND cm.user_id = auth.uid()));

-- Pitch results: club members can read, admins can write
DROP POLICY IF EXISTS "pitch_results: club read" ON pitch_results;
CREATE POLICY "pitch_results: club read" ON pitch_results
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = pitch_results.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "pitch_results: admin write" ON pitch_results;
CREATE POLICY "pitch_results: admin write" ON pitch_results
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = pitch_results.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));

-- Resolve pitch votes and award creds
CREATE OR REPLACE FUNCTION resolve_pitch_votes(p_fixture_id UUID, p_actual_condition TEXT, p_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixture_club UUID;
  v_creds_reward INTEGER := 75;
  v_correct_count INTEGER;
BEGIN
  -- Get club from fixture
  SELECT club_id INTO v_fixture_club FROM fixtures WHERE id = p_fixture_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'fixture_not_found');
  END IF;

  -- Check caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM club_members WHERE club_id = v_fixture_club AND user_id = auth.uid() AND role IN ('admin','coach')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'access_denied');
  END IF;

  -- Insert pitch result
  INSERT INTO pitch_results (fixture_id, club_id, actual_condition, notes, recorded_by)
  VALUES (p_fixture_id, v_fixture_club, p_actual_condition, p_notes, auth.uid())
  ON CONFLICT (fixture_id) DO UPDATE SET actual_condition = p_actual_condition, notes = p_notes, recorded_at = NOW();

  -- Mark votes correct/incorrect
  UPDATE pitch_votes
  SET is_correct = (prediction = p_actual_condition),
      creds_awarded = CASE WHEN prediction = p_actual_condition THEN v_creds_reward ELSE 0 END
  WHERE fixture_id = p_fixture_id AND is_correct IS NULL;

  -- Award creds
  UPDATE creds_wallet cw
  SET flexi_balance = flexi_balance + v_creds_reward, updated_at = NOW()
  FROM pitch_votes pv
  WHERE pv.fixture_id = p_fixture_id AND pv.is_correct = TRUE AND pv.creds_awarded = v_creds_reward AND cw.user_id = pv.user_id;

  SELECT COUNT(*) INTO v_correct_count FROM pitch_votes WHERE fixture_id = p_fixture_id AND is_correct = TRUE;

  RETURN jsonb_build_object('ok', true, 'correct_count', v_correct_count, 'creds_per_winner', v_creds_reward);
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_pitch_votes(UUID, TEXT, TEXT) TO authenticated;

-- Ground history view: past pitch conditions at this ground
CREATE OR REPLACE VIEW ground_pitch_history AS
SELECT
  pr.club_id,
  pr.actual_condition,
  COUNT(*) AS times,
  MAX(pr.recorded_at) AS last_seen
FROM pitch_results pr
GROUP BY pr.club_id, pr.actual_condition
ORDER BY pr.club_id, times DESC;
