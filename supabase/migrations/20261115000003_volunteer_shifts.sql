-- ============================================================================
-- Volunteer Shift Scheduling
-- Admins create shift slots, volunteers sign up, check-in links to shifts.
-- ============================================================================

-- ── Shift templates ─────────────────────────────────────────────────────────
-- Pre-defined shift slots for match days, training, events, etc.

CREATE TABLE IF NOT EXISTS volunteer_shifts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  role          TEXT NOT NULL CHECK (role IN ('scorer','umpire','groundskeeper','tea_duty','first_aid','general')),
  shift_date    DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  location      TEXT,
  max_volunteers INTEGER NOT NULL DEFAULT 1,
  scores_bonus  INTEGER NOT NULL DEFAULT 0,           -- extra Scores on top of role base
  is_critical   BOOLEAN NOT NULL DEFAULT FALSE,       -- high-priority shift
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS vol_shifts_club_date ON volunteer_shifts(club_id, shift_date);

-- ── Shift sign-ups ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS volunteer_shift_signups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id       UUID NOT NULL REFERENCES volunteer_shifts(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'signed_up'
                   CHECK (status IN ('signed_up','confirmed','checked_in','completed','no_show','cancelled')),
  check_in_at    TIMESTAMPTZ,
  check_out_at   TIMESTAMPTZ,
  hours_logged   NUMERIC(4,2),                        -- computed on check-out
  scores_earned  INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  signed_up_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shift_id, user_id)
);

CREATE INDEX IF NOT EXISTS vol_signups_user ON volunteer_shift_signups(user_id, status);
CREATE INDEX IF NOT EXISTS vol_signups_shift ON volunteer_shift_signups(shift_id);

-- ── Volunteer hours summary ─────────────────────────────────────────────────
-- Materialised running totals per volunteer per club.

CREATE TABLE IF NOT EXISTS volunteer_hours_summary (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  total_hours     NUMERIC(8,2) NOT NULL DEFAULT 0,
  total_shifts    INTEGER NOT NULL DEFAULT 0,
  total_scores    INTEGER NOT NULL DEFAULT 0,
  no_show_count   INTEGER NOT NULL DEFAULT 0,
  last_shift_date DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, club_id)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE volunteer_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_shift_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours_summary ENABLE ROW LEVEL SECURITY;

-- Shifts: club members can read; admins can write
CREATE POLICY "vol_shifts: club read" ON volunteer_shifts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = volunteer_shifts.club_id
      AND cm.user_id = auth.uid()
      AND cm.is_active
  ));

CREATE POLICY "vol_shifts: admin write" ON volunteer_shifts FOR ALL TO authenticated
  USING (is_club_admin(club_id))
  WITH CHECK (is_club_admin(club_id));

-- Sign-ups: own rows + admin reads
CREATE POLICY "vol_signups: own" ON volunteer_shift_signups FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "vol_signups: admin read" ON volunteer_shift_signups FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM volunteer_shifts vs
    WHERE vs.id = volunteer_shift_signups.shift_id
      AND is_club_admin(vs.club_id)
  ));

-- Hours summary: own + admin
CREATE POLICY "vol_hours: own" ON volunteer_hours_summary FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "vol_hours: admin" ON volunteer_hours_summary FOR SELECT TO authenticated
  USING (is_club_admin(club_id));

-- ── Check-out RPC ───────────────────────────────────────────────────────────
-- Admin checks out a volunteer, computes hours, awards Scores.

CREATE OR REPLACE FUNCTION checkout_volunteer_shift(
  p_signup_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup  volunteer_shift_signups%ROWTYPE;
  v_shift   volunteer_shifts%ROWTYPE;
  v_hours   NUMERIC(4,2);
  v_scores  INTEGER;
BEGIN
  SELECT * INTO v_signup FROM volunteer_shift_signups WHERE id = p_signup_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'signup_not_found');
  END IF;
  IF v_signup.status NOT IN ('signed_up', 'confirmed', 'checked_in') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  SELECT * INTO v_shift FROM volunteer_shifts WHERE id = v_signup.shift_id;

  -- Hours = shift duration
  v_hours := EXTRACT(EPOCH FROM (v_shift.end_time - v_shift.start_time)) / 3600.0;
  v_hours := ROUND(v_hours, 2);

  -- Base Scores from sport config + shift bonus
  v_scores := v_shift.scores_bonus;

  -- Look up role base from sport_configs
  DECLARE
    v_club_sport TEXT;
    v_base_scores INTEGER;
  BEGIN
    SELECT sport INTO v_club_sport FROM clubs WHERE id = v_shift.club_id;
    SELECT COALESCE(
      (earning_rules->'volunteering'->>v_shift.role)::INTEGER, 0
    ) INTO v_base_scores
    FROM sport_configs WHERE name = COALESCE(v_club_sport, 'cricket');
    v_scores := v_scores + COALESCE(v_base_scores, 0);
  END;

  -- Update signup
  UPDATE volunteer_shift_signups SET
    status = 'completed',
    check_out_at = NOW(),
    hours_logged = v_hours,
    scores_earned = v_scores,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_signup_id;

  -- Update hours summary
  INSERT INTO volunteer_hours_summary (user_id, club_id, total_hours, total_shifts, total_scores, last_shift_date)
  VALUES (v_signup.user_id, v_shift.club_id, v_hours, 1, v_scores, v_shift.shift_date)
  ON CONFLICT (user_id, club_id)
  DO UPDATE SET
    total_hours = volunteer_hours_summary.total_hours + v_hours,
    total_shifts = volunteer_hours_summary.total_shifts + 1,
    total_scores = volunteer_hours_summary.total_scores + v_scores,
    last_shift_date = GREATEST(volunteer_hours_summary.last_shift_date, v_shift.shift_date),
    updated_at = NOW();

  -- Award Scores to volunteer's wallet
  IF v_scores > 0 THEN
    INSERT INTO creds_wallet (user_id, flexi_balance)
    VALUES (v_signup.user_id, v_scores)
    ON CONFLICT (user_id)
    DO UPDATE SET flexi_balance = creds_wallet.flexi_balance + v_scores, updated_at = NOW();
  END IF;

  RETURN jsonb_build_object('ok', true, 'hours', v_hours, 'scores_earned', v_scores);
END;
$$;

GRANT EXECUTE ON FUNCTION checkout_volunteer_shift(UUID, TEXT) TO authenticated;

-- ── No-show marker ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_volunteer_no_show(p_signup_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup  volunteer_shift_signups%ROWTYPE;
  v_shift   volunteer_shifts%ROWTYPE;
BEGIN
  SELECT * INTO v_signup FROM volunteer_shift_signups WHERE id = p_signup_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'signup_not_found');
  END IF;

  SELECT * INTO v_shift FROM volunteer_shifts WHERE id = v_signup.shift_id;

  UPDATE volunteer_shift_signups SET status = 'no_show' WHERE id = p_signup_id;

  INSERT INTO volunteer_hours_summary (user_id, club_id, no_show_count)
  VALUES (v_signup.user_id, v_shift.club_id, 1)
  ON CONFLICT (user_id, club_id)
  DO UPDATE SET
    no_show_count = volunteer_hours_summary.no_show_count + 1,
    updated_at = NOW();

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION mark_volunteer_no_show(UUID) TO authenticated;
