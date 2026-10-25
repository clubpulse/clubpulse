CREATE TABLE IF NOT EXISTS community_pot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL UNIQUE REFERENCES clubs(id) ON DELETE CASCADE,
  total_scores INTEGER NOT NULL DEFAULT 0,
  total_contributors INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pot_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  scores_contributed INTEGER NOT NULL CHECK (scores_contributed > 0),
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pot_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  scores_requested INTEGER NOT NULL CHECK (scores_requested > 0),
  status TEXT NOT NULL DEFAULT 'voting' CHECK (status IN ('voting','approved','rejected','funded','cancelled')),
  votes_for INTEGER NOT NULL DEFAULT 0,
  votes_against INTEGER NOT NULL DEFAULT 0,
  voting_ends_at TIMESTAMPTZ NOT NULL,
  funded_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pot_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES pot_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('for','against')),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(proposal_id, user_id)
);

ALTER TABLE community_pot ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_pot: member read" ON community_pot;
CREATE POLICY "community_pot: member read" ON community_pot FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = community_pot.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "pot_contributions: own read" ON pot_contributions;
CREATE POLICY "pot_contributions: own read" ON pot_contributions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "pot_contributions: admin read" ON pot_contributions;
CREATE POLICY "pot_contributions: admin read" ON pot_contributions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = pot_contributions.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "pot_proposals: member read" ON pot_proposals;
CREATE POLICY "pot_proposals: member read" ON pot_proposals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = pot_proposals.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "pot_proposals: admin write" ON pot_proposals;
CREATE POLICY "pot_proposals: admin write" ON pot_proposals FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = pot_proposals.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = pot_proposals.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

DROP POLICY IF EXISTS "pot_votes: member read" ON pot_votes;
CREATE POLICY "pot_votes: member read" ON pot_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM pot_proposals pp, club_members cm WHERE pp.id = pot_votes.proposal_id AND cm.club_id = pp.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "pot_votes: own write" ON pot_votes;
CREATE POLICY "pot_votes: own write" ON pot_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Contribute Scores to the Pot
CREATE OR REPLACE FUNCTION contribute_to_pot(p_club_id UUID, p_scores INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flexi INTEGER;
BEGIN
  IF p_scores < 50 THEN RETURN jsonb_build_object('ok', false, 'error', 'minimum_50_scores'); END IF;
  SELECT flexi_balance INTO v_flexi FROM creds_wallet WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_flexi < p_scores THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_scores', 'balance', COALESCE(v_flexi, 0));
  END IF;
  UPDATE creds_wallet SET flexi_balance = flexi_balance - p_scores, updated_at = NOW() WHERE user_id = auth.uid();
  INSERT INTO pot_contributions (user_id, club_id, scores_contributed) VALUES (auth.uid(), p_club_id, p_scores);
  INSERT INTO community_pot (club_id, total_scores, total_contributors) VALUES (p_club_id, p_scores, 1)
  ON CONFLICT (club_id) DO UPDATE SET total_scores = community_pot.total_scores + p_scores,
    total_contributors = (SELECT COUNT(DISTINCT user_id) FROM pot_contributions WHERE club_id = p_club_id),
    updated_at = NOW();
  RETURN jsonb_build_object('ok', true, 'scores_contributed', p_scores);
END;
$$;
GRANT EXECUTE ON FUNCTION contribute_to_pot(UUID, INTEGER) TO authenticated;

-- Vote on a proposal
CREATE OR REPLACE FUNCTION vote_on_proposal(p_proposal_id UUID, p_vote TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_proposal pot_proposals%ROWTYPE;
BEGIN
  IF p_vote NOT IN ('for','against') THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_vote'); END IF;
  SELECT * INTO v_proposal FROM pot_proposals WHERE id = p_proposal_id;
  IF NOT FOUND OR v_proposal.status != 'voting' OR v_proposal.voting_ends_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'voting_closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = v_proposal.club_id AND user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_a_member');
  END IF;
  INSERT INTO pot_votes (proposal_id, user_id, vote) VALUES (p_proposal_id, auth.uid(), p_vote)
  ON CONFLICT (proposal_id, user_id) DO UPDATE SET vote = p_vote, voted_at = NOW();
  UPDATE pot_proposals SET
    votes_for = (SELECT COUNT(*) FROM pot_votes WHERE proposal_id = p_proposal_id AND vote = 'for'),
    votes_against = (SELECT COUNT(*) FROM pot_votes WHERE proposal_id = p_proposal_id AND vote = 'against')
  WHERE id = p_proposal_id;
  RETURN jsonb_build_object('ok', true, 'vote', p_vote);
END;
$$;
GRANT EXECUTE ON FUNCTION vote_on_proposal(UUID, TEXT) TO authenticated;
