-- Platform admin role for the /admin dashboard, plus the tables and stats it reads.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Users can update their own profile row (name edits), so without this anyone could make
-- themselves admin from the browser. Only the service role (or the SQL editor) may set role.
CREATE OR REPLACE FUNCTION protect_profile_role() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF COALESCE(auth.role(), '') IN ('anon', 'authenticated')
     AND ((TG_OP = 'INSERT' AND NEW.role <> 'user')
       OR (TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role)) THEN
    RAISE EXCEPTION 'profiles.role can only be changed by an admin' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_role ON profiles;
CREATE TRIGGER profiles_protect_role BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_role();

UPDATE profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'ishwar.suresh98@gmail.com');

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_name  TEXT,
  retailer      TEXT,
  url           TEXT,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS affiliate_clicks_clicked_idx ON affiliate_clicks(clicked_at DESC);

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Click tracking from the app logs the signed-in user's own clicks; reading is admin-only (service role)
DROP POLICY IF EXISTS "affiliate_clicks: insert own" ON affiliate_clicks;
CREATE POLICY "affiliate_clicks: insert own" ON affiliate_clicks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Dashboard totals in one round trip (PostgREST can't SUM). Service role only.
CREATE OR REPLACE FUNCTION admin_stats()
RETURNS TABLE (
  users                  BIGINT,
  highlight_sessions     BIGINT,
  highlight_clips        BIGINT,
  points_issued          BIGINT,
  points_in_circulation  BIGINT,
  marketplace_clicks     BIGINT
)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM highlights),
    (SELECT COALESCE(SUM(jsonb_array_length(clips)), 0) FROM highlights),
    (SELECT COALESCE(SUM(lifetime_earned), 0) FROM creds_wallet),
    (SELECT COALESCE(SUM(flexi_balance + reward_balance), 0) FROM creds_wallet),
    (SELECT COUNT(*) FROM affiliate_clicks);
$$;

REVOKE ALL ON FUNCTION admin_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_stats() TO service_role;
