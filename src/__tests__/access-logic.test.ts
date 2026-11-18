import { decideAccess, parseFreeList, type AccessFacts } from '@/lib/billing/access-logic';

const nobody: AccessFacts = { paymentsOn: true, platformAdmin: false, onFreeList: false, hasLivePlan: false, staffOfPayingClub: false };

describe('decideAccess', () => {
  it('leaves everything open until online payment is switched on', () => {
    expect(decideAccess({ ...nobody, paymentsOn: false })).toEqual({ allowed: true, reason: 'open' });
  });

  it('shuts out a player with no plan once payment is on', () => {
    expect(decideAccess(nobody)).toEqual({ allowed: false, reason: 'none' });
  });

  it('lets in each kind of person who should get in, and says why', () => {
    expect(decideAccess({ ...nobody, hasLivePlan: true })).toEqual({ allowed: true, reason: 'plan' });
    expect(decideAccess({ ...nobody, onFreeList: true })).toEqual({ allowed: true, reason: 'free_list' });
    expect(decideAccess({ ...nobody, platformAdmin: true })).toEqual({ allowed: true, reason: 'staff' });
    expect(decideAccess({ ...nobody, staffOfPayingClub: true })).toEqual({ allowed: true, reason: 'club_staff' });
  });
});

describe('parseFreeList', () => {
  it('reads a comma-separated list, ignoring case, spaces and junk', () => {
    const list = parseFreeList(' Asha@Example.org, ,not-an-email,sam@club.co.uk ');
    expect([...list]).toEqual(['asha@example.org', 'sam@club.co.uk']);
    expect(parseFreeList(undefined).size).toBe(0);
  });
});
