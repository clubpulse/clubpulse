-- PRIVACY: junior_slots contains no PII. The admin_user_id mapping to the real child
-- is managed offline by the club admin, not stored in this table.

-- Sponsorship packages defined by admin (what can be sponsored)
CREATE TABLE IF NOT EXISTS sponsorship_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('membership','kit','coaching','equipment','other')),
  scores_cost INTEGER NOT NULL CHECK (scores_cost > 0),
  slots_available INTEGER,  -- NULL = unlimited
  slots_filled INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Anonymous junior player slots (NO PII - just a label visible to sponsors)
CREATE TABLE IF NOT EXISTS junior_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  anonymous_label TEXT NOT NULL,  -- "Junior Cricketer A", "Young Player #3" etc
  age_group TEXT NOT NULL CHECK (age_group IN ('under_9','under_11','under_13','under_15','under_17','under_19')),
  about TEXT,  -- "Loves batting, plays for school team" - non-identifying
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  admin_user_id UUID REFERENCES auth.users(id),  -- admin who knows the actual identity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sponsorships: links sponsor to package (and optionally an anonymous slot)
CREATE TABLE IF NOT EXISTS sponsorships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES sponsorship_packages(id) ON DELETE CASCADE,
  junior_slot_id UUID REFERENCES junior_slots(id),  -- optional specific junior
  scores_paid INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','fulfilled','cancelled')),
  message TEXT,  -- sponsor's message of encouragement
  sponsored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);

ALTER TABLE sponsorship_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE junior_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsorships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsorship_packages: member read" ON sponsorship_packages;
CREATE POLICY "sponsorship_packages: member read" ON sponsorship_packages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = sponsorship_packages.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "sponsorship_packages: admin write" ON sponsorship_packages;
CREATE POLICY "sponsorship_packages: admin write" ON sponsorship_packages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = sponsorship_packages.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = sponsorship_packages.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Junior slots: only admin can see the full record; members see anonymised view
DROP POLICY IF EXISTS "junior_slots: member read" ON junior_slots;
CREATE POLICY "junior_slots: member read" ON junior_slots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = junior_slots.club_id AND cm.user_id = auth.uid()) AND is_available);

DROP POLICY IF EXISTS "junior_slots: admin write" ON junior_slots;
CREATE POLICY "junior_slots: admin write" ON junior_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = junior_slots.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = junior_slots.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "sponsorships: own read" ON sponsorships;
CREATE POLICY "sponsorships: own read" ON sponsorships FOR SELECT TO authenticated USING (auth.uid() = sponsor_user_id);

DROP POLICY IF EXISTS "sponsorships: admin read" ON sponsorships;
CREATE POLICY "sponsorships: admin read" ON sponsorships FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = sponsorships.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Sponsor atomically
CREATE OR REPLACE FUNCTION create_sponsorship(
  p_package_id UUID,
  p_junior_slot_id UUID DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_package sponsorship_packages%ROWTYPE;
  v_flexi INTEGER;
BEGIN
  SELECT * INTO v_package FROM sponsorship_packages WHERE id = p_package_id FOR UPDATE;
  IF NOT FOUND OR NOT v_package.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'package_not_found');
  END IF;
  IF v_package.slots_available IS NOT NULL AND v_package.slots_filled >= v_package.slots_available THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_slots_available');
  END IF;

  SELECT flexi_balance INTO v_flexi FROM creds_wallet WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_flexi < v_package.scores_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_scores', 'cost', v_package.scores_cost, 'balance', COALESCE(v_flexi, 0));
  END IF;

  UPDATE creds_wallet SET flexi_balance = flexi_balance - v_package.scores_cost, updated_at = NOW() WHERE user_id = auth.uid();
  UPDATE sponsorship_packages SET slots_filled = slots_filled + 1 WHERE id = p_package_id;

  IF p_junior_slot_id IS NOT NULL THEN
    UPDATE junior_slots SET is_available = FALSE WHERE id = p_junior_slot_id;
  END IF;

  INSERT INTO sponsorships (sponsor_user_id, club_id, package_id, junior_slot_id, scores_paid, message)
  VALUES (auth.uid(), v_package.club_id, p_package_id, p_junior_slot_id, v_package.scores_cost, p_message);

  RETURN jsonb_build_object('ok', true, 'scores_paid', v_package.scores_cost);
END;
$$;

GRANT EXECUTE ON FUNCTION create_sponsorship(UUID, UUID, TEXT) TO authenticated;
