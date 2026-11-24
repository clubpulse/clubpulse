-- Adult-to-junior contact, parent first. An adult who coaches or runs a club the junior belongs to, and who
-- holds a current enhanced DBS check there, may ask to connect. The junior's verified parent decides first;
-- only then is the junior asked. Like every community_* table: row level security on, no client policies.
-- Nothing here switches anything on: the server also needs COMMUNITY_CROSSBAND_ENABLED=true.

CREATE TABLE IF NOT EXISTS community_guardian_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adult_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  junior_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending_parent'
    CHECK (status IN ('pending_parent','pending_junior','active','declined','withdrawn','ended')),
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  connection_id UUID REFERENCES community_connections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One live request per pair at a time
CREATE UNIQUE INDEX IF NOT EXISTS community_guardian_open_pair
  ON community_guardian_requests (adult_id, junior_id) WHERE status IN ('pending_parent','pending_junior','active');
CREATE INDEX IF NOT EXISTS community_guardian_junior_idx ON community_guardian_requests (junior_id, status);
ALTER TABLE community_guardian_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS community_guardian_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES community_guardian_requests(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL CHECK (event IN ('requested','parent_approved','parent_declined','junior_accepted','junior_declined','withdrawn','ended','thread_read')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_guardian_events_req_idx ON community_guardian_events (request_id);
ALTER TABLE community_guardian_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE community_notifications DROP CONSTRAINT IF EXISTS community_notifications_kind_check;
ALTER TABLE community_notifications ADD CONSTRAINT community_notifications_kind_check
  CHECK (kind IN ('connect_request','connect_accepted','parent_connection','message','guardian_request','guardian_decision'));
