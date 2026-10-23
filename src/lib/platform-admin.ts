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

// PostgREST reports a missing table as PGRST205 (schema cache) or Postgres 42P01
export function isMissingTable(error: { code?: string } | null) {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}
