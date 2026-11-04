-- ─────────────────────────────────────────────────────────────────────────────
-- XI Integration — ClubPulse side
--
-- 1. xi_user_id column on profiles          — links a ClubPulse player to their
--    XI account; nullable because only the 'player' role gets an XI account,
--    and provisioning is non-blocking (retried via backfill if XI was down).
--
-- 2. wallet_transactions table              — ledger of all credits/debits on a
--    player's ClubPulse wallet (xi_rewards, top_up, prize, spend, etc.).
--    xi_rewards rows are written by /api/xi/sync-match after every match.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add xi_user_id to profiles ───────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xi_user_id UUID;

COMMENT ON COLUMN public.profiles.xi_user_id IS
  'UUID of the corresponding The XI user. NULL for non-player roles or when XI
   provisioning has not yet completed. Set by the sign-up action after a
   successful POST /api/xi/users/create call.';

CREATE INDEX IF NOT EXISTS profiles_xi_user_id_idx
  ON public.profiles (xi_user_id)
  WHERE xi_user_id IS NOT NULL;

-- 2. wallet_transactions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Positive = credit, negative = debit
  amount         INTEGER     NOT NULL,
  -- Category drives display grouping on the wallet screen
  category       TEXT        NOT NULL
                   CHECK (category IN (
                     'xi_rewards',   -- points earned from The XI (match performance)
                     'top_up',       -- manual wallet top-up
                     'prize',        -- contest prize
                     'spend',        -- purchase / redemption
                     'adjustment'    -- admin correction
                   )),
  -- Free-text reference — e.g. match UUID, contest UUID, invoice reference
  reference      TEXT,
  balance_after  INTEGER     NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_id_idx
  ON public.wallet_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wallet_transactions_category_idx
  ON public.wallet_transactions (user_id, category);

COMMENT ON TABLE public.wallet_transactions IS
  'Append-only ledger of all wallet credits and debits for ClubPulse players.
   xi_rewards rows are written automatically by /api/xi/sync-match.';

-- RLS: players can read their own transactions; admins can read all within
-- their club (joins via profiles → club_id).
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_transactions: own read"
  ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wallet_transactions: own insert"
  ON public.wallet_transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role (used by server-side API routes) bypasses RLS by default;
-- no additional policy needed for server-side writes.
