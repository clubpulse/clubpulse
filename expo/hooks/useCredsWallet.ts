import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Wallet } from '../lib/api';

// Reads creds_wallet directly (RLS lets a user read only their own row; balances are
// changed only on the server)
export function useCredsWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
