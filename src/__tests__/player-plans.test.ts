import { isLive, isPlayerPlan, lookupKey, offerFor, pounds } from '@/lib/billing/player-plans';

describe('offerFor', () => {
  it('offers Pro, Elite and Legend to a player with no club plan behind them', () => {
    for (const offer of [offerFor(null, false), offerFor('free', true), offerFor('pro', false)]) {
      expect(offer.kind).toBe('individual');
      expect(offer.options.map((o) => [o.plan, o.pence])).toEqual([['pro', 999], ['elite', 1499], ['legend', 1999]]);
    }
  });

  it('offers one add-on, priced by the club plan, to a member of a paying club', () => {
    expect(offerFor('starter', true)).toEqual({ kind: 'club_addon', options: [{ plan: 'pro', label: 'Pro member add-on', pence: 299 }] });
    expect(offerFor('pro', true).options).toEqual([{ plan: 'elite', label: 'Elite member add-on', pence: 499 }]);
    expect(offerFor('elite', true).options).toEqual([{ plan: 'legend', label: 'Legend member add-on', pence: 699 }]);
  });
});

describe('helpers', () => {
  it('knows which statuses still give access', () => {
    expect(['active', 'trialing', 'past_due'].every(isLive)).toBe(true);
    expect(['canceled', 'incomplete', 'unpaid', 'none', '', null, undefined].some(isLive)).toBe(false);
  });

  it('accepts only real plans', () => {
    expect(isPlayerPlan('elite')).toBe(true);
    expect(isPlayerPlan('starter')).toBe(false);
    expect(isPlayerPlan(undefined)).toBe(false);
  });

  it('gives each kind, plan and price its own Stripe key', () => {
    expect(lookupKey('individual', 'pro', 999)).toBe('clubpulse_player_individual_pro_999_monthly');
    expect(lookupKey('club_addon', 'pro', 299)).not.toBe(lookupKey('individual', 'pro', 299));
    expect(lookupKey('individual', 'pro', 999)).not.toBe(lookupKey('individual', 'pro', 1099));
  });

  it('writes pence as pounds', () => {
    expect(pounds(299)).toBe('£2.99');
    expect(pounds(1000)).toBe('£10.00');
  });
});
