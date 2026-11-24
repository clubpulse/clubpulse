import { allowUser } from '@/lib/ai/rate-limit';

describe('AI rate limit', () => {
  it('allows 30 calls in a minute and refuses the next', () => {
    const now = 1_700_000_000_000;
    for (let i = 0; i < 30; i++) expect(allowUser('user-1', 'companion', now + i)).toBe(true);
    expect(allowUser('user-1', 'companion', now + 31)).toBe(false);
    expect(allowUser('user-2', 'companion', now + 31)).toBe(true);
    expect(allowUser('user-1', 'companion', now + 60_001)).toBe(true);
  });
});
