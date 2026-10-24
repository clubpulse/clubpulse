CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,  -- e.g. 'first-match', 'centurion', 'top-scorer'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('performance','engagement','social','milestone','seasonal')),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','rare','epic','legendary')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  awarded_reason TEXT,  -- optional context "Scored 100+ Scores in November"
  UNIQUE(user_id, badge_id, season)
);

CREATE INDEX IF NOT EXISTS player_badges_user_idx ON player_badges(user_id, awarded_at DESC);
CREATE INDEX IF NOT EXISTS player_badges_badge_idx ON player_badges(badge_id, season);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges: read all authenticated" ON badges;
CREATE POLICY "badges: read all authenticated" ON badges FOR SELECT TO authenticated USING (is_active);

DROP POLICY IF EXISTS "player_badges: read all authenticated" ON player_badges;
CREATE POLICY "player_badges: read all authenticated" ON player_badges FOR SELECT TO authenticated USING (TRUE);

-- Seed default badges
INSERT INTO badges (slug, name, description, emoji, category, rarity) VALUES
  ('first-match', 'First XI', 'Logged your first match performance', '🏏', 'milestone', 'common'),
  ('century-scores', 'Ton Up', 'Earned 100 ClubPulse Scores', '💯', 'milestone', 'common'),
  ('five-hundred-scores', 'High Roller', 'Earned 500 ClubPulse Scores', '🎰', 'milestone', 'rare'),
  ('thousand-scores', 'Scores Lord', 'Earned 1,000 ClubPulse Scores', '👑', 'milestone', 'epic'),
  ('availability-hero', 'Always Available', 'Responded to 10 availability requests', '✅', 'engagement', 'common'),
  ('gut-feeling-streak', 'Crystal Ball', '3 correct gut predictions in a row', '🔮', 'performance', 'rare'),
  ('mentor-first', 'First Lesson', 'Completed your first mentoring session', '🎓', 'social', 'common'),
  ('mentor-veteran', 'Coach of the Year', 'Completed 10+ mentoring sessions', '🏆', 'social', 'epic'),
  ('perfect-pitch', 'Pitch Whisperer', '5 correct pitch predictions', '🌀', 'performance', 'rare'),
  ('hall-of-infamy', 'Hall of Infamy', 'Won (lost?) a Hall of Infamy category', '😈', 'social', 'rare'),
  ('dressing-room-chatter', 'Chatterbox', 'Posted 20 messages in the Dressing Room', '💬', 'engagement', 'common'),
  ('top-scorer-monthly', 'Top Scorer', 'Top of the club Scores leaderboard for a month', '🥇', 'seasonal', 'epic'),
  ('clean-sweep', 'Clean Sweep', 'Correct gut feeling AND pitch prediction in same match', '🧹', 'performance', 'legendary'),
  ('waitlist-og', 'OG', 'First 10 to join a waiting list', '🏅', 'milestone', 'rare'),
  ('injury-free', 'Iron Man', 'Whole season with no injury logged', '💪', 'milestone', 'rare')
ON CONFLICT (slug) DO NOTHING;

-- Award a badge to a user (called from server actions with service-role-equivalent check)
CREATE OR REPLACE FUNCTION award_badge(p_user_id UUID, p_badge_slug TEXT, p_club_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge badges%ROWTYPE;
  v_season INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
  SELECT * INTO v_badge FROM badges WHERE slug = p_badge_slug AND is_active = TRUE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'badge_not_found'); END IF;

  INSERT INTO player_badges (user_id, badge_id, club_id, season, awarded_reason)
  VALUES (p_user_id, v_badge.id, p_club_id, v_season, p_reason)
  ON CONFLICT (user_id, badge_id, season) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'badge', v_badge.name);
END;
$$;

GRANT EXECUTE ON FUNCTION award_badge(UUID, TEXT, UUID, TEXT) TO authenticated;

-- Leaderboard view: top Scores per club (current season based on wallet balance)
CREATE OR REPLACE VIEW club_scores_leaderboard AS
SELECT
  cm.club_id,
  cm.user_id,
  p.full_name,
  p.avatar_url,
  COALESCE(cw.flexi_balance, 0) + COALESCE(cw.reward_balance, 0) AS total_scores,
  COALESCE(cw.flexi_balance, 0) AS flexi_balance,
  ROW_NUMBER() OVER (PARTITION BY cm.club_id ORDER BY (COALESCE(cw.flexi_balance,0)+COALESCE(cw.reward_balance,0)) DESC) AS rank
FROM club_members cm
JOIN profiles p ON p.id = cm.user_id
LEFT JOIN creds_wallet cw ON cw.user_id = cm.user_id
WHERE cm.club_id IS NOT NULL;
