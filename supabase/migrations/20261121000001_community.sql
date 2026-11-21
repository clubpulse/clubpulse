-- Community: the social side of ClubPulse. Profiles ("cricket CV"), a feed of posts, connecting
-- with other cricketers (both people have to say yes) and private messages between connections.
--
-- Everything written here is checked before anyone else sees it (src/lib/community/moderation.ts).
-- A post, reply or message that fails the check is saved as 'held' so ClubPulse can review it.
--
-- Every table is read and written only by the server, which applies the rules (who may see whom,
-- juniors and adults kept apart in private messages, blocks). So row level security is on with no
-- policies: the app can never read these tables directly.

-- Where a club sits, for "my league" and "my county". Filled in as clubs join.
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS league TEXT;

CREATE TABLE IF NOT EXISTS community_profiles (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  headline      TEXT,                              -- "Top-order bat, off spin"
  about         TEXT,
  looking_for   TEXT[] NOT NULL DEFAULT '{}',      -- net_partner | club | coach | teammates
  open_to_club  BOOLEAN NOT NULL DEFAULT FALSE,    -- shown to everyone
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id       UUID REFERENCES clubs(id) ON DELETE SET NULL,   -- the author's club when posted
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','held','removed')),
  held_reason   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_posts_feed_idx ON community_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_club_idx ON community_posts (club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_author_idx ON community_posts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_post_likes (
  post_id       UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','held','removed')),
  held_reason   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_comments_post_idx ON community_comments (post_id, created_at);

-- One row per pair. 'pending' until the other person answers; 'accepted' opens messaging.
CREATE TABLE IF NOT EXISTS community_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at  TIMESTAMPTZ,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
CREATE INDEX IF NOT EXISTS community_connections_addressee_idx ON community_connections (addressee_id, status);

-- "Not now" on someone's card: they are not shown again.
CREATE TABLE IF NOT EXISTS community_passes (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, other_id)
);

CREATE TABLE IF NOT EXISTS community_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES community_connections(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','held','removed')),
  held_reason   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_messages_thread_idx ON community_messages (connection_id, created_at);

CREATE TABLE IF NOT EXISTS community_blocks (
  blocker_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Reports from members. Reviewed by ClubPulse only.
CREATE TABLE IF NOT EXISTS community_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('post','comment','message','profile')),
  target_id     UUID NOT NULL,
  reason        TEXT,
  handled       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS community_reports_open_idx ON community_reports (handled, created_at DESC);

ALTER TABLE community_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_likes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_passes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_blocks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports     ENABLE ROW LEVEL SECURITY;
