CREATE TABLE IF NOT EXISTS wellbeing_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  check_week DATE NOT NULL DEFAULT DATE_TRUNC('week', CURRENT_DATE)::DATE,
  physical_rating INTEGER NOT NULL CHECK (physical_rating BETWEEN 1 AND 5),
  mental_rating INTEGER NOT NULL CHECK (mental_rating BETWEEN 1 AND 5),
  notes TEXT,  -- optional private note (own eyes only)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, club_id, check_week)
);

CREATE INDEX IF NOT EXISTS wellbeing_club_week_idx ON wellbeing_checkins(club_id, check_week DESC);

ALTER TABLE wellbeing_checkins ENABLE ROW LEVEL SECURITY;

-- ONLY own rows — coaches cannot read individual rows
DROP POLICY IF EXISTS "wellbeing_checkins: own only" ON wellbeing_checkins;
CREATE POLICY "wellbeing_checkins: own only" ON wellbeing_checkins FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Aggregate function for coaches/admins — returns counts only, no user_ids
CREATE OR REPLACE FUNCTION get_wellbeing_aggregate(p_club_id UUID, p_weeks INTEGER DEFAULT 4)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is admin/coach
  IF NOT EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = p_club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

  SELECT jsonb_agg(row_to_json(agg)) INTO v_result FROM (
    SELECT
      check_week,
      COUNT(*) AS total_responses,
      ROUND(AVG(physical_rating), 1) AS avg_physical,
      ROUND(AVG(mental_rating), 1) AS avg_mental,
      COUNT(CASE WHEN physical_rating <= 2 THEN 1 END) AS physical_concern_count,
      COUNT(CASE WHEN mental_rating <= 2 THEN 1 END) AS mental_concern_count,
      COUNT(CASE WHEN physical_rating >= 4 THEN 1 END) AS physical_good_count,
      COUNT(CASE WHEN mental_rating >= 4 THEN 1 END) AS mental_good_count
    FROM wellbeing_checkins
    WHERE club_id = p_club_id
      AND check_week >= (CURRENT_DATE - (p_weeks * 7))::DATE
    GROUP BY check_week
    ORDER BY check_week DESC
  ) agg;

  RETURN jsonb_build_object('ok', true, 'data', COALESCE(v_result, '[]'::JSONB));
END;
$$;
GRANT EXECUTE ON FUNCTION get_wellbeing_aggregate(UUID, INTEGER) TO authenticated;
