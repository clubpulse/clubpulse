export const CREDS_PER_GBP = 50;

export type CredsWallet = {
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

export function totalBalance(wallet: Pick<CredsWallet, 'flexi_balance' | 'reward_balance'> | null): number {
  return (wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0);
}
