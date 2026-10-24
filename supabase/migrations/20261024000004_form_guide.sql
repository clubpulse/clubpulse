-- Form ratings: computed from last 5 match_performances, stored for fast reads
-- match_performances table is created in migration 20261024000003
-- (this migration depends on it; safe to create IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS match_performances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  match_date      DATE NOT NULL,
  opponent        TEXT NOT NULL,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  runs_scored     INTEGER DEFAULT 0,
  balls_faced     INTEGER DEFAULT 0,
  dismissal_type  TEXT,
  dismissed_by    UUID REFERENCES auth.users(id),
  overs_bowled    NUMERIC(4,1) DEFAULT 0,
  runs_conceded   INTEGER DEFAULT 0,
  wickets_taken   INTEGER DEFAULT 0,
  catches         INTEGER DEFAULT 0,
  run_outs        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Form ratings table
CREATE TABLE IF NOT EXISTS form_ratings (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  rating        NUMERIC(5,1) NOT NULL DEFAULT 50.0,  -- 0-100 scale
  trend         TEXT NOT NULL DEFAULT 'steady' CHECK (trend IN ('rising','falling','steady')),
  last_5_scores INTEGER[] DEFAULT '{}',  -- last 5 run scores
  last_5_wickets INTEGER[] DEFAULT '{}', -- last 5 wicket hauls
  matches_played INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS form_ratings_club_idx ON form_ratings(club_id, rating DESC);
ALTER TABLE form_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_ratings: club members read" ON form_ratings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = form_ratings.club_id AND cm.user_id = auth.uid() AND cm.is_active));

-- Function to recalculate form rating for a user
-- Rating formula: weighted average of last 5 matches (batting avg + strike rate + wickets)
-- normalised to 0-100. Recent matches weighted higher.
CREATE OR REPLACE FUNCTION recalculate_form(p_user_id UUID, p_club_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_perfs     RECORD;
  v_rating    NUMERIC := 50.0;
  v_trend     TEXT := 'steady';
  v_runs      INTEGER[] := '{}';
  v_wickets   INTEGER[] := '{}';
  v_count     INTEGER := 0;
  v_score     NUMERIC;
  v_weights   NUMERIC[] := ARRAY[0.35, 0.25, 0.20, 0.12, 0.08]; -- most recent first
  i           INTEGER;
BEGIN
  -- Get last 5 performances
  FOR v_perfs IN
    SELECT runs_scored, wickets_taken, balls_faced, overs_bowled, runs_conceded
    FROM match_performances
    WHERE user_id = p_user_id AND club_id = p_club_id
    ORDER BY match_date DESC
    LIMIT 5
  LOOP
    v_count := v_count + 1;
    v_runs := array_append(v_runs, v_perfs.runs_scored);
    v_wickets := array_append(v_wickets, v_perfs.wickets_taken);
  END LOOP;

  IF v_count = 0 THEN
    RETURN;
  END IF;

  -- Simple scoring: runs/100 * 50 + wickets * 10, capped at 100
  v_rating := 0;
  FOR i IN 1..array_length(v_runs, 1) LOOP
    v_score := LEAST(100, (v_runs[i]::NUMERIC / 100.0 * 50.0) + (v_wickets[i] * 10.0));
    v_rating := v_rating + (v_score * v_weights[i]);
  END LOOP;
  v_rating := LEAST(100, GREATEST(0, v_rating));

  -- Trend: compare first 2 vs last 2 (if enough data)
  IF array_length(v_runs, 1) >= 4 THEN
    IF (v_runs[1] + v_runs[2]) > (v_runs[3] + v_runs[4]) + 10 THEN
      v_trend := 'rising';
    ELSIF (v_runs[3] + v_runs[4]) > (v_runs[1] + v_runs[2]) + 10 THEN
      v_trend := 'falling';
    END IF;
  END IF;

  INSERT INTO form_ratings (user_id, club_id, rating, trend, last_5_scores, last_5_wickets, matches_played, updated_at)
  VALUES (p_user_id, p_club_id, v_rating, v_trend, v_runs, v_wickets, v_count, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET rating = EXCLUDED.rating,
        trend = EXCLUDED.trend,
        last_5_scores = EXCLUDED.last_5_scores,
        last_5_wickets = EXCLUDED.last_5_wickets,
        matches_played = EXCLUDED.matches_played,
        updated_at = NOW();
END;
$$;
