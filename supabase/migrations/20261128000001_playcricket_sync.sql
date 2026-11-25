-- Play-Cricket club connections and a local cache of fixtures, results and scorecard names.
-- Repo only until it is applied on purpose. The API key never leaves the server.
-- Idempotent. Does not read or call Play-Cricket.

CREATE TABLE IF NOT EXISTS public.playcricket_connections (
  club_id UUID PRIMARY KEY REFERENCES public.clubs(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  key_ciphertext TEXT NOT NULL,
  key_iv TEXT NOT NULL,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.playcricket_matches (
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  play_match_id TEXT NOT NULL,
  season TEXT,
  match_date TEXT,
  match_time TEXT,
  home_team_name TEXT,
  away_team_name TEXT,
  home_team_id TEXT,
  away_team_id TEXT,
  competition_type TEXT,
  status TEXT,
  ground_name TEXT,
  last_updated TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, play_match_id)
);

CREATE TABLE IF NOT EXISTS public.playcricket_results (
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  play_match_id TEXT NOT NULL,
  result_text TEXT,
  home_runs INTEGER,
  home_wickets INTEGER,
  away_runs INTEGER,
  away_wickets INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (club_id, play_match_id)
);

-- Published team-sheet names only. No date of birth, contact details or SHIFTUP account id.
CREATE TABLE IF NOT EXISTS public.playcricket_scorecard_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  play_match_id TEXT NOT NULL,
  team_id TEXT,
  team_name TEXT,
  player_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('bat', 'bowl')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, play_match_id, team_id, player_name, role)
);

-- Club admin links a Play-Cricket name to a SHIFTUP account. Never written by the sync.
CREATE TABLE IF NOT EXISTS public.playcricket_player_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  team_id TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (club_id, player_name, team_id)
);

ALTER TABLE public.playcricket_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playcricket_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playcricket_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playcricket_scorecard_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playcricket_player_links ENABLE ROW LEVEL SECURITY;

-- The key columns are not readable through the API. Admins see status only.
REVOKE ALL ON public.playcricket_connections FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.playcricket_connections TO service_role;

REVOKE ALL ON public.playcricket_matches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.playcricket_results FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.playcricket_scorecard_players FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.playcricket_player_links FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.playcricket_matches TO authenticated, service_role;
GRANT SELECT ON public.playcricket_results TO authenticated, service_role;
GRANT SELECT ON public.playcricket_scorecard_players TO authenticated, service_role;
GRANT SELECT ON public.playcricket_player_links TO authenticated, service_role;
GRANT ALL ON public.playcricket_matches TO service_role;
GRANT ALL ON public.playcricket_results TO service_role;
GRANT ALL ON public.playcricket_scorecard_players TO service_role;
GRANT ALL ON public.playcricket_player_links TO service_role;

DROP POLICY IF EXISTS playcricket_matches_member_read ON public.playcricket_matches;
CREATE POLICY playcricket_matches_member_read ON public.playcricket_matches
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = playcricket_matches.club_id AND cm.user_id = auth.uid() AND cm.is_active
  ));

DROP POLICY IF EXISTS playcricket_results_member_read ON public.playcricket_results;
CREATE POLICY playcricket_results_member_read ON public.playcricket_results
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = playcricket_results.club_id AND cm.user_id = auth.uid() AND cm.is_active
  ));

DROP POLICY IF EXISTS playcricket_scorecard_member_read ON public.playcricket_scorecard_players;
CREATE POLICY playcricket_scorecard_member_read ON public.playcricket_scorecard_players
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = playcricket_scorecard_players.club_id AND cm.user_id = auth.uid() AND cm.is_active
  ));

DROP POLICY IF EXISTS playcricket_links_admin_read ON public.playcricket_player_links;
CREATE POLICY playcricket_links_admin_read ON public.playcricket_player_links
  FOR SELECT TO authenticated
  USING (public.is_club_admin(club_id));

CREATE OR REPLACE VIEW public.playcricket_connection_status
WITH (security_invoker = false, security_barrier = true) AS
SELECT c.club_id, c.site_id, c.connected_at, c.last_sync_at, c.last_error
FROM public.playcricket_connections c
WHERE public.is_club_admin(c.club_id);

REVOKE ALL ON public.playcricket_connection_status FROM PUBLIC, anon;
GRANT SELECT ON public.playcricket_connection_status TO authenticated, service_role;
