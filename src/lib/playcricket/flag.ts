/** Off unless NEXT_PUBLIC_PLAYCRICKET_SYNC_ENABLED is exactly "true". */
export const PLAYCRICKET_SYNC_FLAG = 'NEXT_PUBLIC_PLAYCRICKET_SYNC_ENABLED';

export function playCricketSyncEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[PLAYCRICKET_SYNC_FLAG] === 'true';
}
