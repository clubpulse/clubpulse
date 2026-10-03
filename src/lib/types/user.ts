import type { ScoresWallet } from '@/lib/types/scores';

export type UserProfile = {
  id:                  string;
  full_name:           string;
  display_name:        string;
  email:               string;
  primary_sport:       string;
  is_active:           boolean;
  onboarding_complete: boolean;
};

export type UserRole = 'player' | 'volunteer' | 'coach' | 'club_admin' | 'parent' | 'merchant';

export type UserWithWallet = UserProfile & {
  wallet: ScoresWallet | null;
};
