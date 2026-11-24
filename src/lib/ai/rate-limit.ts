import { NextResponse } from 'next/server';

// Per-instance limit. A serverless isolate does not share this map, so it slows one user
// on one instance rather than being a global quota. 30 calls a minute per user per route.
const WINDOW_MS = 60_000;
const LIMIT = 30;
const hits = new Map<string, number[]>();

export function allowUser(userId: string, route: string, now = Date.now()): boolean {
  const key = `${route}:${userId}`;
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function rateLimitResponse(userId: string, route: string) {
  if (allowUser(userId, route)) return null;
  return NextResponse.json(
    { error: 'Too many requests. Wait a minute and try again.' },
    { status: 429, headers: { 'Retry-After': '60' } },
  );
}
