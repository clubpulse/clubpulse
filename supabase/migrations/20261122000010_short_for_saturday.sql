-- "Short for Saturday": a club that needs players for a game posts it, and nearby adults say they can play.
-- Adults only. Like every community_* table: row level security on, no client policies; the server applies the rules.

CREATE TABLE IF NOT EXISTS community_shortages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  play_at TIMESTAMPTZ NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('league','friendly','t20','indoor')),
  need INTEGER NOT NULL CHECK (need BETWEEN 1 AND 6),
  place TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_shortages_open_idx ON community_shortages (status, play_at);
CREATE INDEX IF NOT EXISTS community_shortages_club_idx ON community_shortages (club_id, play_at);
ALTER TABLE community_shortages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS community_shortage_replies (
  shortage_id UUID NOT NULL REFERENCES community_shortages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (shortage_id, user_id)
);
ALTER TABLE community_shortage_replies ENABLE ROW LEVEL SECURITY;

ALTER TABLE community_notifications DROP CONSTRAINT IF EXISTS community_notifications_kind_check;
ALTER TABLE community_notifications ADD CONSTRAINT community_notifications_kind_check
  CHECK (kind IN ('connect_request','connect_accepted','parent_connection','message','guardian_request','guardian_decision','shortage_reply'));
