CREATE TABLE IF NOT EXISTS gut_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fixture_id UUID NOT NULL REFERENCES fixtures(id) ON DELETE CASCADE,
  prediction TEXT NOT NULL CHECK (prediction IN ('win','loss','draw','rain')),
  is_correct BOOLEAN,  -- NULL until match resolved
  creds_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, fixture_id)
);

CREATE INDEX IF NOT EXISTS gut_predictions_user_idx ON gut_predictions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gut_predictions_fixture_idx ON gut_predictions(fixture_id);

ALTER TABLE gut_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gut_predictions: own rows" ON gut_predictions;
CREATE POLICY "gut_predictions: own rows" ON gut_predictions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin can see all predictions for their club's fixtures
DROP POLICY IF EXISTS "gut_predictions: admin read" ON gut_predictions;
CREATE POLICY "gut_predictions: admin read" ON gut_predictions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fixtures f
      JOIN club_members cm ON cm.club_id = f.club_id
      WHERE f.id = gut_predictions.fixture_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('club_admin','coach')
    )
  );

-- Add result column to fixtures if it doesn't already exist
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS result TEXT;

-- Function to resolve predictions after match (called by admin)
CREATE OR REPLACE FUNCTION resolve_gut_predictions(p_fixture_id UUID, p_result TEXT)
RETURNS INTEGER  -- returns count of correct predictions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_count INTEGER;
  v_creds_reward INTEGER := 100;  -- 100 creds for correct gut feeling
BEGIN
  -- Mark correct/incorrect
  UPDATE gut_predictions
  SET is_correct = (prediction = p_result),
      creds_awarded = CASE WHEN prediction = p_result THEN v_creds_reward ELSE 0 END
  WHERE fixture_id = p_fixture_id AND is_correct IS NULL;

  -- Award creds to correct predictors
  UPDATE creds_wallet cw
  SET flexi_balance = flexi_balance + v_creds_reward,
      updated_at = NOW()
  FROM gut_predictions gp
  WHERE gp.fixture_id = p_fixture_id
    AND gp.is_correct = TRUE
    AND gp.creds_awarded = v_creds_reward
    AND cw.user_id = gp.user_id;

  -- Update fixture with result
  UPDATE fixtures SET result = p_result WHERE id = p_fixture_id;

  SELECT COUNT(*) INTO v_correct_count
  FROM gut_predictions WHERE fixture_id = p_fixture_id AND is_correct = TRUE;

  RETURN v_correct_count;
END;
$$;

REVOKE ALL ON FUNCTION resolve_gut_predictions(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_gut_predictions(UUID, TEXT) TO service_role;
