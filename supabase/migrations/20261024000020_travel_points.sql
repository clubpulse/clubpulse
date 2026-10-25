-- Travel log for away games
CREATE TABLE IF NOT EXISTS travel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  fixture_id UUID,  -- optional link to fixtures table
  travel_date DATE NOT NULL,
  destination TEXT NOT NULL,
  distance_miles INTEGER,  -- estimated round-trip miles
  travel_mode TEXT NOT NULL DEFAULT 'car' CHECK (travel_mode IN ('car','train','bus','flight','other')),
  creds_awarded INTEGER NOT NULL DEFAULT 0,
  is_tour BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  awarded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Club tours (multi-day events)
CREATE TABLE IF NOT EXISTS club_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  base_creds_reward INTEGER NOT NULL DEFAULT 500,  -- base award for attending
  bonus_per_day INTEGER NOT NULL DEFAULT 100,  -- additional per day
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tour_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES club_tours(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  days_attended INTEGER NOT NULL DEFAULT 1,
  creds_awarded INTEGER NOT NULL DEFAULT 0,
  awarded_at TIMESTAMPTZ,
  UNIQUE(tour_id, user_id)
);

CREATE INDEX IF NOT EXISTS travel_logs_user_idx ON travel_logs(user_id, travel_date DESC);
CREATE INDEX IF NOT EXISTS travel_logs_club_idx ON travel_logs(club_id, travel_date DESC);

ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_logs: own read" ON travel_logs;
CREATE POLICY "travel_logs: own read" ON travel_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "travel_logs: club read" ON travel_logs;
CREATE POLICY "travel_logs: club read" ON travel_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = travel_logs.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "club_tours: member read" ON club_tours;
CREATE POLICY "club_tours: member read" ON club_tours FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_tours.club_id AND cm.user_id = auth.uid()));
DROP POLICY IF EXISTS "club_tours: admin write" ON club_tours;
CREATE POLICY "club_tours: admin write" ON club_tours FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_tours.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_tours.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "tour_participants: own read" ON tour_participants;
CREATE POLICY "tour_participants: own read" ON tour_participants FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tour_participants: admin write" ON tour_participants;
CREATE POLICY "tour_participants: admin write" ON tour_participants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm, club_tours ct WHERE ct.id = tour_participants.tour_id AND cm.club_id = ct.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm, club_tours ct WHERE ct.id = tour_participants.tour_id AND cm.club_id = ct.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Creds formula: base 50 + 10 per 10 miles (rounded), max 300 for single trips
-- Tours: base_creds_reward + bonus_per_day * days_attended
CREATE OR REPLACE FUNCTION award_travel_points(
  p_club_id UUID,
  p_travel_date DATE,
  p_destination TEXT,
  p_distance_miles INTEGER,
  p_travel_mode TEXT DEFAULT 'car',
  p_fixture_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creds INTEGER;
BEGIN
  -- Calculate creds: 50 base + 10 per 10 miles, max 300
  v_creds := LEAST(50 + (COALESCE(p_distance_miles, 0) / 10) * 10, 300);

  INSERT INTO travel_logs (user_id, club_id, fixture_id, travel_date, destination, distance_miles, travel_mode, creds_awarded, notes)
  VALUES (auth.uid(), p_club_id, p_fixture_id, p_travel_date, p_destination, p_distance_miles, p_travel_mode, v_creds, p_notes);

  INSERT INTO creds_wallet (user_id, flexi_balance) VALUES (auth.uid(), v_creds)
  ON CONFLICT (user_id) DO UPDATE SET flexi_balance = creds_wallet.flexi_balance + v_creds, updated_at = NOW();

  RETURN jsonb_build_object('ok', true, 'creds_awarded', v_creds);
END;
$$;

GRANT EXECUTE ON FUNCTION award_travel_points(UUID, DATE, TEXT, INTEGER, TEXT, UUID, TEXT) TO authenticated;

-- Admin awards tour participation
CREATE OR REPLACE FUNCTION award_tour_participation(p_tour_id UUID, p_user_id UUID, p_days_attended INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour club_tours%ROWTYPE;
  v_creds INTEGER;
BEGIN
  SELECT * INTO v_tour FROM club_tours WHERE id = p_tour_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'tour_not_found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = v_tour.club_id AND user_id = auth.uid() AND role IN ('club_admin','coach')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'access_denied');
  END IF;

  v_creds := v_tour.base_creds_reward + (v_tour.bonus_per_day * LEAST(p_days_attended, (v_tour.end_date - v_tour.start_date + 1)));

  INSERT INTO tour_participants (tour_id, user_id, days_attended, creds_awarded, awarded_at)
  VALUES (p_tour_id, p_user_id, p_days_attended, v_creds, NOW())
  ON CONFLICT (tour_id, user_id) DO UPDATE SET days_attended = p_days_attended, creds_awarded = v_creds, awarded_at = NOW();

  INSERT INTO creds_wallet (user_id, flexi_balance) VALUES (p_user_id, v_creds)
  ON CONFLICT (user_id) DO UPDATE SET flexi_balance = creds_wallet.flexi_balance + v_creds, updated_at = NOW();

  RETURN jsonb_build_object('ok', true, 'creds_awarded', v_creds);
END;
$$;

GRANT EXECUTE ON FUNCTION award_tour_participation(UUID, UUID, INTEGER) TO authenticated;
