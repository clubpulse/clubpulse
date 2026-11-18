-- A player's own paid plan, bought online by card. Two kinds:
--   individual  a player not covered by a club plan: Pro, Elite or Legend
--   club_addon  a member of a club on a paid plan, adding analysis, coaching and AI sessions
-- One row per player. Written only by the server (checkout and the Stripe webhook).

CREATE TABLE IF NOT EXISTS player_subscriptions (
  user_id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                    TEXT CHECK (plan IN ('pro', 'elite', 'legend')),
  kind                    TEXT CHECK (kind IN ('individual', 'club_addon')),
  -- Stripe's own status word: active, trialing, past_due, canceled, incomplete, ... or 'none'
  status                  TEXT NOT NULL DEFAULT 'none',
  price_pence             INTEGER,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT UNIQUE,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE player_subscriptions ENABLE ROW LEVEL SECURITY;

-- A player can read their own plan. Nobody writes from the browser or the app.
DROP POLICY IF EXISTS "player_subscriptions: read own" ON player_subscriptions;
CREATE POLICY "player_subscriptions: read own" ON player_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
