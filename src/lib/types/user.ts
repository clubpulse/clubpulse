import type { CredsWallet } from '@/lib/types/creds';

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
  wallet: CredsWallet | null;
};
