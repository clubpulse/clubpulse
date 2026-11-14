import { useCallback, useEffect, useState } from 'react';
import { supabase, DEMO_MODE } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Wallet } from '../lib/api';

const DEMO_WALLET: Wallet = { flexi_balance: 4850, reward_balance: 0, lifetime_earned: 7200 };

// Reads creds_wallet directly (RLS lets a user read only their own row; balances are
// changed only on the server)
export function useScoresWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(DEMO_MODE ? DEMO_WALLET : null);
  const [loading, setLoading] = useState(!DEMO_MODE);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (DEMO_MODE) return;
    if (!user) return;
    const { data, error: queryError } = await supabase
      .from('creds_wallet')
      .select('flexi_balance, reward_balance, lifetime_earned')
      .eq('user_id', user.id)
      .maybeSingle();

    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setWallet(data as Wallet | null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const total = (wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0);
  return { wallet, total, loading, error, refresh };
}
