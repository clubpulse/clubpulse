CREATE TABLE IF NOT EXISTS creds_wallet (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  flexi_balance    INTEGER NOT NULL DEFAULT 0,
  reward_balance   INTEGER NOT NULL DEFAULT 0,
  lifetime_earned  INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creds_wallet ENABLE ROW LEVEL SECURITY;

-- Read-only for users. Balances change only through increment_creds_balance (service role).
DROP POLICY IF EXISTS "creds_wallet: own row" ON creds_wallet;
DROP POLICY IF EXISTS "creds_wallet: own row read" ON creds_wallet;
CREATE POLICY "creds_wallet: own row read" ON creds_wallet FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION create_wallet_for_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO creds_wallet (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_wallet_for_user();

CREATE OR REPLACE FUNCTION increment_creds_balance(p_user_id UUID, p_amount INTEGER) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO creds_wallet (user_id, flexi_balance, lifetime_earned) VALUES (p_user_id, GREATEST(0, p_amount), GREATEST(0, p_amount)) ON CONFLICT (user_id) DO UPDATE SET flexi_balance = GREATEST(0, creds_wallet.flexi_balance + p_amount), lifetime_earned = creds_wallet.lifetime_earned + GREATEST(0, p_amount), updated_at = NOW(); END; $$;

-- Functions are executable by PUBLIC by default; without this any signed-in user could call the RPC with any user_id/amount.
REVOKE ALL ON FUNCTION increment_creds_balance(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_creds_balance(UUID, INTEGER) TO service_role;
