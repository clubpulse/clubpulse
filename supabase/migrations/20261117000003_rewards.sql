-- Daily, weekly and monthly rewards for the mobile app.
-- Each is a club-adjustable rule paid through award_scores(), claimed once per period.
-- Daily and weekly rewards count toward the weekly cap. Monthly rewards do not, so a month of
-- effort is never swallowed by a busy final week.

INSERT INTO scores_rules (source, label, description, category, default_amount, counts_to_cap, sort_order) VALUES
  ('reward_daily',       'Daily reward',          'Paid once for any two of the three daily goals (check in, 6,000 steps, finish the auction) and once more for all three.', 'app', 5,   TRUE,  22),
  ('reward_weekly',      'Weekly goal',           'Paid for each weekly goal: 5 active days, 40,000 steps, an auction podium, one thing for the club.',                    'app', 15,  TRUE,  24),
  ('reward_weekly_all',  'All weekly goals',      'Bonus for completing all four weekly goals.',                                                                           'app', 30,  TRUE,  26),
  ('reward_monthly',     'Monthly goal',          'Paid for each monthly goal: 18 active days, 150,000 steps, 8 weekly rewards claimed.',                                  'app', 40,  FALSE, 28),
  ('reward_monthly_all', 'All monthly goals',     'Bonus for completing all three monthly goals.',                                                                         'app', 100, FALSE, 29)
ON CONFLICT (source) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description;
