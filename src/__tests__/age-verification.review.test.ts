/**
 * @jest-environment node
 */
const seen: string[] = [];

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'stranger' } } }) } }),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      seen.push(table);
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.select = self;
      chain.eq = self;
      chain.in = self;
      chain.is = self;
      chain.limit = self;
      chain.order = self;
      chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
      chain.single = () => Promise.resolve({ data: null, error: null });
      chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null });
      return chain;
    },
  }),
}));

import { adminAssignAgeGroup, adminSelectTeam } from '@/lib/actions/schools';

describe('squad permission runs before any age check', () => {
  const previous = process.env.AGE_VERIFICATION_ENABLED;

  beforeEach(() => {
    seen.length = 0;
    process.env.AGE_VERIFICATION_ENABLED = 'true';
  });

  afterAll(() => {
    if (previous === undefined) delete process.env.AGE_VERIFICATION_ENABLED;
    else process.env.AGE_VERIFICATION_ENABLED = previous;
  });

  it('does not read verification or write a flag for someone who cannot name a squad', async () => {
    const assigned = await adminAssignAgeGroup('member-1', 'club-1', 'Open');
    const selected = await adminSelectTeam({ clubId: 'club-1', matchDate: '2026-06-01', opposition: 'Away', ageGroup: 'U15', selectedPlayers: ['member-1'] });
    expect(assigned).toEqual({ success: false, error: 'Only club admins and coaches can do this.' });
    expect(selected).toEqual({ success: false, error: 'Only club admins and coaches can do this.' });
    expect(seen).toEqual(['club_members', 'club_members']);
    expect(seen).not.toContain('profiles');
    expect(seen).not.toContain('age_verifications');
    expect(seen).not.toContain('age_squad_mismatches');
    expect(seen).not.toContain('safeguarding_incidents');
  });
});
