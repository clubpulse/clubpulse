-- Club metrics snapshot table (stores monthly snapshots)
CREATE TABLE IF NOT EXISTS club_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  snapshot_month DATE NOT NULL,  -- first day of the month: '2026-10-01'
  total_members INTEGER NOT NULL DEFAULT 0,
  active_members INTEGER NOT NULL DEFAULT 0,  -- logged in last 30 days
  avg_availability_rate NUMERIC(5,2) NOT NULL DEFAULT 0,  -- % who respond to fixtures
  total_scores_earned INTEGER NOT NULL DEFAULT 0,  -- Scores earned this month
  total_scores_spent INTEGER NOT NULL DEFAULT 0,
  dressing_room_posts INTEGER NOT NULL DEFAULT 0,
  fixtures_played INTEGER NOT NULL DEFAULT 0,
  active_injuries_anonymous INTEGER NOT NULL DEFAULT 0,  -- anonymised count
  mentor_sessions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(club_id, snapshot_month)
);

CREATE INDEX IF NOT EXISTS club_health_snapshots_club_idx ON club_health_snapshots(club_id, snapshot_month DESC);

ALTER TABLE club_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_health_snapshots: admin read" ON club_health_snapshots;
CREATE POLICY "club_health_snapshots: admin read" ON club_health_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = club_health_snapshots.club_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('admin','coach')
  ));

-- Function to compute current club health (live, not from snapshots)
CREATE OR REPLACE FUNCTION get_club_health(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_members INTEGER;
  v_active_members INTEGER;
  v_total_scores INTEGER;
  v_dressing_room_posts INTEGER;
  v_fixtures_played INTEGER;
  v_active_injuries INTEGER;
  v_availability_responses INTEGER;
  v_availability_total INTEGER;
  v_availability_rate NUMERIC;
BEGIN
  -- Check admin
  IF NOT EXISTS (
    SELECT 1 FROM club_members WHERE club_id = p_club_id AND user_id = auth.uid() AND role IN ('admin','coach')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO v_total_members FROM club_members WHERE club_id = p_club_id;

  -- Total Scores held by club members
  SELECT COALESCE(SUM(cw.flexi_balance + cw.reward_balance), 0) INTO v_total_scores
  FROM club_members cm
  JOIN creds_wallet cw ON cw.user_id = cm.user_id
  WHERE cm.club_id = p_club_id;

  -- Dressing room posts last 30 days (table may not exist yet)
  BEGIN
    SELECT COUNT(*) INTO v_dressing_room_posts
    FROM dressing_room_posts WHERE club_id = p_club_id AND created_at > NOW() - INTERVAL '30 days';
  EXCEPTION WHEN undefined_table THEN v_dressing_room_posts := 0;
  END;

  -- Fixtures in last 90 days
  BEGIN
    SELECT COUNT(*) INTO v_fixtures_played FROM fixtures WHERE club_id = p_club_id AND match_date > NOW() - INTERVAL '90 days';
  EXCEPTION WHEN undefined_table THEN v_fixtures_played := 0;
  END;

  -- Active injuries (anonymised count, no minimum threshold here — just a count)
  BEGIN
    SELECT COUNT(*) INTO v_active_injuries FROM injury_logs WHERE club_id = p_club_id AND is_active = TRUE;
  EXCEPTION WHEN undefined_table THEN v_active_injuries := 0;
  END;

  -- Availability response rate
  BEGIN
    SELECT COUNT(*) INTO v_availability_total FROM fixture_availability fa
    JOIN fixtures f ON f.id = fa.fixture_id WHERE f.club_id = p_club_id;
    SELECT COUNT(*) INTO v_availability_responses FROM fixture_availability fa
    JOIN fixtures f ON f.id = fa.fixture_id WHERE f.club_id = p_club_id AND fa.status != 'unknown';
    IF v_availability_total > 0 THEN
      v_availability_rate := ROUND((v_availability_responses::NUMERIC / v_availability_total) * 100, 1);
    ELSE
      v_availability_rate := 0;
    END IF;
  EXCEPTION WHEN undefined_table THEN v_availability_rate := 0;
  END;

  RETURN jsonb_build_object(
    'total_members', v_total_members,
    'total_scores', v_total_scores,
    'dressing_room_posts_30d', v_dressing_room_posts,
    'fixtures_90d', v_fixtures_played,
    'active_injuries', v_active_injuries,
    'availability_rate', v_availability_rate
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_club_health(UUID) TO authenticated;
