CREATE TABLE IF NOT EXISTS injury_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  body_part TEXT NOT NULL CHECK (body_part IN (
    'head','shoulder','elbow','wrist','hand','back','hip','knee','ankle','hamstring','other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('minor','moderate','serious')),
  description TEXT,  -- private notes, never shown to admins
  injured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return DATE,
  actual_return DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS injury_logs_user_idx ON injury_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS injury_logs_club_active_idx ON injury_logs(club_id, is_active, body_part);

ALTER TABLE injury_logs ENABLE ROW LEVEL SECURITY;

-- Players can only see and manage their own injury logs
DROP POLICY IF EXISTS "injury_logs: own rows" ON injury_logs;
CREATE POLICY "injury_logs: own rows" ON injury_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- IMPORTANT: Admins CANNOT read individual injury rows (privacy by design)
-- Admins access only the anonymised aggregate function below

-- Anonymised aggregate for admins only — no individual data exposed
CREATE OR REPLACE FUNCTION get_club_injury_aggregate(p_club_id UUID)
RETURNS TABLE (
  body_part TEXT,
  severity TEXT,
  affected_count BIGINT,
  avg_days_out NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND role IN ('admin','coach')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    il.body_part,
    il.severity,
    COUNT(*) AS affected_count,
    ROUND(AVG(
      COALESCE(il.actual_return, il.expected_return, CURRENT_DATE) - il.injured_at
    )::NUMERIC, 1) AS avg_days_out
  FROM injury_logs il
  WHERE il.club_id = p_club_id
    AND il.is_active = TRUE
  GROUP BY il.body_part, il.severity
  HAVING COUNT(*) >= 2;  -- k=2 anonymity threshold
END;
$$;

-- Only authenticated users can call (function checks admin role internally)
REVOKE ALL ON FUNCTION get_club_injury_aggregate(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_club_injury_aggregate(UUID) TO authenticated;
