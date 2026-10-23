import type { SupabaseClient } from '@supabase/supabase-js';

// Shared helpers for the /admin (ClubPulse staff) pages. Server-only: callers pass the service-role client.

export const PAGE_SIZE = 25;

export type ProfileSummary = { id: string; email: string; full_name: string | null; display_name: string | null; role: string };

// ?page= is 1-based; anything invalid falls back to the first page
export function pageFromParam(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function pageRange(page: number): [number, number] {
  const from = (page - 1) * PAGE_SIZE;
  return [from, from + PAGE_SIZE - 1];
}

export async function profilesById(service: SupabaseClient, ids: (string | null)[]): Promise<Map<string, ProfileSummary>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map();
  const { data } = await service.from('profiles').select('id, email, full_name, display_name, role').in('id', unique);
  return new Map((data ?? []).map((profile) => [profile.id as string, profile as ProfileSummary]));
}

export function displayName(profile: ProfileSummary | undefined, fallback = 'Unknown user') {
  return profile?.display_name || profile?.full_name || profile?.email || fallback;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export type AdminStats = {
  totalUsers: number;
  analyseSessions: number;
  highlightReels: number;
  totalClips: number;
  pointsIssued: number;
  marketplaceClicks: number;
  // null when the deployed admin_stats() doesn't return it
  pointsInCirculation: number | null;
};

// Postgres bigints can arrive as strings, so every value goes through Number(); anything unparseable counts as 0
function toCount(value: unknown): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

// admin_stats() returns one JSON object; an array (a RETURNS TABLE version) is unwrapped to its first row
export function parseAdminStats(data: unknown): AdminStats {
  const row = (Array.isArray(data) ? data[0] : data) ?? {};
  const stats = (typeof row === 'object' ? row : {}) as Record<string, unknown>;
  return {
    totalUsers: toCount(stats.total_users),
    analyseSessions: toCount(stats.analyse_sessions),
    highlightReels: toCount(stats.highlight_reels),
    totalClips: toCount(stats.total_clips),
    pointsIssued: toCount(stats.points_issued),
    marketplaceClicks: toCount(stats.marketplace_clicks),
    pointsInCirculation: 'points_in_circulation' in stats ? toCount(stats.points_in_circulation) : null,
  };
}

// PostgREST reports a missing table as PGRST205 (schema cache) or Postgres 42P01
export function isMissingTable(error: { code?: string } | null) {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}
