-- Moderation log for the Community: every allow / remove / handled decision by ClubPulse staff.
-- Row level security on, no client policies: written and read only by the server (service role).

CREATE TABLE IF NOT EXISTS community_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('allow','remove','handled')),
  kind TEXT NOT NULL CHECK (kind IN ('post','comment','message','profile')),
  target_id UUID NOT NULL,
  report_id UUID REFERENCES community_reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS community_moderation_events_target_idx ON community_moderation_events (kind, target_id);

ALTER TABLE community_moderation_events ENABLE ROW LEVEL SECURITY;
