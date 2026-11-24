-- Cricket Connect: filters on the profile, in-app notifications, and an audit trail of connection events.
-- Like every community_* table: row level security on, no client policies. The server reads and writes
-- with the service role and applies the rules in code. Nothing here switches the Community on.

ALTER TABLE community_profiles
  ADD COLUMN IF NOT EXISTS standard TEXT CHECK (standard IN ('social','club','league','county')),
  ADD COLUMN IF NOT EXISTS availability TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS community_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('connect_request','connect_accepted','parent_connection','message')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_notifications_user_idx ON community_notifications (user_id, created_at DESC);
ALTER TABLE community_notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS community_connection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES community_connections(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('requested','accepted','declined','passed','parent_notified')),
  both_junior BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_connection_events_actor_idx ON community_connection_events (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_connection_events_conn_idx ON community_connection_events (connection_id);
ALTER TABLE community_connection_events ENABLE ROW LEVEL SECURITY;
