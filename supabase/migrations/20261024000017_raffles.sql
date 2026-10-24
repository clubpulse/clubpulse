CREATE TABLE IF NOT EXISTS raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  prize_description TEXT NOT NULL,
  prize_image_url TEXT,
  ticket_cost_scores INTEGER NOT NULL CHECK (ticket_cost_scores > 0),
  max_tickets_per_player INTEGER NOT NULL DEFAULT 10,
  total_tickets_available INTEGER,
  winner_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','drawn','cancelled')),
  draw_date TIMESTAMPTZ,
  drawn_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS raffle_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  ticket_number INTEGER NOT NULL,
  scores_spent INTEGER NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_winner BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS raffle_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES raffle_tickets(id) ON DELETE CASCADE,
  prize_rank INTEGER NOT NULL DEFAULT 1,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS raffle_tickets_raffle_idx ON raffle_tickets(raffle_id);
CREATE INDEX IF NOT EXISTS raffle_tickets_user_idx ON raffle_tickets(user_id, raffle_id);
CREATE UNIQUE INDEX IF NOT EXISTS raffle_tickets_number_idx ON raffle_tickets(raffle_id, ticket_number);
ALTER TABLE raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "raffles: member read" ON raffles;
CREATE POLICY "raffles: member read" ON raffles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = raffles.club_id AND cm.user_id = auth.uid()));
DROP POLICY IF EXISTS "raffles: admin write" ON raffles;
CREATE POLICY "raffles: admin write" ON raffles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = raffles.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')))
  WITH CHECK (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = raffles.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));
DROP POLICY IF EXISTS "raffle_tickets: own read" ON raffle_tickets;
CREATE POLICY "raffle_tickets: own read" ON raffle_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "raffle_tickets: admin read" ON raffle_tickets;
CREATE POLICY "raffle_tickets: admin read" ON raffle_tickets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members cm WHERE cm.club_id = raffle_tickets.club_id AND cm.user_id = auth.uid() AND cm.role IN ('admin','coach')));
DROP POLICY IF EXISTS "raffle_winners: club read" ON raffle_winners;
CREATE POLICY "raffle_winners: club read" ON raffle_winners FOR SELECT TO authenticated USING (TRUE);
CREATE OR REPLACE FUNCTION buy_raffle_tickets(p_raffle_id UUID, p_quantity INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_raffle raffles%ROWTYPE; v_existing_tickets INTEGER; v_total_tickets INTEGER;
  v_cost INTEGER; v_flexi INTEGER; v_next_number INTEGER; i INTEGER;
BEGIN
  SELECT * INTO v_raffle FROM raffles WHERE id = p_raffle_id FOR UPDATE;
  IF NOT FOUND OR v_raffle.status != 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'raffle_not_active'); END IF;
  IF p_quantity < 1 OR p_quantity > 20 THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_quantity'); END IF;
  SELECT COUNT(*) INTO v_existing_tickets FROM raffle_tickets WHERE raffle_id = p_raffle_id AND user_id = auth.uid();
  IF v_existing_tickets + p_quantity > v_raffle.max_tickets_per_player THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ticket_limit_exceeded', 'max', v_raffle.max_tickets_per_player, 'current', v_existing_tickets);
  END IF;
  IF v_raffle.total_tickets_available IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_tickets FROM raffle_tickets WHERE raffle_id = p_raffle_id;
    IF v_total_tickets + p_quantity > v_raffle.total_tickets_available THEN
      RETURN jsonb_build_object('ok', false, 'error', 'sold_out', 'remaining', v_raffle.total_tickets_available - v_total_tickets);
    END IF;
  END IF;
  v_cost := v_raffle.ticket_cost_scores * p_quantity;
  SELECT flexi_balance INTO v_flexi FROM creds_wallet WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR v_flexi < v_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_scores', 'cost', v_cost, 'balance', COALESCE(v_flexi, 0));
  END IF;
  UPDATE creds_wallet SET flexi_balance = flexi_balance - v_cost, updated_at = NOW() WHERE user_id = auth.uid();
  SELECT COALESCE(MAX(ticket_number), 0) INTO v_next_number FROM raffle_tickets WHERE raffle_id = p_raffle_id;
  FOR i IN 1..p_quantity LOOP
    INSERT INTO raffle_tickets (raffle_id, user_id, club_id, ticket_number, scores_spent)
    VALUES (p_raffle_id, auth.uid(), v_raffle.club_id, v_next_number + i, v_raffle.ticket_cost_scores);
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'tickets_purchased', p_quantity, 'scores_spent', v_cost,
    'ticket_numbers', (SELECT array_agg(ticket_number) FROM raffle_tickets WHERE raffle_id = p_raffle_id AND user_id = auth.uid() AND ticket_number > v_next_number));
END; $$;
GRANT EXECUTE ON FUNCTION buy_raffle_tickets(UUID, INTEGER) TO authenticated;
CREATE OR REPLACE FUNCTION draw_raffle(p_raffle_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_raffle raffles%ROWTYPE; v_winner_ticket raffle_tickets%ROWTYPE;
  i INTEGER; v_winners JSONB := '[]'::JSONB;
BEGIN
  SELECT * INTO v_raffle FROM raffles WHERE id = p_raffle_id FOR UPDATE;
  IF NOT FOUND OR v_raffle.status != 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'raffle_not_active'); END IF;
  IF NOT EXISTS (SELECT 1 FROM club_members WHERE club_id = v_raffle.club_id AND user_id = auth.uid() AND role IN ('admin','coach')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'access_denied');
  END IF;
  FOR i IN 1..v_raffle.winner_count LOOP
    SELECT rt.* INTO v_winner_ticket FROM raffle_tickets rt
    WHERE rt.raffle_id = p_raffle_id AND rt.is_winner = FALSE
      AND NOT EXISTS (SELECT 1 FROM raffle_winners rw WHERE rw.ticket_id = rt.id)
    ORDER BY random() LIMIT 1;
    IF FOUND THEN
      INSERT INTO raffle_winners (raffle_id, user_id, ticket_id, prize_rank)
      VALUES (p_raffle_id, v_winner_ticket.user_id, v_winner_ticket.id, i);
      UPDATE raffle_tickets SET is_winner = TRUE WHERE id = v_winner_ticket.id;
      v_winners := v_winners || jsonb_build_object('rank', i, 'ticket_number', v_winner_ticket.ticket_number, 'user_id', v_winner_ticket.user_id);
    END IF;
  END LOOP;
  UPDATE raffles SET status = 'drawn', drawn_at = NOW() WHERE id = p_raffle_id;
  RETURN jsonb_build_object('ok', true, 'winners', v_winners);
END; $$;
GRANT EXECUTE ON FUNCTION draw_raffle(UUID) TO authenticated;
