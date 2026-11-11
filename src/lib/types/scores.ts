// The single Scores-to-pounds rate for the whole app: 500 Scores = £1 (1 Score = 0.2p).
// The SQL payment functions use the same rate (see 20261111000001_scores_rate.sql).
export const SCORES_PER_GBP = 500;

// ClubPulse keeps 20% when a club cashes out Scores taken through Scores Pay.
export const CASHOUT_MARGIN = 0.2;
export const MIN_CASHOUT_SCORES = 500;

/** Face value of Scores in pence at the app-wide rate. */
export function scoresToPence(scores: number): number {
  return Math.floor((scores * 100) / SCORES_PER_GBP);
}

/** What a club receives, in pence, for cashing out Scores (face value less the margin). */
export function cashoutPence(scores: number): number {
  return Math.floor(((scores * 100) / SCORES_PER_GBP) * (1 - CASHOUT_MARGIN));
}

export type ScoresWallet = {
  id:              string;
  user_id:         string;
  flexi_balance:   number;
  reward_balance:  number;
  lifetime_earned: number;
  updated_at:      string;
};

export type WalletTransactionKind =
  | 'performance'
  | 'steps'
  | 'shopping'
  | 'volunteering'
  | 'redemption';

// Derived from performances / steps_log / awin_transactions / volunteer_sessions / reward_redemptions;
// there is no ledger table. Positive amount = earned, negative = spent.
export type WalletTransaction = {
  id:          string;
  kind:        WalletTransactionKind;
  title:       string;
  amount:      number;
  occurred_at: string;
};

export function totalBalance(wallet: Pick<ScoresWallet, 'flexi_balance' | 'reward_balance'> | null): number {
  return (wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0);
}
