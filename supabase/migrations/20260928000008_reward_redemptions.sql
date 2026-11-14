-- reward_id gets its foreign key to rewards_catalogue in migration 10 (that table doesn't exist yet).
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id        UUID NOT NULL,
  creds_spent      INTEGER NOT NULL CHECK (creds_spent >= 0),
  redeemed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','cancelled','refunded')),
  fulfilment_data  JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS reward_redemptions_user_idx ON reward_redemptions(user_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS reward_redemptions_reward_idx ON reward_redemptions(reward_id);

ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Read-only for users. Rows are created only by redeem_reward() (migration 10) so a client
-- can't fabricate or edit a redemption.
DROP POLICY IF EXISTS "reward_redemptions: own rows" ON reward_redemptions;
CREATE POLICY "reward_redemptions: own rows" ON reward_redemptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
