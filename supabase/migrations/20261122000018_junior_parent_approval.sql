-- Junior-to-junior connections now need a verified parent of each child to approve before the connection opens.
-- Replaces "notify the parents afterwards". Service role only, like the rest of the Community tables.

-- A connection between two juniors waits here after both have said yes, until each child has an approving parent.
ALTER TABLE community_connections DROP CONSTRAINT IF EXISTS community_connections_status_check;
ALTER TABLE community_connections ADD CONSTRAINT community_connections_status_check CHECK (status IN ('pending','awaiting_parents','accepted','declined'));

-- One row per parent decision. A connection opens when every junior in it has at least one approving parent; any
-- decline closes it.
CREATE TABLE IF NOT EXISTS community_connection_approvals (
  connection_id UUID NOT NULL REFERENCES community_connections(id) ON DELETE CASCADE,
  junior_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision      TEXT NOT NULL CHECK (decision IN ('approved','declined')),
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (connection_id, parent_id, junior_id)
);
CREATE INDEX IF NOT EXISTS community_connection_approvals_parent_idx ON community_connection_approvals (parent_id);
ALTER TABLE community_connection_approvals ENABLE ROW LEVEL SECURITY;

-- Audit trail: three new kinds of event
ALTER TABLE community_connection_events DROP CONSTRAINT IF EXISTS community_connection_events_event_check;
ALTER TABLE community_connection_events ADD CONSTRAINT community_connection_events_event_check CHECK (event IN (
  'requested','accepted','declined','passed','parent_notified','no_parent_to_notify','sent_to_parents','parent_approved','parent_declined'));

-- A parent is told there is something to approve
ALTER TABLE community_notifications DROP CONSTRAINT IF EXISTS community_notifications_kind_check;
ALTER TABLE community_notifications ADD CONSTRAINT community_notifications_kind_check
  CHECK (kind IN ('connect_request','connect_accepted','parent_connection','message','guardian_request','guardian_decision','shortage_reply','parent_approval_needed'));
