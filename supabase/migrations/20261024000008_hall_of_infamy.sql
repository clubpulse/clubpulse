CREATE TABLE IF NOT EXISTS infamy_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- e.g. "The Butterfingers Award", "Golden Duck King"
  description TEXT,
  emoji TEXT NOT NULL DEFAULT '🏆',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS infamy_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES infamy_categories(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  nominated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nominator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,  -- "Dropped three catches in one over"
  season INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, nominator_user_id, nominated_user_id, season)  -- one nomination per person per category per season
);

CREATE TABLE IF NOT EXISTS infamy_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id UUID NOT NULL REFERENCES infamy_nominations(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  season INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(nomination_id, voter_user_id)  -- one vote per nomination per member
);

CREATE TABLE IF NOT EXISTS infamy_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES infamy_categories(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  winner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, season)
);

-- Indexes
CREATE INDEX IF NOT EXISTS infamy_categories_club_idx ON infamy_categories(club_id, is_active);
CREATE INDEX IF NOT EXISTS infamy_nominations_category_idx ON infamy_nominations(category_id, season);
CREATE INDEX IF NOT EXISTS infamy_votes_nomination_idx ON infamy_votes(nomination_id);
CREATE INDEX IF NOT EXISTS infamy_winners_club_idx ON infamy_winners(club_id, season DESC);

-- RLS
ALTER TABLE infamy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE infamy_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE infamy_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE infamy_winners ENABLE ROW LEVEL SECURITY;

-- Categories: club members can read, admins can create
DROP POLICY IF EXISTS "infamy_categories: member read" ON infamy_categories;
CREATE POLICY "infamy_categories: member read" ON infamy_categories
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = infamy_categories.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "infamy_categories: admin write" ON infamy_categories;
CREATE POLICY "infamy_categories: admin write" ON infamy_categories
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = infamy_categories.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));

-- Nominations: members can read and write their own
DROP POLICY IF EXISTS "infamy_nominations: member read" ON infamy_nominations;
CREATE POLICY "infamy_nominations: member read" ON infamy_nominations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = infamy_nominations.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "infamy_nominations: member nominate" ON infamy_nominations;
CREATE POLICY "infamy_nominations: member nominate" ON infamy_nominations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = nominator_user_id AND EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = infamy_nominations.club_id AND cm.user_id = auth.uid()));

-- Votes: members can read and insert their own
DROP POLICY IF EXISTS "infamy_votes: member read" ON infamy_votes;
CREATE POLICY "infamy_votes: member read" ON infamy_votes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = infamy_votes.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "infamy_votes: member vote" ON infamy_votes;
CREATE POLICY "infamy_votes: member vote" ON infamy_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = voter_user_id AND EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = infamy_votes.club_id AND cm.user_id = auth.uid()));

-- Winners: all authenticated can read
DROP POLICY IF EXISTS "infamy_winners: read" ON infamy_winners;
CREATE POLICY "infamy_winners: read" ON infamy_winners
  FOR SELECT TO authenticated USING (TRUE);

-- Helper function admins can call to seed defaults for their club
CREATE OR REPLACE FUNCTION seed_infamy_categories(p_club_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = p_club_id AND user_id = auth.uid() AND role IN ('admin','coach')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO infamy_categories (club_id, name, description, emoji, created_by) VALUES
    (p_club_id, 'The Butterfingers Award', 'Most catches dropped in a season', '🧈', auth.uid()),
    (p_club_id, 'Golden Duck King', 'Most golden ducks (out for 0 off first ball)', '🦆', auth.uid()),
    (p_club_id, 'Wide Ball Wizard', 'Most wides bowled in a season', '🪄', auth.uid()),
    (p_club_id, 'The Runout King', 'Most run-outs caused (own team)', '💀', auth.uid()),
    (p_club_id, 'Last Man Standing', 'Always the one holding everyone up after the game', '⏰', auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION seed_infamy_categories(UUID) TO authenticated;
