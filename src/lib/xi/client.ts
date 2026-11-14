/**
 * The XI API client — server-side only.
 *
 * All calls go through this module so the API key never reaches the browser.
 * Base URL and key are set via environment variables:
 *   XI_API_BASE_URL  — e.g. https://api.the-xi.app
 *   XI_API_KEY       — shared secret issued by The XI
 *
 * Endpoints this client expects on The XI side:
 *   POST /users/create
 *   POST /matches/performance
 *   GET  /users/:xiUserId/wallet
 */

export interface XiCreateUserInput {
  clubpulse_user_id: string;
  name: string;
  email: string;
}

export interface XiCreateUserResult {
  xi_user_id: string;
}

export interface XiPerformanceInput {
  xi_user_id: string;
  clubpulse_match_id: string;
  match_date: string;        // ISO date string
  opposition?: string;
  batting?: {
    runs: number;
    balls: number;
    fours?: number;
    sixes?: number;
    strike_rate?: number;
    how_out?: string;
  };
  bowling?: {
    overs: number;
    maidens?: number;
    runs: number;
    wickets: number;
    economy?: number;
  };
  fielding?: {
    catches?: number;
    run_outs?: number;
    stumpings?: number;
  };
  player_of_match?: boolean;
}

export interface XiPerformanceResult {
  fantasy_points: number;
  rewards_points: number;
  new_wallet_balance: number;
  tier_multiplier: number;      // 1 | 2 | 3 | 4 based on player's XI tier
  breakdown: {
    base_points: number;
    multiplier_bonus: number;
    milestone_bonus: number;    // 50, century, 5-fer etc.
  };
}

export interface XiWalletResult {
  xi_user_id: string;
  balance: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  tier_multiplier: number;
  lifetime_earned: number;
}

// ─────────────────────────────────────────────────────────────────────────────

function xiBase(): string {
  const base = process.env.XI_API_BASE_URL;
  if (!base) throw new Error('XI_API_BASE_URL is not set');
  return base.replace(/\/$/, '');
}

function xiHeaders(): HeadersInit {
  const key = process.env.XI_API_KEY;
  if (!key) throw new Error('XI_API_KEY is not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'X-Client': 'clubpulse',
  };
}

/**
 * Called once during ClubPulse sign-up to provision a matching XI account.
 * Returns the xi_user_id which is then stored on the ClubPulse profile.
 * Silently swallows errors — a failed XI provisioning must never block sign-up.
 */
export async function xiCreateUser(
  input: XiCreateUserInput
): Promise<XiCreateUserResult | null> {
  try {
    const res = await fetch(`${xiBase()}/users/create`, {
      method: 'POST',
      headers: xiHeaders(),
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      console.error('[xi] createUser failed', res.status, await res.text());
      return null;
    }

    return (await res.json()) as XiCreateUserResult;
  } catch (err) {
    console.error('[xi] createUser error', err);
    return null;
  }
}

/**
 * Fired when a scorecard is closed on ClubPulse.
 * Sends the player's match performance to The XI; receives fantasy + rewards points.
 */
export async function xiSyncPerformance(
  input: XiPerformanceInput
): Promise<XiPerformanceResult | null> {
  try {
    const res = await fetch(`${xiBase()}/matches/performance`, {
      method: 'POST',
      headers: xiHeaders(),
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      console.error('[xi] syncPerformance failed', res.status, await res.text());
      return null;
    }

    return (await res.json()) as XiPerformanceResult;
  } catch (err) {
    console.error('[xi] syncPerformance error', err);
    return null;
  }
}

/**
 * Fetches the player's current XI wallet — balance, tier and multiplier.
 * Used to display live rewards balance on the ClubPulse dashboard.
 */
export async function xiGetWallet(
  xiUserId: string
): Promise<XiWalletResult | null> {
  try {
    const res = await fetch(`${xiBase()}/users/${xiUserId}/wallet`, {
      method: 'GET',
      headers: xiHeaders(),
    });

    if (!res.ok) {
      console.error('[xi] getWallet failed', res.status, await res.text());
      return null;
    }

    return (await res.json()) as XiWalletResult;
  } catch (err) {
    console.error('[xi] getWallet error', err);
    return null;
  }
}
