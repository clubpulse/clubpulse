CREATE TABLE IF NOT EXISTS auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- "2026 Summer Auction"
  season INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','settled')),
  bidding_opens_at TIMESTAMPTZ,
  bidding_closes_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Players listed in an auction (one per member per auction)
CREATE TABLE IF NOT EXISTS auction_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  player_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT,  -- "Opening Batsman", "Left-arm Spinner"
  base_price INTEGER NOT NULL DEFAULT 50,  -- minimum bid in Scores
  current_bid INTEGER,
  current_bidder UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','sold','unsold')),
  UNIQUE(auction_id, player_user_id)
);

-- Bid history
CREATE TABLE IF NOT EXISTS auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,
  bidder_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bid_amount INTEGER NOT NULL CHECK (bid_amount > 0),
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;

-- Auctions: club members read open/closed/settled; admins manage
DROP POLICY IF EXISTS "auctions: member read" ON auctions;
CREATE POLICY "auctions: member read" ON auctions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = auctions.club_id AND cm.user_id = auth.uid()) AND status != 'draft');

DROP POLICY IF EXISTS "auctions: admin all" ON auctions;
CREATE POLICY "auctions: admin all" ON auctions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = auctions.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = auctions.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Lots: visible when auction is not draft
DROP POLICY IF EXISTS "auction_lots: member read" ON auction_lots;
CREATE POLICY "auction_lots: member read" ON auction_lots FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM auctions a, club_members cm WHERE a.id = auction_lots.auction_id AND cm.club_id = a.club_id AND cm.user_id = auth.uid() AND a.status != 'draft'));

DROP POLICY IF EXISTS "auction_lots: admin all" ON auction_lots;
CREATE POLICY "auction_lots: admin all" ON auction_lots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM auctions a, club_members cm WHERE a.id = auction_lots.auction_id AND cm.club_id = a.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM auctions a, club_members cm WHERE a.id = auction_lots.auction_id AND cm.club_id = a.club_id AND cm.user_id = auth.uid() AND cm.role IN ('club_admin','coach')));

-- Bids: own + admin
DROP POLICY IF EXISTS "auction_bids: own read" ON auction_bids;
CREATE POLICY "auction_bids: own read" ON auction_bids FOR SELECT TO authenticated USING (auth.uid() = bidder_user_id);

DROP POLICY IF EXISTS "auction_bids: club read" ON auction_bids;
CREATE POLICY "auction_bids: club read" ON auction_bids FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM auction_lots al, auctions a, club_members cm WHERE al.id = auction_bids.lot_id AND a.id = al.auction_id AND cm.club_id = a.club_id AND cm.user_id = auth.uid()));

-- Place bid: SECURITY DEFINER — checks balance, validates auction is open, updates lot
CREATE OR REPLACE FUNCTION place_auction_bid(p_lot_id UUID, p_bid_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lot auction_lots%ROWTYPE;
  v_auction auctions%ROWTYPE;
  v_wallet_balance INTEGER;
  v_previous_bid INTEGER;
BEGIN
  SELECT * INTO v_lot FROM auction_lots WHERE id = p_lot_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'lot_not_found'); END IF;
  IF v_lot.status != 'available' THEN RETURN jsonb_build_object('ok', false, 'error', 'lot_not_available'); END IF;
  -- Can't bid on yourself
  IF v_lot.player_user_id = auth.uid() THEN RETURN jsonb_build_object('ok', false, 'error', 'cannot_bid_on_self'); END IF;

  SELECT * INTO v_auction FROM auctions WHERE id = v_lot.auction_id;
  IF v_auction.status != 'open' THEN RETURN jsonb_build_object('ok', false, 'error', 'auction_not_open'); END IF;
  IF v_auction.bidding_closes_at IS NOT NULL AND v_auction.bidding_closes_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bidding_closed');
  END IF;

  -- Bid must exceed current bid
  IF p_bid_amount <= COALESCE(v_lot.current_bid, v_lot.base_price - 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bid_too_low', 'minimum', COALESCE(v_lot.current_bid, v_lot.base_price) + 1);
  END IF;

  -- Check balance
  SELECT flexi_balance INTO v_wallet_balance FROM creds_wallet WHERE user_id = auth.uid() FOR UPDATE;
  IF v_wallet_balance < p_bid_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', v_wallet_balance);
  END IF;

  -- Refund previous top bid if same bidder increments
  SELECT bid_amount INTO v_previous_bid FROM auction_bids
    WHERE lot_id = p_lot_id AND bidder_user_id = auth.uid()
    ORDER BY placed_at DESC LIMIT 1;

  -- Reserve the bid amount (deduct from flexi, refund old if outbid by same person)
  UPDATE creds_wallet SET flexi_balance = flexi_balance - p_bid_amount + COALESCE(v_previous_bid, 0), updated_at = NOW()
    WHERE user_id = auth.uid();

  -- Refund previous top bidder if different person
  IF v_lot.current_bidder IS NOT NULL AND v_lot.current_bidder != auth.uid() THEN
    UPDATE creds_wallet SET flexi_balance = flexi_balance + v_lot.current_bid, updated_at = NOW()
      WHERE user_id = v_lot.current_bidder;
  END IF;

  INSERT INTO auction_bids (lot_id, bidder_user_id, bid_amount) VALUES (p_lot_id, auth.uid(), p_bid_amount);

  UPDATE auction_lots SET current_bid = p_bid_amount, current_bidder = auth.uid() WHERE id = p_lot_id;

  RETURN jsonb_build_object('ok', true, 'bid', p_bid_amount, 'lot_id', p_lot_id);
END;
$$;
GRANT EXECUTE ON FUNCTION place_auction_bid(UUID, INTEGER) TO authenticated;
