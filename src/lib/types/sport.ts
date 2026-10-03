export type EarningCategory = 'performance' | 'participation' | 'volunteering' | 'organisation';

export type EarningRules = {
  performance:   Record<string, number>;
  participation: Record<string, number>;
  volunteering:  Record<string, number>;
  organisation:  Record<string, number>;
};

export type SportConfig = {
  id:            string;
  name:          string;
  display_name:  string;
  icon_emoji:    string;
  earning_rules: EarningRules;
  is_active:     boolean;
  created_at:    string;
  updated_at:    string;
};

export type Performance = {
  id:              string;
  user_id:         string;
  sport_id:        string;
  category:        EarningCategory;
  data:            Record<string, unknown>;
  creds_earned:    number;
  source:          'manual' | 'play_cricket' | 'parkrun' | 'strava' | 'garmin';
  source_event_id: string | null;
  performed_at:    string;
  created_at:      string;
};

export type PerformanceWithSport = Performance & {
  sport: Pick<SportConfig, 'name' | 'display_name' | 'icon_emoji'>;
};

export type StepsLog = {
  id:               string;
  user_id:          string;
  log_date:         string;
  step_count:       number;
  creds_earned:     number;
  streak_day:       number;
  streak_protected: boolean;
  source:           'apple_health' | 'google_fit' | 'expo_sensors';
  synced_at:        string;
};

export const STEPS_PER_CRED        = 1000;
export const STEPS_DAILY_BONUS_AT  = 10000;
export const STEPS_DAILY_BONUS     = 10;
export const STEPS_STREAK_BONUS    = 50;
export const STEPS_DAILY_CAP       = 20;
export const STREAK_SHIELD_COST    = 20;
export const STREAK_BONUS_DAY      = 7;

export function calcStepsCreds(stepCount: number, currentStreak: number): number {
  let creds = Math.floor(stepCount / STEPS_PER_CRED);
  if (stepCount >= STEPS_DAILY_BONUS_AT) creds += STEPS_DAILY_BONUS;
  if (currentStreak > 0 && currentStreak % STREAK_BONUS_DAY === 0) creds += STEPS_STREAK_BONUS;
  return Math.min(creds, STEPS_DAILY_CAP);
}
