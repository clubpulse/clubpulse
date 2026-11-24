import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

export type AwinCategory =
  | 'sports_apparel'
  | 'sports_equipment'
  | 'groceries'
  | 'electronics'
  | 'general_value';

export type AwinDeal = {
  id:           string;
  merchantId:   string;
  merchantName: string;
  category:     AwinCategory;
  title:        string;
  code:         string;
  discountPct:  number;
  deepLink:     string;
  expiresAt:    string | null;
};

type CategoryMeta = {
  label: string;
  icon:  string;
  color: string;
};

type DealsResponse = {
  deals:      AwinDeal[];
  categories: Record<AwinCategory, CategoryMeta>;
  meta:       { total: number; category: string; tracked: boolean };
};

type ScratchDealResponse = {
  deal:     AwinDeal;
  category: CategoryMeta & { key: AwinCategory };
};

/**
 * Fetch deals from the ShiftUp API, optionally filtered by category.
 */
export function useDeals(category?: AwinCategory) {
  const [deals, setDeals] = useState<AwinDeal[]>([]);
  const [categories, setCategories] = useState<Record<string, CategoryMeta>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      const data = await api<DealsResponse>(`/api/awin/deals?${params.toString()}`);
      setDeals(data.deals);
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { deals, categories, loading, error, refresh };
}

/**
 * Fetch a single random deal for a scratch card prize.
 */
export async function fetchScratchDeal(
  userId: string,
  category?: AwinCategory
): Promise<ScratchDealResponse> {
  return api<ScratchDealResponse>('/api/awin/deals', {
    method: 'POST',
    body: { userId, category },
  });
}
