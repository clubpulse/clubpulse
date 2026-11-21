-- Wellness, full pillar: a saved pre-match routine, a private recovery log, and opt-in sharing of
-- readiness averages with a club's coaches. Row level security is on for every table below.
-- Coaches can never select these tables. The only coach-facing route is the security-definer
-- function at the bottom, which returns averages only, only for adults who have chosen to share,
-- and never returns notes.

CREATE TABLE IF NOT EXISTS wellness_routines (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  item_ids TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wellness_routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wellness_routines: own only" ON wellness_routines;
CREATE POLICY "wellness_routines: own only" ON wellness_routines FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wellness_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  soreness INTEGER CHECK (soreness BETWEEN 1 AND 5),
  activity TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS wellness_recovery_user_date_idx ON wellness_recovery (user_id, log_date DESC);

ALTER TABLE wellness_recovery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wellness_recovery: own only" ON wellness_recovery;
CREATE POLICY "wellness_recovery: own only" ON wellness_recovery FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wellness_share_consent (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  share_readiness BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, club_id)
);

ALTER TABLE wellness_share_consent ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wellness_share_consent: own only" ON wellness_share_consent;
CREATE POLICY "wellness_share_consent: own only" ON wellness_share_consent FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Averages of readiness over the last p_days days (1 to 28) for adult members of a club who have
-- agreed to share with that club's coaches. Caller must be a coach or club admin of the club.
-- Never returns notes. Needs at least two check-ins in the period, so one day cannot be read back.
-- Under-18s are never included. Withdrawing consent removes a person from the result at once.
CREATE OR REPLACE FUNCTION get_consented_readiness(p_club_id UUID, p_days INTEGER DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 7), 1), 28);
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = p_club_id AND cm.user_id = auth.uid() AND cm.is_active = TRUE AND cm.role IN ('club_admin','coach')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;

  SELECT jsonb_agg(row_to_json(agg)) INTO v_result FROM (
    SELECT
      r.user_id,
      COUNT(*) AS check_ins,
      ROUND(AVG(r.sleep), 1) AS avg_sleep,
      ROUND(AVG(r.mood), 1) AS avg_mood,
      ROUND(AVG(r.soreness), 1) AS avg_soreness,
      ROUND(AVG(r.stress), 1) AS avg_stress
    FROM wellness_readiness r
    JOIN wellness_share_consent c ON c.user_id = r.user_id AND c.club_id = p_club_id AND c.share_readiness = TRUE
    JOIN club_members m ON m.user_id = r.user_id AND m.club_id = p_club_id AND m.is_active = TRUE AND COALESCE(m.is_junior, FALSE) = FALSE
    WHERE r.check_date >= CURRENT_DATE - (v_days - 1)
    GROUP BY r.user_id
    HAVING COUNT(*) >= 2
  ) agg;

  RETURN jsonb_build_object('ok', true, 'data', COALESCE(v_result, '[]'::JSONB));
END;
$$;

REVOKE ALL ON FUNCTION get_consented_readiness(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_consented_readiness(UUID, INTEGER) TO authenticated;
