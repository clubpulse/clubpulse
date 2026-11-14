CREATE TABLE IF NOT EXISTS coaching_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  coaching_type TEXT NOT NULL CHECK (coaching_type IN ('batting','bowling','fielding','wicketkeeping','fitness','allround','mental')),
  session_format TEXT NOT NULL DEFAULT 'individual' CHECK (session_format IN ('individual','group','online')),
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes IN (30,45,60,90,120)),
  max_players INTEGER NOT NULL DEFAULT 1,
  scores_cost INTEGER NOT NULL CHECK (scores_cost >= 0),
  qualification TEXT,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  total_sessions_delivered INTEGER NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coaching_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES coaching_listings(id) ON DELETE CASCADE,
  player_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  scores_paid INTEGER NOT NULL DEFAULT 0,
  player_rating INTEGER CHECK (player_rating BETWEEN 1 AND 5),
  player_feedback TEXT,
  coach_notes TEXT,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS coaching_listings_club_idx ON coaching_listings(club_id, is_active);
CREATE INDEX IF NOT EXISTS coaching_bookings_player_idx ON coaching_bookings(player_user_id, status);
CREATE INDEX IF NOT EXISTS coaching_bookings_coach_idx ON coaching_bookings(coach_user_id, status);

ALTER TABLE coaching_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coaching_listings: club read" ON coaching_listings;
CREATE POLICY "coaching_listings: club read" ON coaching_listings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = coaching_listings.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "coaching_listings: coach write" ON coaching_listings;
CREATE POLICY "coaching_listings: coach write" ON coaching_listings FOR ALL TO authenticated
  USING (auth.uid() = coach_user_id) WITH CHECK (auth.uid() = coach_user_id);

DROP POLICY IF EXISTS "coaching_bookings: parties read" ON coaching_bookings;
CREATE POLICY "coaching_bookings: parties read" ON coaching_bookings FOR SELECT TO authenticated
  USING (auth.uid() IN (player_user_id, coach_user_id));

DROP POLICY IF EXISTS "coaching_bookings: player create" ON coaching_bookings;
CREATE POLICY "coaching_bookings: player create" ON coaching_bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_user_id);

DROP POLICY IF EXISTS "coaching_bookings: parties update" ON coaching_bookings;
CREATE POLICY "coaching_bookings: parties update" ON coaching_bookings FOR UPDATE TO authenticated
  USING (auth.uid() IN (player_user_id, coach_user_id));

CREATE OR REPLACE FUNCTION book_coaching_session(
  p_listing_id UUID,
  p_session_date DATE,
  p_session_time TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing coaching_listings%ROWTYPE;
  v_flexi INTEGER;
BEGIN
  SELECT * INTO v_listing FROM coaching_listings WHERE id = p_listing_id;
  IF NOT FOUND OR NOT v_listing.is_active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'listing_not_found');
  END IF;
  IF auth.uid() = v_listing.coach_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cannot_book_own_session');
  END IF;
  IF v_listing.scores_cost > 0 THEN
    SELECT flexi_balance INTO v_flexi FROM creds_wallet WHERE user_id = auth.uid() FOR UPDATE;
    IF NOT FOUND OR v_flexi < v_listing.scores_cost THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_scores', 'cost', v_listing.scores_cost, 'balance', COALESCE(v_flexi, 0));
    END IF;
    UPDATE creds_wallet SET flexi_balance = flexi_balance - v_listing.scores_cost, updated_at = NOW() WHERE user_id = auth.uid();
  END IF;
  INSERT INTO coaching_bookings (listing_id, player_user_id, coach_user_id, club_id, session_date, session_time, scores_paid)
  VALUES (p_listing_id, auth.uid(), v_listing.coach_user_id, v_listing.club_id, p_session_date, p_session_time, v_listing.scores_cost);
  RETURN jsonb_build_object('ok', true, 'scores_paid', v_listing.scores_cost);
END;
$$;

GRANT EXECUTE ON FUNCTION book_coaching_session(UUID, DATE, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION complete_coaching_session(p_booking_id UUID, p_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking coaching_bookings%ROWTYPE;
  v_coach_reward INTEGER;
BEGIN
  SELECT * INTO v_booking FROM coaching_bookings WHERE id = p_booking_id;
  IF NOT FOUND OR v_booking.status NOT IN ('pending','confirmed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_booking');
  END IF;
  IF auth.uid() != v_booking.coach_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'access_denied');
  END IF;
  v_coach_reward := GREATEST(v_booking.scores_paid, 50);
  UPDATE coaching_bookings SET status = 'completed', completed_at = NOW(), coach_notes = p_notes WHERE id = p_booking_id;
  UPDATE coaching_listings SET total_sessions_delivered = total_sessions_delivered + 1 WHERE id = v_booking.listing_id;
  INSERT INTO creds_wallet (user_id, flexi_balance) VALUES (v_booking.coach_user_id, v_coach_reward)
  ON CONFLICT (user_id) DO UPDATE SET flexi_balance = creds_wallet.flexi_balance + v_coach_reward, updated_at = NOW();
  RETURN jsonb_build_object('ok', true, 'coach_creds_earned', v_coach_reward);
END;
$$;

GRANT EXECUTE ON FUNCTION complete_coaching_session(UUID, TEXT) TO authenticated;
