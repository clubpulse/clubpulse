-- Daily, weekly and monthly rewards for the mobile app: fifteen core tasks (five per period)
-- plus a few "keep going" tasks. Each reward is a club-adjustable rule paid through
-- award_scores() and claimed once per period. Safe to run more than once.
--
-- Daily and weekly rewards count toward the weekly cap. Monthly rewards do not, so a month of
-- effort is never swallowed by a busy final week.

INSERT INTO scores_rules (source, label, description, category, default_amount, counts_to_cap, sort_order) VALUES
  ('reward_daily',         'Daily tasks: any three', 'Paid once a day for any three of the five daily tasks (check in, 6,000 steps, cricket question, Coach AI, auction).', 'app', 5,   TRUE,  22),
  ('reward_daily_all',     'Daily tasks: all five',  'Paid once a day, on top, for all five daily tasks.',                                                                    'app', 10,  TRUE,  23),
  ('reward_weekly',        'Weekly task',            'Paid for each of the five weekly tasks: club action, a 10,000-step day, auction podium, three questions right, 100 Scores earned.', 'app', 15, TRUE, 24),
  ('reward_weekly_all',    'All weekly tasks',       'Bonus for completing all five weekly tasks.',                                                                           'app', 30,  TRUE,  25),
  ('reward_weekly_extra',  'Weekly keep-going task', 'Paid for each extra weekly task: 40,000 steps, active on five days.',                                                   'app', 10,  TRUE,  26),
  ('reward_monthly',       'Monthly task',           'Paid for each of the five monthly tasks: win an auction, 7-day step streak, turn up for the club, redeem a reward, active on 18 days.', 'app', 40, FALSE, 27),
  ('reward_monthly_all',   'All monthly tasks',      'Bonus for completing all five monthly tasks.',                                                                          'app', 100, FALSE, 28),
  ('reward_monthly_extra', 'Monthly keep-going task','Paid for each extra monthly task: 150,000 steps, ten weekly tasks completed.',                                         'app', 30,  FALSE, 29)
ON CONFLICT (source) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- Things people do in the app that leave no other record: asking Coach AI, answering the daily
-- question. One row per person, kind and day. No client policies: only the server reads or writes.
CREATE TABLE IF NOT EXISTS app_activity (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('coach_ai', 'daily_question')),
  activity_date DATE NOT NULL,
  data          JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, kind, activity_date)
);
ALTER TABLE app_activity ENABLE ROW LEVEL SECURITY;
