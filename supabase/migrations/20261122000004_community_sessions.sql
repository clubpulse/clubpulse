-- Community nets and pick-up games. Like every community_* table: row level security on, no client
-- policies. The server reads and writes with the service role and applies the age-band rules in code.

CREATE TABLE IF NOT EXISTS community_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('nets','pickup')),
  age_band TEXT NOT NULL CHECK (age_band IN ('adult','junior')),
  title TEXT NOT NULL,
  note TEXT,
  place TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 2 AND 30),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','held','cancelled','removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_sessions_open_idx ON community_sessions (status, starts_at);
CREATE INDEX IF NOT EXISTS community_sessions_club_idx ON community_sessions (club_id, starts_at);

CREATE TABLE IF NOT EXISTS community_session_signups (
  session_id UUID NOT NULL REFERENCES community_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);

ALTER TABLE community_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_session_signups ENABLE ROW LEVEL SECURITY;
