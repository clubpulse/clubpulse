-- ─────────────────────────────────────────────────────────────────────────────
-- Scores engine
--
-- One place that every new way of earning Scores goes through:
--   • scores_rules          — catalogue of earning rules with default values
--   • club_scores_rules     — per-club overrides (value, on/off)
--   • club_scores_settings  — per-club weekly cap and monthly club goal
--   • scores_ledger         — append-only record of every award
--   • award_scores()        — atomic award: rule lookup, weekly cap, idempotency
--
-- Built on top of it in this migration:
--   • daily check-in (7-day ladder)
--   • game plays (one play per game per day)
--   • training attendance and match fees (admin-marked earning hooks)
--   • age confirmation for chance-based features
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Rules catalogue ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scores_rules (
  source         TEXT PRIMARY KEY,
  label          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  category       TEXT NOT NULL CHECK (category IN ('app', 'games', 'club')),
  default_amount INTEGER NOT NULL CHECK (default_amount >= 0),
  counts_to_cap  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

INSERT INTO scores_rules (source, label, description, category, default_amount, counts_to_cap, sort_order) VALUES
  ('daily_checkin',       'Daily check-in',              'Base value. Days 1-2 pay 1x, days 3-4 pay 2x, days 5-6 pay 3x; day 7 is a free scratch card.', 'app',   5,  TRUE, 10),
  ('weekly_challenge',    'Weekly challenge',            'Paid for each weekly challenge a player completes and claims.',                               'app',   10, TRUE, 20),
  ('weekly_full_house',   'All weekly challenges done',  'Bonus for claiming every challenge in the same week.',                                        'app',   25, TRUE, 30),
  ('game_spin',           'Daily Spin (top prize)',      'The wheel pays 10%, 20%, 50% or 100% of this value.',                                         'games', 50, TRUE, 40),
  ('game_quiz',           'Cricket Quiz',                'Paid per correct answer, three questions a day.',                                             'games', 5,  TRUE, 50),
  ('game_timing',         'Middle It',                   'Paid per middled ball, three balls a day.',                                                   'games', 5,  TRUE, 60),
  ('game_hilo',           'Higher or Lower',             'Paid per correct call, four rounds a day.',                                                   'games', 3,  TRUE, 70),
  ('training_attendance', 'Training attendance',         'Paid when an admin or coach marks a player present at a training session.',                   'club',  10, FALSE, 80),
  ('match_fee_on_time',   'Match fee paid on time',      'Paid when a match fee is marked paid on or before its due date.',                             'club',  10, FALSE, 90)
ON CONFLICT (source) DO NOTHING;

ALTER TABLE scores_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scores_rules: read" ON scores_rules;
CREATE POLICY "scores_rules: read" ON scores_rules FOR SELECT TO authenticated USING (TRUE);

-- 2. Per-club overrides ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_scores_rules (
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  source     TEXT NOT NULL REFERENCES scores_rules(source) ON DELETE CASCADE,
  amount     INTEGER CHECK (amount IS NULL OR amount >= 0),   -- NULL = use the default
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, source)
);

ALTER TABLE club_scores_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "club_scores_rules: member read" ON club_scores_rules;
CREATE POLICY "club_scores_rules: member read" ON club_scores_rules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_scores_rules.club_id AND cm.user_id = auth.uid() AND cm.is_active));
DROP POLICY IF EXISTS "club_scores_rules: admin write" ON club_scores_rules;
CREATE POLICY "club_scores_rules: admin write" ON club_scores_rules FOR ALL TO authenticated
  USING (is_club_admin(club_id)) WITH CHECK (is_club_admin(club_id));

-- 3. Per-club settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_scores_settings (
  club_id             UUID PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,
  weekly_cap          INTEGER CHECK (weekly_cap IS NULL OR weekly_cap >= 0),  -- NULL = no cap
  monthly_goal        INTEGER CHECK (monthly_goal IS NULL OR monthly_goal > 0),
  monthly_goal_reward TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE club_scores_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "club_scores_settings: member read" ON club_scores_settings;
CREATE POLICY "club_scores_settings: member read" ON club_scores_settings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = club_scores_settings.club_id AND cm.user_id = auth.uid() AND cm.is_active));
DROP POLICY IF EXISTS "club_scores_settings: admin write" ON club_scores_settings;
CREATE POLICY "club_scores_settings: admin write" ON club_scores_settings FOR ALL TO authenticated
  USING (is_club_admin(club_id)) WITH CHECK (is_club_admin(club_id));

-- 4. Ledger ───────────────────────────────────────────────────────────────────
-- source is a scores_rules key for engine awards, or 'other' for earnings made
-- by older award functions (captured by the wallet trigger in section 6).
CREATE TABLE IF NOT EXISTS scores_ledger (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    UUID REFERENCES clubs(id) ON DELETE SET NULL,
  source     TEXT NOT NULL,
  amount     INTEGER NOT NULL CHECK (amount > 0),
  reference  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scores_ledger_user_idx ON scores_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scores_ledger_club_idx ON scores_ledger(club_id, created_at DESC);
-- Idempotency: one award per (player, rule, reference)
CREATE UNIQUE INDEX IF NOT EXISTS scores_ledger_once_idx
  ON scores_ledger(user_id, source, reference) WHERE reference IS NOT NULL;

ALTER TABLE scores_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scores_ledger: own read" ON scores_ledger;
CREATE POLICY "scores_ledger: own read" ON scores_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "scores_ledger: admin read" ON scores_ledger;
CREATE POLICY "scores_ledger: admin read" ON scores_ledger FOR SELECT TO authenticated USING (club_id IS NOT NULL AND is_club_admin(club_id));

-- 5. award_scores ─────────────────────────────────────────────────────────────
-- p_multiplier scales the rule value (e.g. 3 correct quiz answers → 3).
-- Returns { ok: true, amount, capped } or { ok: false, error }.
-- Errors: unknown_source, disabled, not_member, already_awarded, weekly_cap_reached
CREATE OR REPLACE FUNCTION award_scores(
  p_user_id    UUID,
  p_club_id    UUID,
  p_source     TEXT,
  p_reference  TEXT DEFAULT NULL,
  p_multiplier NUMERIC DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule      scores_rules%ROWTYPE;
  v_override  club_scores_rules%ROWTYPE;
  v_amount    INTEGER;
  v_cap       INTEGER;
  v_has_cfg   BOOLEAN;
  v_week      INTEGER;
  v_capped    BOOLEAN := FALSE;
  DEFAULT_WEEKLY_CAP CONSTANT INTEGER := 300;
BEGIN
  SELECT * INTO v_rule FROM scores_rules WHERE source = p_source;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_source');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM club_members WHERE club_id = p_club_id AND user_id = p_user_id AND is_active
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_member');
  END IF;

  SELECT * INTO v_override FROM club_scores_rules WHERE club_id = p_club_id AND source = p_source;
  IF FOUND AND NOT v_override.is_enabled THEN
    RETURN jsonb_build_object('ok', false, 'error', 'disabled');
  END IF;

  v_amount := ROUND(COALESCE(v_override.amount, v_rule.default_amount) * GREATEST(p_multiplier, 0));
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'amount', 0, 'capped', false);
  END IF;

  -- Lock the player's wallet row so concurrent awards queue up behind each other
  INSERT INTO creds_wallet (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  PERFORM 1 FROM creds_wallet WHERE user_id = p_user_id FOR UPDATE;

  IF p_reference IS NOT NULL AND EXISTS (
    SELECT 1 FROM scores_ledger WHERE user_id = p_user_id AND source = p_source AND reference = p_reference
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_awarded');
  END IF;

  IF v_rule.counts_to_cap THEN
    SELECT TRUE, weekly_cap INTO v_has_cfg, v_cap FROM club_scores_settings WHERE club_id = p_club_id;
    IF v_has_cfg IS NULL THEN
      v_cap := DEFAULT_WEEKLY_CAP;
    END IF;

    IF v_cap IS NOT NULL THEN
      SELECT COALESCE(SUM(l.amount), 0) INTO v_week
      FROM scores_ledger l
      JOIN scores_rules r ON r.source = l.source AND r.counts_to_cap
      WHERE l.user_id = p_user_id
        AND l.created_at >= date_trunc('week', NOW());

      IF v_week >= v_cap THEN
        RETURN jsonb_build_object('ok', false, 'error', 'weekly_cap_reached', 'cap', v_cap);
      END IF;
      IF v_week + v_amount > v_cap THEN
        v_amount := v_cap - v_week;
        v_capped := TRUE;
      END IF;
    END IF;
  END IF;

  -- Tell the wallet trigger this award is already being written to the ledger
  PERFORM set_config('clubpulse.skip_ledger', '1', TRUE);

  UPDATE creds_wallet
  SET reward_balance  = reward_balance + v_amount,
      lifetime_earned = lifetime_earned + v_amount,
      updated_at      = NOW()
  WHERE user_id = p_user_id;

  PERFORM set_config('clubpulse.skip_ledger', '', TRUE);

  INSERT INTO scores_ledger (user_id, club_id, source, amount, reference)
  VALUES (p_user_id, p_club_id, p_source, v_amount, p_reference);

  RETURN jsonb_build_object('ok', true, 'amount', v_amount, 'capped', v_capped);
END;
$$;

REVOKE ALL ON FUNCTION award_scores(UUID, UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION award_scores(UUID, UUID, TEXT, TEXT, NUMERIC) TO service_role;

-- 6. Capture older earnings in the ledger ─────────────────────────────────────
-- Match performance, steps, travel and the other existing award functions credit
-- creds_wallet directly. This trigger records any rise in lifetime_earned so the
-- weekly league and club goal count them too. It never blocks the wallet update.
CREATE OR REPLACE FUNCTION log_wallet_earning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta INTEGER := NEW.lifetime_earned - OLD.lifetime_earned;
  v_club  UUID;
BEGIN
  IF v_delta <= 0 OR current_setting('clubpulse.skip_ledger', TRUE) = '1' THEN
    RETURN NEW;
  END IF;
  BEGIN
    SELECT club_id INTO v_club FROM club_members
    WHERE user_id = NEW.user_id AND is_active ORDER BY joined_at LIMIT 1;
    INSERT INTO scores_ledger (user_id, club_id, source, amount) VALUES (NEW.user_id, v_club, 'other', v_delta);
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- the ledger is a record, never a reason to fail a wallet credit
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creds_wallet_log_earning ON creds_wallet;
CREATE TRIGGER creds_wallet_log_earning
  AFTER UPDATE OF lifetime_earned ON creds_wallet
  FOR EACH ROW EXECUTE FUNCTION log_wallet_earning();

-- 7. Totals per member since a point in time (weekly league, club goal) ────────
CREATE OR REPLACE FUNCTION club_scores_totals(p_club_id UUID, p_since TIMESTAMPTZ)
RETURNS TABLE (user_id UUID, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.user_id, SUM(l.amount)::BIGINT
  FROM scores_ledger l
  WHERE l.club_id = p_club_id AND l.created_at >= p_since
  GROUP BY l.user_id;
$$;

REVOKE ALL ON FUNCTION club_scores_totals(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION club_scores_totals(UUID, TIMESTAMPTZ) TO service_role;

-- 8. Daily check-in ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_checkins (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  streak_day   INTEGER NOT NULL CHECK (streak_day BETWEEN 1 AND 7),
  amount       INTEGER NOT NULL DEFAULT 0,
  got_card     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, checkin_date)
);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_checkins: own read" ON daily_checkins;
CREATE POLICY "daily_checkins: own read" ON daily_checkins FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Days run on UK time. Missing a day restarts the ladder at day 1.
CREATE OR REPLACE FUNCTION perform_daily_checkin(p_user_id UUID, p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today    DATE := (NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_prev     INTEGER;
  v_day      INTEGER;
  v_res      JSONB;
  v_amount   INTEGER := 0;
  v_card     BOOLEAN := FALSE;
  v_capped   BOOLEAN := FALSE;
  LADDER CONSTANT INTEGER[] := ARRAY[1, 1, 2, 2, 3, 3, 4];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = p_club_id AND user_id = p_user_id AND is_active) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_member');
  END IF;

  -- Serialise check-ins for this player
  INSERT INTO creds_wallet (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  PERFORM 1 FROM creds_wallet WHERE user_id = p_user_id FOR UPDATE;

  IF EXISTS (SELECT 1 FROM daily_checkins WHERE user_id = p_user_id AND checkin_date = v_today) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_checked_in');
  END IF;

  SELECT streak_day INTO v_prev FROM daily_checkins WHERE user_id = p_user_id AND checkin_date = v_today - 1;
  v_day := CASE WHEN v_prev IS NULL OR v_prev >= 7 THEN 1 ELSE v_prev + 1 END;

  -- Day 7: a free scratch card when the club runs scratch cards and the player may use them
  IF v_day = 7
     AND EXISTS (SELECT 1 FROM scratch_card_config WHERE club_id = p_club_id AND is_active)
     AND is_adult_player(p_user_id, p_club_id) THEN
    INSERT INTO scratch_cards (club_id, user_id, source, scores_spent) VALUES (p_club_id, p_user_id, 'bonus', 0);
    v_card := TRUE;
  ELSE
    v_res := award_scores(p_user_id, p_club_id, 'daily_checkin', v_today::TEXT, LADDER[v_day]);
    IF (v_res->>'ok')::BOOLEAN THEN
      v_amount := (v_res->>'amount')::INTEGER;
      v_capped := COALESCE((v_res->>'capped')::BOOLEAN, FALSE);
    ELSIF v_res->>'error' = 'weekly_cap_reached' THEN
      v_capped := TRUE;       -- the streak still counts, there is just nothing left to pay this week
    ELSE
      RETURN v_res;           -- disabled / unknown_source
    END IF;
  END IF;

  INSERT INTO daily_checkins (user_id, club_id, checkin_date, streak_day, amount, got_card)
  VALUES (p_user_id, p_club_id, v_today, v_day, v_amount, v_card);

  RETURN jsonb_build_object('ok', true, 'day', v_day, 'amount', v_amount, 'got_card', v_card, 'capped', v_capped);
END;
$$;

REVOKE ALL ON FUNCTION perform_daily_checkin(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION perform_daily_checkin(UUID, UUID) TO service_role;

-- 9. Game plays ───────────────────────────────────────────────────────────────
-- One row per player, game and day. state holds server-side game data (for
-- example the quiz answers or the Higher or Lower chain) that the client never sees.
CREATE TABLE IF NOT EXISTS game_plays (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  game       TEXT NOT NULL CHECK (game IN ('spin', 'quiz', 'timing', 'hilo')),
  play_date  DATE NOT NULL,
  state      JSONB NOT NULL DEFAULT '{}'::JSONB,
  score      INTEGER NOT NULL DEFAULT 0,
  amount     INTEGER NOT NULL DEFAULT 0,
  finished   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, game, play_date)
);

-- No client policies: state can hold answers, so all access goes through server actions.
ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;

-- 10. Training attendance ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  title        TEXT NOT NULL,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS training_sessions_club_idx ON training_sessions(club_id, session_date DESC);

CREATE TABLE IF NOT EXISTS training_attendance (
  session_id UUID NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marked_by  UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

ALTER TABLE training_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "training_sessions: member read" ON training_sessions;
CREATE POLICY "training_sessions: member read" ON training_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = training_sessions.club_id AND cm.user_id = auth.uid() AND cm.is_active));
DROP POLICY IF EXISTS "training_attendance: own read" ON training_attendance;
CREATE POLICY "training_attendance: own read" ON training_attendance FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "training_attendance: admin read" ON training_attendance;
CREATE POLICY "training_attendance: admin read" ON training_attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM training_sessions s WHERE s.id = session_id AND is_club_admin(s.club_id)));

-- 11. Match fees ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_fees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  fixture_id   UUID REFERENCES fixtures(id) ON DELETE SET NULL,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  amount_pence INTEGER NOT NULL CHECK (amount_pence > 0),
  due_date     DATE NOT NULL,
  paid_at      TIMESTAMPTZ,
  marked_by    UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS match_fees_club_idx ON match_fees(club_id, due_date DESC);
CREATE INDEX IF NOT EXISTS match_fees_user_idx ON match_fees(user_id, due_date DESC);

ALTER TABLE match_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "match_fees: own read" ON match_fees;
CREATE POLICY "match_fees: own read" ON match_fees FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "match_fees: admin read" ON match_fees;
CREATE POLICY "match_fees: admin read" ON match_fees FOR SELECT TO authenticated USING (is_club_admin(club_id));

-- 12. Age confirmation for chance-based features ──────────────────────────────
-- A player may use the raffle, scratch cards, the auction and the Daily Spin only
-- when they have confirmed they are 18 or over AND their club has not marked them
-- as a junior.
ALTER TABLE profiles     ADD COLUMN IF NOT EXISTS age_confirmed_18 BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles     ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ;
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS is_junior BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION is_adult_player(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT age_confirmed_18 FROM profiles WHERE id = p_user_id), FALSE)
     AND NOT EXISTS (
       SELECT 1 FROM club_members WHERE user_id = p_user_id AND club_id = p_club_id AND is_junior
     );
$$;

REVOKE ALL ON FUNCTION is_adult_player(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION is_adult_player(UUID, UUID) TO service_role;
