-- Four new games in the app, all free to play and all decided by knowledge or choices:
--   umpire     Umpire's Call: five decisions under the Laws
--   whoami     Who Am I?: three cricketers from clues
--   scorecard  Scorecard Detective: five scorecards with a number missing
--   manager    Season Manager: pick an eleven for eight matches, one a day
-- No Scores are staked in any of them. Safe to run more than once.

-- 1. Club-adjustable rules
INSERT INTO scores_rules (source, label, description, category, default_amount, counts_to_cap, sort_order) VALUES
  ('game_umpire',    'Umpire''s Call',       'Paid for each right decision. Five a day.',                                         'games', 2, TRUE, 76),
  ('game_scorecard', 'Scorecard Detective',  'Paid for each scorecard solved. Five a day.',                                       'games', 2, TRUE, 77),
  ('game_whoami',    'Who Am I?',            'Paid per point. A player named from the first clue is 4 points, from the last 1.',  'games', 1, TRUE, 78),
  ('game_manager',   'Season Manager',       'Paid for each match won. Finishing 1st, 2nd or 3rd in the league pays 5x, 3x, 2x.', 'games', 5, TRUE, 79)
ON CONFLICT (source) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;

-- 2. Let game_plays record them. For the three daily games there is one row a day. For Season
--    Manager there is one row a season, dated the day it began; state holds the seed and every
--    team selection, and the server replays them to rebuild the season.
ALTER TABLE game_plays DROP CONSTRAINT IF EXISTS game_plays_game_check;
ALTER TABLE game_plays ADD CONSTRAINT game_plays_game_check
  CHECK (game IN ('spin', 'quiz', 'timing', 'hilo', 'auction', 'umpire', 'whoami', 'scorecard', 'manager'));

CREATE INDEX IF NOT EXISTS game_plays_user_game_idx ON game_plays(user_id, game, play_date DESC);
