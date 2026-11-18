-- ─────────────────────────────────────────────────────────────────────────────
-- Scratch cards for completing tasks
--
-- A club chooses which tasks give its members a scratch card, and how many
-- completions it takes. Cards stay free: nothing here spends Scores or money.
--   volunteer_shift   a shift the member turned up for
--   academy_lesson    a lesson passed for the first time
--   video_analysis    a technique or ball-tracking analysis (one counts per day)
--   game              reserved for games that award a card
-- Adults only, the same rule as every other scratch card, and at most
-- task_weekly_cap cards a week per member from tasks and games together.
-- Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Cards may now come from a task or a game
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'scratch_cards'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%source%'
  LOOP
    EXECUTE format('ALTER TABLE scratch_cards DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE scratch_cards ADD CONSTRAINT scratch_cards_source_check
  CHECK (source IN ('purchased', 'milestone', 'bonus', 'event', 'task', 'game'));

-- 2. Club settings
ALTER TABLE scratch_card_config
  ADD COLUMN IF NOT EXISTS task_weekly_cap INTEGER NOT NULL DEFAULT 2 CHECK (task_weekly_cap BETWEEN 0 AND 20);

CREATE TABLE IF NOT EXISTS scratch_card_tasks (
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  task       TEXT NOT NULL CHECK (task IN ('volunteer_shift', 'academy_lesson', 'video_analysis', 'game')),
  every_n    INTEGER NOT NULL DEFAULT 1 CHECK (every_n BETWEEN 1 AND 100),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, task)
);

-- 3. What each member has completed. One row per completion; reference stops double counting.
CREATE TABLE IF NOT EXISTS scratch_card_task_progress (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  task       TEXT NOT NULL,
  reference  TEXT NOT NULL,
  card_id    UUID REFERENCES scratch_cards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task, reference)
);

CREATE INDEX IF NOT EXISTS scratch_card_task_progress_idx ON scratch_card_task_progress(user_id, club_id, task);

-- Read and written only by the server (service role)
ALTER TABLE scratch_card_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratch_card_task_progress ENABLE ROW LEVEL SECURITY;

-- 4. Record one completion and issue a card when it is due. Returns TRUE when a card was issued.
CREATE OR REPLACE FUNCTION record_card_task(p_user_id UUID, p_club_id UUID, p_task TEXT, p_reference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_every INTEGER;
  v_cap   INTEGER;
  v_row   UUID;
  v_done  INTEGER;
  v_week  INTEGER;
  v_card  UUID;
BEGIN
  IF p_user_id IS NULL OR p_club_id IS NULL OR p_reference IS NULL THEN RETURN FALSE; END IF;

  SELECT every_n INTO v_every FROM scratch_card_tasks WHERE club_id = p_club_id AND task = p_task AND is_active;
  IF v_every IS NULL THEN RETURN FALSE; END IF;

  SELECT task_weekly_cap INTO v_cap FROM scratch_card_config WHERE club_id = p_club_id AND is_active;
  IF v_cap IS NULL THEN RETURN FALSE; END IF;

  IF NOT is_adult_player(p_user_id, p_club_id) THEN RETURN FALSE; END IF;

  -- One member at a time, so two completions together cannot both issue the same card
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT || ':card_task'));

  INSERT INTO scratch_card_task_progress (user_id, club_id, task, reference)
  VALUES (p_user_id, p_club_id, p_task, p_reference)
  ON CONFLICT (user_id, task, reference) DO NOTHING
  RETURNING id INTO v_row;
  IF v_row IS NULL THEN RETURN FALSE; END IF;

  SELECT COUNT(*) INTO v_done FROM scratch_card_task_progress
  WHERE user_id = p_user_id AND club_id = p_club_id AND task = p_task;
  IF v_done % v_every <> 0 THEN RETURN FALSE; END IF;

  SELECT COUNT(*) INTO v_week FROM scratch_cards
  WHERE user_id = p_user_id AND club_id = p_club_id AND source IN ('task', 'game')
    AND created_at >= date_trunc('week', NOW());
  IF v_week >= v_cap THEN RETURN FALSE; END IF;

  INSERT INTO scratch_cards (club_id, user_id, source, scores_spent)
  VALUES (p_club_id, p_user_id, CASE WHEN p_task = 'game' THEN 'game' ELSE 'task' END, 0)
  RETURNING id INTO v_card;

  UPDATE scratch_card_task_progress SET card_id = v_card WHERE id = v_row;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION record_card_task(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_card_task(UUID, UUID, TEXT, TEXT) TO service_role;

-- 5. Triggers. Each one records the completion and never blocks the thing that was completed.
CREATE OR REPLACE FUNCTION card_task_primary_club(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM club_members WHERE user_id = p_user_id AND is_active ORDER BY joined_at LIMIT 1;
$$;

REVOKE ALL ON FUNCTION card_task_primary_club(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION card_task_on_shift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_club UUID;
BEGIN
  BEGIN
    IF NEW.status IN ('checked_in', 'completed')
       AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('checked_in', 'completed')) THEN
      SELECT club_id INTO v_club FROM volunteer_shifts WHERE id = NEW.shift_id;
      PERFORM record_card_task(NEW.user_id, v_club, 'volunteer_shift', NEW.id::TEXT);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS card_task_shift ON volunteer_shift_signups;
CREATE TRIGGER card_task_shift AFTER INSERT OR UPDATE OF status ON volunteer_shift_signups
  FOR EACH ROW EXECUTE FUNCTION card_task_on_shift();

CREATE OR REPLACE FUNCTION card_task_on_lesson()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.passed AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.passed, FALSE)) THEN
      PERFORM record_card_task(NEW.user_id, card_task_primary_club(NEW.user_id), 'academy_lesson', NEW.lesson_id::TEXT);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS card_task_lesson ON academy_progress;
CREATE TRIGGER card_task_lesson AFTER INSERT OR UPDATE OF passed ON academy_progress
  FOR EACH ROW EXECUTE FUNCTION card_task_on_lesson();

CREATE OR REPLACE FUNCTION card_task_on_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- One analysis a day counts, so saving the same clip again and again earns nothing extra
    PERFORM record_card_task(
      NEW.user_id, card_task_primary_club(NEW.user_id), 'video_analysis',
      to_char(NOW() AT TIME ZONE 'Europe/London', 'YYYY-MM-DD')
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

-- analysis_results was created outside these migrations, so only attach if it is there
DO $$
BEGIN
  IF to_regclass('public.analysis_results') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS card_task_analysis ON analysis_results;
    CREATE TRIGGER card_task_analysis AFTER INSERT ON analysis_results
      FOR EACH ROW EXECUTE FUNCTION card_task_on_analysis();
  END IF;
END $$;
