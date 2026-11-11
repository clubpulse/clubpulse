export type ScoresRule = {
  source: string;
  label: string;
  description: string;
  category: 'app' | 'games' | 'club';
  default_amount: number;
  counts_to_cap: boolean;
  sort_order: number;
};

export type ClubScoresRule = ScoresRule & {
  amount: number;        // effective value for this club
  is_overridden: boolean;
  is_enabled: boolean;
};

export type ClubScoresSettings = {
  weekly_cap: number | null;          // null = no cap
  monthly_goal: number | null;
  monthly_goal_reward: string | null;
};

export const DEFAULT_WEEKLY_CAP = 300; // must match DEFAULT_WEEKLY_CAP in award_scores()

export type ChallengeKey = 'availability' | 'coaching' | 'gut_feeling' | 'pitch' | 'wellbeing';

export type Challenge = {
  key: ChallengeKey;
  icon: string;
  title: string;
  detail: string;
  href: string;
  done: boolean;
  claimed: boolean;
};

export type LeagueRow = { name: string; total: number; isMe: boolean; rank: number };

export type LedgerEntry = { id: string; label: string; amount: number; created_at: string };

export type PlaySummary = {
  clubId: string;
  balance: number;
  isAdult: boolean;
  isJunior: boolean;
  weekly: { cap: number | null; used: number };
  checkin: {
    enabled: boolean;
    doneToday: boolean;
    nextDay: number;          // 1-7: the day the next check-in will be
    lastDay: number;          // 0 if no live streak
    base: number;
    day7Card: boolean;        // day 7 pays a scratch card for this player
  };
  challenges: { enabled: boolean; reward: number; fullHouseReward: number; fullHouseClaimed: boolean; list: Challenge[] };
  clubGoal: { goal: number; reward: string | null; total: number; mine: number; contributors: number } | null;
  league: LeagueRow[];
  recent: LedgerEntry[];
};

export const CHECKIN_LADDER = [1, 1, 2, 2, 3, 3, 4] as const; // must match LADDER in perform_daily_checkin()
