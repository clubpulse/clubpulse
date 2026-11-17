-- Auction Room: a daily skill game in the mobile app. The player bids a pretend budget against
-- three computer-run franchises to build a five-player squad, and is paid Scores for where the
-- squad finishes. No Scores are staked; the budget exists only inside the game.

-- 1. The club-adjustable rule. Paid 3x for 1st place, 2x for 2nd, 1x for 3rd, nothing for 4th.
INSERT INTO scores_rules (source, label, description, category, default_amount, counts_to_cap, sort_order) VALUES
  ('game_auction', 'Auction Room', 'Base value. Paid 3x for finishing 1st of four franchises, 2x for 2nd, 1x for 3rd. One paid game a day.', 'games', 5, TRUE, 75)
ON CONFLICT (source) DO NOTHING;

-- 2. Let game_plays record it. state holds the seed and the number of starts used today.
ALTER TABLE game_plays DROP CONSTRAINT IF EXISTS game_plays_game_check;
ALTER TABLE game_plays ADD CONSTRAINT game_plays_game_check
  CHECK (game IN ('spin', 'quiz', 'timing', 'hilo', 'auction'));
