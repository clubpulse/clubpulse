CREATE TABLE IF NOT EXISTS club_pulse_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  component_scores JSONB NOT NULL DEFAULT '{}',
  -- Components: availability_rate, volunteer_engagement, scores_activity,
  --             mentor_engagement, fixture_completion, community_engagement
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_week DATE NOT NULL DEFAULT DATE_TRUNC('week', CURRENT_DATE)::DATE
);

CREATE UNIQUE INDEX IF NOT EXISTS pulse_scores_club_week ON club_pulse_scores(club_id, snapshot_week);
CREATE INDEX IF NOT EXISTS pulse_scores_club_idx ON club_pulse_scores(club_id, snapshot_week DESC);

ALTER TABLE club_pulse_scores ENABLE ROW LEVEL SECURITY;

-- Members read their own club's pulse
DROP POLICY IF EXISTS "club_pulse_scores: member read" ON club_pulse_scores;
CREATE POLICY "club_pulse_scores: member read" ON club_pulse_scores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_pulse_scores.club_id AND cm.user_id = auth.uid()));

-- Calculate and upsert the pulse score for a club
CREATE OR REPLACE FUNCTION calculate_pulse_score(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_count INTEGER;
  v_active_members INTEGER := 0;
  v_total_score INTEGER := 0;
  v_availability_score INTEGER := 0;
  v_scores_activity_score INTEGER := 0;
  v_community_score INTEGER := 0;
  v_mentor_score INTEGER := 0;
  v_fixture_score INTEGER := 0;
  v_volunteer_score INTEGER := 0;
  v_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
  SELECT COUNT(*) INTO v_member_count FROM club_members WHERE club_id = p_club_id;
  IF v_member_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_members');
  END IF;

  -- Scores activity (0-20): members who earned/spent Scores this month
  BEGIN
    SELECT COUNT(DISTINCT cm.user_id) INTO v_active_members
    FROM club_members cm
    JOIN creds_wallet cw ON cw.user_id = cm.user_id
    WHERE cm.club_id = p_club_id AND cw.updated_at >= v_month_start;
    v_scores_activity_score := LEAST(20, (v_active_members * 20 / GREATEST(v_member_count, 1)));
  EXCEPTION WHEN undefined_table THEN v_scores_activity_score := 10; END;

  -- Availability rate (0-25): fixture availability responses
  BEGIN
    DECLARE
      v_avail_responses INTEGER;
      v_avail_fixtures INTEGER;
    BEGIN
      SELECT COUNT(DISTINCT fa.user_id) INTO v_avail_responses
      FROM club_members cm
      JOIN fixture_availability fa ON fa.user_id = cm.user_id
      WHERE cm.club_id = p_club_id AND fa.created_at >= v_month_start;
      v_avail_fixtures := GREATEST(1, (SELECT COUNT(*) FROM fixtures WHERE club_id = p_club_id AND fixture_date >= v_month_start AND fixture_date <= CURRENT_DATE + 30));
      v_availability_score := LEAST(25, (v_avail_responses * 25 / (v_member_count * GREATEST(v_avail_fixtures, 1))));
    END;
  EXCEPTION WHEN undefined_table THEN v_availability_score := 12; END;

  -- Mentor engagement (0-15): active mentor sessions this month
  BEGIN
    DECLARE v_mentor_sessions INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_mentor_sessions FROM mentor_sessions ms
        JOIN mentor_requests mr ON mr.id = ms.request_id
        JOIN club_members cm ON cm.user_id = mr.mentee_user_id
        WHERE cm.club_id = p_club_id AND ms.session_date >= v_month_start;
      v_mentor_score := LEAST(15, v_mentor_sessions * 3);
    END;
  EXCEPTION WHEN undefined_table THEN v_mentor_score := 5; END;

  -- Community engagement (0-15): pot contributions + charity donations + raffle tickets
  BEGIN
    DECLARE v_community_actions INTEGER := 0;
    BEGIN
      SELECT COUNT(*) INTO v_community_actions FROM pot_contributions WHERE club_id = p_club_id AND contributed_at >= v_month_start;
    EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN
      v_community_actions := v_community_actions + (SELECT COUNT(*) FROM charity_donations WHERE club_id = p_club_id AND donated_at >= v_month_start);
    EXCEPTION WHEN undefined_table THEN NULL; END;
    v_community_score := LEAST(15, v_community_actions * 2);
  EXCEPTION WHEN OTHERS THEN v_community_score := 5; END;

  -- Volunteer score (0-15): volunteer sessions this month
  BEGIN
    DECLARE v_vol_sessions INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_vol_sessions FROM volunteer_sessions vs
        JOIN club_members cm ON cm.user_id = vs.user_id
        WHERE cm.club_id = p_club_id AND vs.session_date >= v_month_start;
      v_volunteer_score := LEAST(15, v_vol_sessions * 2);
    END;
  EXCEPTION WHEN undefined_table THEN v_volunteer_score := 5; END;

  -- Fixture completion (0-10): fixtures played vs scheduled
  BEGIN
    DECLARE v_played INTEGER; v_scheduled INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_scheduled FROM fixtures WHERE club_id = p_club_id AND fixture_date >= v_month_start - 60 AND fixture_date <= CURRENT_DATE;
      SELECT COUNT(*) INTO v_played FROM fixtures WHERE club_id = p_club_id AND fixture_date >= v_month_start - 60 AND fixture_date <= CURRENT_DATE AND result IS NOT NULL;
      v_fixture_score := CASE WHEN v_scheduled > 0 THEN LEAST(10, (v_played * 10 / v_scheduled)) ELSE 5 END;
    END;
  EXCEPTION WHEN undefined_table THEN v_fixture_score := 5; END;

  v_total_score := v_scores_activity_score + v_availability_score + v_mentor_score + v_community_score + v_volunteer_score + v_fixture_score;

  INSERT INTO club_pulse_scores (club_id, score, component_scores, snapshot_week)
  VALUES (p_club_id, v_total_score, jsonb_build_object(
    'scores_activity', v_scores_activity_score,
    'availability', v_availability_score,
    'mentor', v_mentor_score,
    'community', v_community_score,
    'volunteer', v_volunteer_score,
    'fixture', v_fixture_score
  ), v_week_start)
  ON CONFLICT (club_id, snapshot_week) DO UPDATE
    SET score = v_total_score, component_scores = EXCLUDED.component_scores, calculated_at = NOW();

  RETURN jsonb_build_object('ok', true, 'score', v_total_score, 'week', v_week_start);
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_pulse_score(UUID) TO authenticated;
