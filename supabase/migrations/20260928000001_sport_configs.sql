-- =============================================================
-- ClubPulse: Sport-Agnostic Schema Migration
-- =============================================================

CREATE TABLE IF NOT EXISTS sport_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  icon_emoji      TEXT NOT NULL DEFAULT '🏅',
  earning_rules   JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_id        UUID NOT NULL REFERENCES sport_configs(id),
  category        TEXT NOT NULL CHECK (category IN ('performance','participation','volunteering','organisation')),
  data            JSONB NOT NULL DEFAULT '{}',
  creds_earned    INTEGER NOT NULL DEFAULT 0,
  source          TEXT NOT NULL DEFAULT 'manual',
  source_event_id TEXT,
  performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source, source_event_id)
);

CREATE INDEX IF NOT EXISTS performances_user_id_idx  ON performances(user_id);
CREATE INDEX IF NOT EXISTS performances_sport_id_idx ON performances(sport_id);
CREATE INDEX IF NOT EXISTS performances_performed_at_idx ON performances(performed_at DESC);

CREATE TABLE IF NOT EXISTS steps_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date         DATE NOT NULL,
  step_count       INTEGER NOT NULL DEFAULT 0,
  creds_earned     INTEGER NOT NULL DEFAULT 0,
  streak_day       INTEGER NOT NULL DEFAULT 0,
  streak_protected BOOLEAN NOT NULL DEFAULT FALSE,
  source           TEXT NOT NULL DEFAULT 'apple_health',
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS steps_log_user_date_idx ON steps_log(user_id, log_date DESC);

ALTER TABLE sport_configs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE performances   ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps_log      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sport_configs: read by authenticated" ON sport_configs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "performances: own rows" ON performances FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "steps_log: own rows" ON steps_log FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
CREATE TRIGGER sport_configs_updated_at BEFORE UPDATE ON sport_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO sport_configs (name, display_name, icon_emoji, earning_rules) VALUES ('cricket','Cricket','🏏','{"performance":{"run":1,"boundary":2,"six":4,"wicket":5,"catch":3,"stumping":4,"runout":3,"fifty":20,"century":50,"five_fer":30,"man_of_match":25},"participation":{"match_played":10,"training_attended":5,"net_session":3},"volunteering":{"scorer":15,"umpire":20,"groundskeeper":25,"tea_duty":10,"first_aid":20},"organisation":{"committee_session":30,"fixture_booked":10,"club_registration":50}}') ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, earning_rules=EXCLUDED.earning_rules;

INSERT INTO sport_configs (name, display_name, icon_emoji, is_active, earning_rules) VALUES ('parkrun','Parkrun / Running','🏃',FALSE,'{"performance":{"km_run":1,"parkrun_pb":50,"sub_25_5k":30,"sub_20_5k":60},"participation":{"run_completed":10,"volunteered":15,"50_runs_badge":100},"volunteering":{"marshal":15,"timekeeper":15,"tail_walker":10},"organisation":{"event_director":40}}') ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, is_active=EXCLUDED.is_active, earning_rules=EXCLUDED.earning_rules;
