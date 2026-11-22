import { demoScore, guardSeed, isDemoEmail, nextWeekday } from '@/lib/demo/guard';
import * as fs from 'fs';
import * as path from 'path';

const env = { DEMO_SEED: 'yes', NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' };

describe('guardSeed', () => {
  it('refuses without DEMO_SEED=yes', () => {
    expect(guardSeed({ env: { ...env, DEMO_SEED: undefined }, argv: ['--confirm'], realLookingProfiles: 0 }).ok).toBe(false);
    expect(guardSeed({ env: { ...env, DEMO_SEED: 'true' }, argv: ['--confirm'], realLookingProfiles: 0 }).ok).toBe(false);
  });
  it('refuses without --confirm', () => expect(guardSeed({ env, argv: [], realLookingProfiles: 0 }).ok).toBe(false));
  it('refuses without the service role key', () => expect(guardSeed({ env: { ...env, SUPABASE_SERVICE_ROLE_KEY: undefined }, argv: ['--confirm'], realLookingProfiles: 0 }).ok).toBe(false));
  it('refuses a database that has real-looking profiles, unless told it is a demo project', () => {
    expect(guardSeed({ env, argv: ['--confirm'], realLookingProfiles: 3 }).ok).toBe(false);
    expect(guardSeed({ env, argv: ['--confirm', '--this-is-a-demo-project'], realLookingProfiles: 3 }).ok).toBe(true);
  });
  it('runs on an empty or all-demo database', () => expect(guardSeed({ env, argv: ['--confirm'], realLookingProfiles: 0 }).ok).toBe(true));
});

describe('helpers', () => {
  it('recognises fictional emails only', () => {
    expect(isDemoEmail('demo-captain@example.com')).toBe(true);
    expect(isDemoEmail('DEMO@EXAMPLE.COM')).toBe(true);
    expect(isDemoEmail('someone@gmail.com')).toBe(false);
    expect(isDemoEmail(null)).toBe(false);
  });
  it('finds the next Saturday, strictly after today', () => {
    expect(nextWeekday(new Date('2026-11-21T10:00:00Z'), 6)).toBe('2026-11-28');
    expect(nextWeekday(new Date('2026-11-22T10:00:00Z'), 6)).toBe('2026-11-28');
  });
  it('makes repeatable scores between 1 and 5', () => {
    for (let back = 0; back < 14; back++) { const s = demoScore(2, back, 3); expect(s).toBeGreaterThanOrEqual(1); expect(s).toBeLessThanOrEqual(5); expect(demoScore(2, back, 3)).toBe(s); }
    expect(demoScore(1, 0, 5)).toBeLessThanOrEqual(5);
    expect(demoScore(1, 0, 1)).toBeGreaterThanOrEqual(1);
  });
});

describe('seed script', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../scripts/seed-demo-club.ts'), 'utf8');
  it('uses only fictional @example.com addresses', () => {
    const emails = src.match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? [];
    expect(emails.length).toBeGreaterThan(5);
    for (const e of emails) expect(e.endsWith('@example.com')).toBe(true);
  });
  it('checks the guard before it creates anything, and never deletes', () => {
    expect(src.indexOf('guardSeed(')).toBeLessThan(src.indexOf('await ensureClub(db'));
    expect(src).not.toMatch(/\.delete\(/);
    expect(src).not.toMatch(/console\.(log|warn|error)\([^)]*SERVICE_ROLE/);
  });
});
