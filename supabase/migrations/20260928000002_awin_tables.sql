CREATE TABLE IF NOT EXISTS awin_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  awin_transaction_id TEXT NOT NULL UNIQUE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advertiser_id       TEXT,
  order_ref           TEXT,
  sale_amount_gbp     NUMERIC(10,2),
  commission_gbp      NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'GBP',
  status              TEXT NOT NULL DEFAULT 'pending',
  creds_awarded       INTEGER NOT NULL DEFAULT 0,
  raw_payload         JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS awin_tx_user_idx ON awin_transactions(user_id);
CREATE INDEX IF NOT EXISTS awin_tx_status_idx ON awin_transactions(status);

ALTER TABLE awin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "awin_transactions: own rows" ON awin_transactions;
CREATE POLICY "awin_transactions: own rows" ON awin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
