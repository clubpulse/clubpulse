-- Sessions and "Short for Saturday" games the safety check could not clear are queued for ClubPulse staff instead of
-- being refused, and junior-to-junior connections record when no parent could be told.

ALTER TABLE community_sessions ADD COLUMN IF NOT EXISTS held_reason TEXT;
ALTER TABLE community_shortages ADD COLUMN IF NOT EXISTS held_reason TEXT;

-- 'held' already exists on community_sessions; shortages gain it, and removed
ALTER TABLE community_shortages DROP CONSTRAINT IF EXISTS community_shortages_status_check;
ALTER TABLE community_shortages ADD CONSTRAINT community_shortages_status_check CHECK (status IN ('open','filled','cancelled','held','removed'));

ALTER TABLE community_moderation_events DROP CONSTRAINT IF EXISTS community_moderation_events_kind_check;
ALTER TABLE community_moderation_events ADD CONSTRAINT community_moderation_events_kind_check CHECK (kind IN ('post','comment','message','profile','session','shortage'));

ALTER TABLE community_connection_events DROP CONSTRAINT IF EXISTS community_connection_events_event_check;
ALTER TABLE community_connection_events ADD CONSTRAINT community_connection_events_event_check CHECK (event IN ('requested','accepted','declined','passed','parent_notified','no_parent_to_notify'));

CREATE INDEX IF NOT EXISTS community_sessions_held_idx ON community_sessions (created_at) WHERE status = 'held';
CREATE INDEX IF NOT EXISTS community_shortages_held_idx ON community_shortages (created_at) WHERE status = 'held';
