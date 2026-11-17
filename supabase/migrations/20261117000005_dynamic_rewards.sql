-- Rewards tasks now rotate, so the rule descriptions no longer list fixed tasks.
-- Changes wording only. Safe to run more than once.
UPDATE scores_rules SET description = 'Paid once a day for any three of the day''s five tasks. The tasks change daily.'                    WHERE source = 'reward_daily';
UPDATE scores_rules SET description = 'Paid once a day, on top, for all five of the day''s tasks.'                                        WHERE source = 'reward_daily_all';
UPDATE scores_rules SET description = 'Paid for each of the week''s five tasks. The tasks change weekly and differ between players.'      WHERE source = 'reward_weekly';
UPDATE scores_rules SET description = 'Bonus for completing all five of the week''s tasks.'                                               WHERE source = 'reward_weekly_all';
UPDATE scores_rules SET description = 'Paid for each of the week''s two extra "keep going" tasks.'                                        WHERE source = 'reward_weekly_extra';
UPDATE scores_rules SET description = 'Paid for each of the month''s five tasks. The tasks change monthly and differ between players.'    WHERE source = 'reward_monthly';
UPDATE scores_rules SET description = 'Bonus for completing all five of the month''s tasks.'                                              WHERE source = 'reward_monthly_all';
UPDATE scores_rules SET description = 'Paid for each of the month''s two extra "keep going" tasks.'                                       WHERE source = 'reward_monthly_extra';
