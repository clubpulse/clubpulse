-- Auction Room: a daily skill game in the mobile app, modelled on a T20 franchise mini-auction.
-- The player bids a pretend ₹50 crore purse against nine computer-run franchises to complete an
-- XI, and is paid Scores for where the squad finishes. No Scores are staked; the purse exists
-- only inside the game.

-- 1. The club-adjustable rule. Paid 5x for 1st of ten, 3x for 2nd, 2x for 3rd, 1x for 4th and 5th.
INSERT INTO scores_rules (source, label, description, category, default_amount, counts_to_cap, sort_order) VALUES
  ('game_auction', 'Auction Room', 'Base value. Paid 5x for finishing 1st of ten franchises, 3x for 2nd, 2x for 3rd, 1x for 4th or 5th. One Scores game a day.', 'games', 5, TRUE, 75)
ON CONFLICT (source) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- 2. Let game_plays record it. state holds the seed and the number of starts used today.
ALTER TABLE game_plays DROP CONSTRAINT IF EXISTS game_plays_game_check;
ALTER TABLE game_plays ADD CONSTRAINT game_plays_game_check
  CHECK (game IN ('spin', 'quiz', 'timing', 'hilo', 'auction'));
