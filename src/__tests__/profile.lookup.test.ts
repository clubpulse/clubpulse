type Op = [string, ...unknown[]];
const selects: Array<{ table: string; cols: string }> = [];
let db: Record<string, (ops: Op[]) => unknown[]> = {};
let caller: { id: string } | null = { id: 'me' };
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const ops: Op[] = [];
      const c: Record<string, unknown> = {};
      c.select = (cols: string) => { selects.push({ table, cols }); ops.push(['select', cols]); return c; };
      for (const m of ['eq', 'in']) c[m] = (...a: unknown[]) => { ops.push([m, ...a]); return c; };
      c.then = (res: (v: unknown) => unknown) => res({ data: (db[table] ?? (() => []))(ops), error: null });
      return c;
    },
  }),
}));
jest.mock('@/lib/auth/server', () => ({ getCurrentUser: async () => caller }));

import { clubNameCards, sharedClubNameCards, directoryCards, namesAlreadyAuthorised, cardName } from '@/lib/profile/lookup';

const inIds = (ops: Op[], col: string) => (ops.find((o) => o[0] === 'in' && o[1] === col)?.[2] as string[]) ?? [];
const PROFILE_ROWS = [
  { id: 'me', full_name: 'Me Self', display_name: 'Me', avatar_url: null },
  { id: 'mate', full_name: 'Mate Jones', display_name: null, avatar_url: 'a.png' },
  { id: 'stranger', full_name: 'Sam Stranger', display_name: 'Sam', avatar_url: null },
];
beforeEach(() => { selects.length = 0; caller = { id: 'me' }; });

describe('only the four name columns are ever selected', () => {
  it('never asks for email, phone, date of birth, location or push token', async () => {
    db = { club_members: () => [{ user_id: 'me' }, { user_id: 'mate' }], profiles: (ops) => PROFILE_ROWS.filter((r) => inIds(ops, 'id').includes(r.id)), public_profile_cards: () => [] };
    await clubNameCards('c1', ['mate']); await sharedClubNameCards(['mate']); await directoryCards(['mate']); await namesAlreadyAuthorised(['mate']);
    const asked = selects.filter((s) => s.table === 'profiles' || s.table === 'public_profile_cards').map((s) => s.cols);
    expect(asked.length).toBeGreaterThan(0);
    for (const cols of asked) expect(cols).not.toMatch(/email|phone|date_of_birth|location|push_token|\*/);
  });
});

describe('clubNameCards', () => {
  it('returns names for fellow club members only', async () => {
    db = { club_members: () => [{ user_id: 'me' }, { user_id: 'mate' }], profiles: (ops) => PROFILE_ROWS.filter((r) => inIds(ops, 'id').includes(r.id)) };
    const m = await clubNameCards('c1', ['mate', 'stranger']);
    expect([...m.keys()]).toEqual(['mate']);
    expect(cardName(m.get('mate'))).toBe('Mate Jones');
  });
  it('returns nothing when the signed-in person is not in that club', async () => {
    db = { club_members: () => [{ user_id: 'mate' }], profiles: () => PROFILE_ROWS };
    expect((await clubNameCards('c1', ['mate'])).size).toBe(0);
  });
  it('returns nothing when signed out, or with no ids', async () => {
    db = { club_members: () => [{ user_id: 'me' }, { user_id: 'mate' }], profiles: () => PROFILE_ROWS };
    caller = null; expect((await clubNameCards('c1', ['mate'])).size).toBe(0);
    caller = { id: 'me' }; expect((await clubNameCards('c1', [])).size).toBe(0);
    expect((await clubNameCards('c1', [undefined, null, ''])).size).toBe(0);
  });
});

describe('sharedClubNameCards', () => {
  it('returns yourself and people who share a club, never a stranger', async () => {
    db = {
      club_members: (ops) => (ops.some((o) => o[0] === 'eq' && o[1] === 'user_id') ? [{ club_id: 'c1' }] : [{ user_id: 'mate' }]),
      profiles: (ops) => PROFILE_ROWS.filter((r) => inIds(ops, 'id').includes(r.id)),
    };
    const m = await sharedClubNameCards(['me', 'mate', 'stranger']);
    expect([...m.keys()].sort()).toEqual(['mate', 'me']);
  });
  it('returns only yourself if you are in no club', async () => {
    db = { club_members: () => [], profiles: (ops) => PROFILE_ROWS.filter((r) => inIds(ops, 'id').includes(r.id)) };
    expect([...(await sharedClubNameCards(['me', 'mate'])).keys()]).toEqual(['me']);
  });
});

describe('directoryCards', () => {
  it('reads the adults-only card view, not profiles', async () => {
    db = { public_profile_cards: () => [{ id: 'mate', display_name: 'Mate', avatar_url: null }] };
    const m = await directoryCards(['mate', 'kid']);
    expect(selects.every((s) => s.table === 'public_profile_cards')).toBe(true);
    expect(m.get('mate')?.display_name).toBe('Mate');
    expect(m.has('kid')).toBe(false);
  });
});

describe('cardName', () => {
  it('prefers display name, then full name, then the fallback', () => {
    expect(cardName({ id: 'x', display_name: 'D', full_name: 'F', avatar_url: null })).toBe('D');
    expect(cardName({ id: 'x', display_name: null, full_name: 'F', avatar_url: null })).toBe('F');
    expect(cardName(undefined)).toBe('Unknown');
    expect(cardName(undefined, 'Player')).toBe('Player');
  });
});
