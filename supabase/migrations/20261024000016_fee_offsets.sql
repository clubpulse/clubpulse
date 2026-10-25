-- Club fee settings
CREATE TABLE IF NOT EXISTS club_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL UNIQUE REFERENCES clubs(id) ON DELETE CASCADE,
  annual_fee_pence INTEGER NOT NULL DEFAULT 5000,  -- £50.00 default
  scores_per_pound INTEGER NOT NULL DEFAULT 1000,  -- 1000 Scores = £1 off
  max_offset_percent INTEGER NOT NULL DEFAULT 50,  -- max 50% of fee can be offset
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fee offset applications
CREATE TABLE IF NOT EXISTS fee_offset_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  scores_applied INTEGER NOT NULL CHECK (scores_applied > 0),
  pence_offset INTEGER NOT NULL CHECK (pence_offset > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  UNIQUE(user_id, club_id, season)  -- one application per season
);

CREATE INDEX IF NOT EXISTS fee_offset_applications_club_idx ON fee_offset_applications(club_id, season, status);

ALTER TABLE club_fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_offset_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_fee_settings: member read" ON club_fee_settings;
CREATE POLICY "club_fee_settings: member read" ON club_fee_settings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_fee_settings.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "club_fee_settings: admin write" ON club_fee_settings;
CREATE POLICY "club_fee_settings: admin write" ON club_fee_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_fee_settings.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_fee_settings.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "fee_offset_applications: own read" ON fee_offset_applications;
CREATE POLICY "fee_offset_applications: own read" ON fee_offset_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fee_offset_applications: own create" ON fee_offset_applications;
CREATE POLICY "fee_offset_applications: own create" ON fee_offset_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fee_offset_applications: admin read" ON fee_offset_applications;
CREATE POLICY "fee_offset_applications: admin read" ON fee_offset_applications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = fee_offset_applications.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "fee_offset_applications: admin update" ON fee_offset_applications;
CREATE POLICY "fee_offset_applications: admin update" ON fee_offset_applications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = fee_offset_applications.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Apply fee offset atomically: deduct Scores, create application
CREATE OR REPLACE FUNCTION apply_fee_offset(p_club_id UUID, p_scores_to_apply INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings club_fee_settings%ROWTYPE;
  v_flexi INTEGER;
  v_max_scores INTEGER;
  v_pence_offset INTEGER;
  v_season INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
  SELECT * INTO v_settings FROM club_fee_settings WHERE club_id = p_club_id;
  IF NOT FOUND OR NOT v_settings.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'fee_settings_not_configured');
  END IF;

  -- Check not already applied this season
  IF EXISTS (SELECT 1 FROM fee_offset_applications WHERE user_id = auth.uid() AND club_id = p_club_id AND season = v_season) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_applied_this_season');
  END IF;

  -- Calculate max offset
  v_max_scores := (v_settings.annual_fee_pence * v_settings.max_offset_percent / 100) * v_settings.scores_per_pound / 100;
  IF p_scores_to_apply > v_max_scores THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exceeds_max_offset', 'max_scores', v_max_scores);
  END IF;

  -- Check balance
  SELECT flexi_balance INTO v_flexi FROM creds_wallet WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_flexi < p_scores_to_apply THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_scores', 'balance', COALESCE(v_flexi, 0));
  END IF;

  -- Calculate pence value
  v_pence_offset := (p_scores_to_apply * 100) / v_settings.scores_per_pound;

  -- Deduct Scores
  UPDATE creds_wallet SET flexi_balance = flexi_balance - p_scores_to_apply, updated_at = NOW()
  WHERE user_id = auth.uid();

  -- Create application
  INSERT INTO fee_offset_applications (user_id, club_id, season, scores_applied, pence_offset)
  VALUES (auth.uid(), p_club_id, v_season, p_scores_to_apply, v_pence_offset);

  RETURN jsonb_build_object('ok', true, 'scores_applied', p_scores_to_apply, 'pence_offset', v_pence_offset, 'pounds_offset', ROUND(v_pence_offset::NUMERIC / 100, 2));
END;
$$;

GRANT EXECUTE ON FUNCTION apply_fee_offset(UUID, INTEGER) TO authenticated;
