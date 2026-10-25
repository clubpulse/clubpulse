CREATE TYPE IF NOT EXISTS finance_entry_type AS ENUM ('income','expense');

CREATE TABLE IF NOT EXISTS finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  entry_type finance_entry_type NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_pence INTEGER NOT NULL CHECK (amount_pence > 0),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES auth.users(id),
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS finance_entries_club_date_idx ON finance_entries(club_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS finance_entries_type_idx ON finance_entries(club_id, entry_type, entry_date DESC);

CREATE OR REPLACE VIEW finance_club_summary AS
SELECT
  club_id,
  DATE_TRUNC('month', entry_date)::DATE AS month,
  SUM(CASE WHEN entry_type = 'income' THEN amount_pence ELSE 0 END) AS total_income_pence,
  SUM(CASE WHEN entry_type = 'expense' THEN amount_pence ELSE 0 END) AS total_expense_pence,
  SUM(CASE WHEN entry_type = 'income' THEN amount_pence ELSE -amount_pence END) AS net_pence,
  COUNT(*) AS entry_count
FROM finance_entries
GROUP BY club_id, DATE_TRUNC('month', entry_date)::DATE;

ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_entries: member read" ON finance_entries;
CREATE POLICY "finance_entries: member read" ON finance_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = finance_entries.club_id AND cm.user_id = auth.uid()));

DROP POLICY IF EXISTS "finance_entries: admin write" ON finance_entries;
CREATE POLICY "finance_entries: admin write" ON finance_entries FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = finance_entries.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = finance_entries.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));
