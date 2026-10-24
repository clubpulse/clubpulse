-- Cricket CV profile: player controls what's public
CREATE TABLE IF NOT EXISTS cricket_cv_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Public sharing
  share_slug TEXT UNIQUE,  -- URL-friendly slug e.g. "ishwar-suresh-cricket"
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  -- Player-editable fields
  display_name TEXT,
  tagline TEXT,  -- "Opening batsman | ECB Level 2 Coach"
  avatar_url TEXT,
  date_of_birth_year INTEGER,  -- year only for privacy
  batting_style TEXT CHECK (batting_style IN ('right_hand','left_hand')),
  bowling_style TEXT CHECK (bowling_style IN ('right_arm_fast','right_arm_medium','right_arm_off_spin','right_arm_leg_spin','left_arm_fast','left_arm_medium','left_arm_orthodox','left_arm_chinaman','does_not_bowl')),
  primary_role TEXT CHECK (primary_role IN ('batsman','bowler','allrounder','wicketkeeper','wicketkeeper_batsman','coach','umpire')),
  highest_level TEXT,  -- "County 2nd XI", "Premier League", "Club Cricket"
  years_playing INTEGER,
  clubs_played_for TEXT,  -- free text list of previous clubs
  personal_statement TEXT,  -- up to 500 chars
  -- Visibility toggles
  show_badges BOOLEAN NOT NULL DEFAULT TRUE,
  show_qualifications BOOLEAN NOT NULL DEFAULT TRUE,
  show_scores_balance BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Season stats: player manually enters or admin confirms
CREATE TABLE IF NOT EXISTS cv_season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,  -- year e.g. 2026
  club_name TEXT NOT NULL,
  matches_played INTEGER DEFAULT 0,
  runs_scored INTEGER DEFAULT 0,
  wickets_taken INTEGER DEFAULT 0,
  catches INTEGER DEFAULT 0,
  stumpings INTEGER DEFAULT 0,
  batting_average NUMERIC(6,2),
  bowling_average NUMERIC(6,2),
  highest_score INTEGER,
  best_bowling TEXT,  -- "5/23"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, season, club_name)
);

ALTER TABLE cricket_cv_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_season_stats ENABLE ROW LEVEL SECURITY;

-- Own read/write
DROP POLICY IF EXISTS "cricket_cv_profiles: own" ON cricket_cv_profiles;
CREATE POLICY "cricket_cv_profiles: own" ON cricket_cv_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public read if is_public
DROP POLICY IF EXISTS "cricket_cv_profiles: public read" ON cricket_cv_profiles;
CREATE POLICY "cricket_cv_profiles: public read" ON cricket_cv_profiles FOR SELECT TO anon, authenticated USING (is_public = TRUE);

DROP POLICY IF EXISTS "cv_season_stats: own" ON cv_season_stats;
CREATE POLICY "cv_season_stats: own" ON cv_season_stats FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cv_season_stats: public read" ON cv_season_stats;
CREATE POLICY "cv_season_stats: public read" ON cv_season_stats FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM cricket_cv_profiles p WHERE p.user_id = cv_season_stats.user_id AND p.is_public = TRUE));

-- Generate or update share slug
CREATE OR REPLACE FUNCTION generate_cv_slug(p_display_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_base TEXT;
  v_slug TEXT;
  v_counter INTEGER := 0;
BEGIN
  v_base := LOWER(REGEXP_REPLACE(TRIM(p_display_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := REGEXP_REPLACE(v_base, '^-+|-+$', '', 'g');
  v_slug := v_base || '-cricket';
  WHILE EXISTS (SELECT 1 FROM cricket_cv_profiles WHERE share_slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug := v_base || '-cricket-' || v_counter;
  END LOOP;
  RETURN v_slug;
END;
$$;
