import { supabase } from './supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Calls the Next.js API with the Supabase access token as a Bearer token
export async function api<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  if (!BASE_URL) throw new ApiError('EXPO_PUBLIC_API_URL is not set', 0);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, init);
    // iOS drops the Authorization header when a request is redirected to another host (for
    // example shiftup.club to www.shiftup.club), so the server sees no login and answers 401.
    // Repeat the request once, straight at the host we were sent to.
    if (res.status === 401 && res.redirected && res.url) {
      const origin = new URL(res.url).origin;
      if (origin !== new URL(BASE_URL).origin) res = await fetch(`${origin}${path}`, init);
    }
  } catch {
    throw new ApiError('Could not reach ShiftUp. Check your connection.', 0);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(json?.error ?? res.statusText, res.status);
  return json as T;
}

// ── Response shapes (mirror the web API) ───────────────────────────────────

export type Reward = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  creds_cost: number;
  category: string | null;
  stock_count: number | null;
};

export type Profile = {
  id: string;
  full_name: string;
  display_name: string;
  email: string;
};

export type Wallet = {
  flexi_balance: number;
  reward_balance: number;
  lifetime_earned: number;
};

export type StepsSyncResponse = {
  ok: true;
  stepCount: number;
  scoresEarned?: number;
  totalScoresToday?: number;
  streakDay: number;
  duplicate?: boolean;
};

export type SportingSoul = {
  headline: string;
  narrative: string;
  achievement: string;
  rewardTrigger: string;
};

export type CompanionResponse = { reply: string; conversationId: string };
