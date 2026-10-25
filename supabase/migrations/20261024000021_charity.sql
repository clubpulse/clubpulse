CREATE TABLE IF NOT EXISTS club_charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  charity_number TEXT,
  website_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_scores_donated INTEGER NOT NULL DEFAULT 0,
  total_donated_pence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS charity_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES club_charities(id) ON DELETE CASCADE,
  scores_donated INTEGER NOT NULL CHECK (scores_donated > 0),
  pence_value INTEGER NOT NULL DEFAULT 0,
  donated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  batch_id UUID,
  message TEXT
);

CREATE TABLE IF NOT EXISTS charity_donation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES club_charities(id) ON DELETE CASCADE,
  total_scores INTEGER NOT NULL,
  total_pence INTEGER NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_by UUID REFERENCES auth.users(id),
  transaction_reference TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS charity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL UNIQUE REFERENCES clubs(id) ON DELETE CASCADE,
  scores_per_pound INTEGER NOT NULL DEFAULT 1000,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS charity_donations_user_idx ON charity_donations(user_id, donated_at DESC);
CREATE INDEX IF NOT EXISTS charity_donations_charity_idx ON charity_donations(charity_id, batch_id);

ALTER TABLE club_charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_donation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_charities: member read" ON club_charities;
CREATE POLICY "club_charities: member read" ON club_charities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_charities.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "club_charities: admin write" ON club_charities;
CREATE POLICY "club_charities: admin write" ON club_charities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_charities.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_charities.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "charity_donations: own read" ON charity_donations;
CREATE POLICY "charity_donations: own read" ON charity_donations FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "charity_donations: admin read" ON charity_donations;
CREATE POLICY "charity_donations: admin read" ON charity_donations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = charity_donations.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "charity_settings: member read" ON charity_settings;
CREATE POLICY "charity_settings: member read" ON charity_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = charity_settings.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "charity_settings: admin write" ON charity_settings;
CREATE POLICY "charity_settings: admin write" ON charity_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = charity_settings.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = charity_settings.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "charity_donation_batches: admin read" ON charity_donation_batches;
CREATE POLICY "charity_donation_batches: admin read" ON charity_donation_batches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = charity_donation_batches.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

CREATE OR REPLACE FUNCTION donate_to_charity(p_charity_id UUID, p_scores INTEGER, p_message TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_charity club_charities%ROWTYPE;
  v_settings charity_settings%ROWTYPE;
  v_flexi INTEGER;
  v_pence INTEGER;
BEGIN
  SELECT * INTO v_charity FROM club_charities WHERE id = p_charity_id;
  IF NOT FOUND OR NOT v_charity.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'charity_not_found');
  END IF;

  SELECT * INTO v_settings FROM charity_settings WHERE club_id = v_charity.club_id;
  IF NOT FOUND OR NOT v_settings.is_enabled THEN
    RETURN jsonb_build_object('ok', false, 'error', 'donations_disabled');
  END IF;

  IF p_scores < 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'minimum_100_scores');
  END IF;

  SELECT flexi_balance INTO v_flexi FROM creds_wallet WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_flexi < p_scores THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_scores', 'balance', COALESCE(v_flexi, 0));
  END IF;

  v_pence := (p_scores * 100) / v_settings.scores_per_pound;

  UPDATE creds_wallet SET flexi_balance = flexi_balance - p_scores, updated_at = NOW() WHERE user_id = auth.uid();

  INSERT INTO charity_donations (user_id, club_id, charity_id, scores_donated, pence_value, message)
  VALUES (auth.uid(), v_charity.club_id, p_charity_id, p_scores, v_pence, p_message);

  UPDATE club_charities SET total_scores_donated = total_scores_donated + p_scores WHERE id = p_charity_id;

  RETURN jsonb_build_object('ok', true, 'scores_donated', p_scores, 'pence_value', v_pence, 'pounds', ROUND(v_pence::NUMERIC / 100, 2));
END;
$$;

GRANT EXECUTE ON FUNCTION donate_to_charity(UUID, INTEGER, TEXT) TO authenticated;
