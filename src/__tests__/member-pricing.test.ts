import {
  CLUB_MEMBER_PRICING_FLAG,
  INDIVIDUAL_PENCE,
  MEMBER_PENCE,
  STRIPE_PRICE_ENV,
  clubMemberPricingEnabled,
  clubSeatLine,
  decidePayer,
  memberDiscountEligible,
  normaliseClubCode,
  penceFor,
  priceIdFor,
  pricingCopy,
  pricingCopyAllows,
  renewalDecision,
  renewalEmail,
} from '@/lib/billing/member-pricing';
import { prepareMemberCheckout, renewalWork } from '@/lib/billing/member-pricing-server';
import fs from 'fs';
import path from 'path';

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe('club member prices', () => {
  it('is off unless the flag is exactly true', () => {
    expect(clubMemberPricingEnabled({})).toBe(false);
    expect(clubMemberPricingEnabled({ [CLUB_MEMBER_PRICING_FLAG]: 'TRUE' })).toBe(false);
    expect(clubMemberPricingEnabled({ [CLUB_MEMBER_PRICING_FLAG]: 'true' })).toBe(true);
  });

  it('charges the agreed member prices, the same for every age', () => {
    expect(INDIVIDUAL_PENCE).toEqual({ free: 0, pro: 999, elite: 1499, legend: 1999 });
    expect(MEMBER_PENCE).toEqual({ free: 0, pro: 799, elite: 1199, legend: 1599 });
    expect(penceFor('pro', true)).toBe(penceFor('pro', true));
    expect(penceFor('legend', false)).toBe(1999);
    expect(penceFor('free', true)).toBe(0);
  });

  it('gives the discount only to a confirmed member of a registered club on a paid plan', () => {
    const yes = { claimedClubId: 'club-1', clubRegistered: true, clubPaidPlanActive: true, confirmedMember: true };
    expect(memberDiscountEligible(yes)).toBe(true);
    expect(memberDiscountEligible({ ...yes, claimedClubId: null })).toBe(false);
    expect(memberDiscountEligible({ ...yes, clubRegistered: false })).toBe(false);
    expect(memberDiscountEligible({ ...yes, clubPaidPlanActive: false })).toBe(false);
    expect(memberDiscountEligible({ ...yes, confirmedMember: false })).toBe(false);
  });
});

describe('who pays', () => {
  const base = { under18: false, clubPaysSeats: false, playerId: 'player', callerId: 'player', verifiedParentId: null as string | null };

  it('lets an adult pay on their own card', () => {
    expect(decidePayer(base)).toEqual({ ok: true, payer: 'player', chargeUserId: 'player' });
  });

  it('lets the club pay the seat instead of the player', () => {
    expect(decidePayer({ ...base, under18: true, clubPaysSeats: true, callerId: 'player' })).toEqual({ ok: true, payer: 'club', chargeUserId: null });
  });

  it('never charges a child, and accepts a verified parent', () => {
    expect(decidePayer({ ...base, under18: true, callerId: 'player' }).ok).toBe(false);
    expect(decidePayer({ ...base, under18: true, callerId: 'mum', verifiedParentId: 'mum' })).toEqual({ ok: true, payer: 'parent', chargeUserId: 'mum' });
    expect(decidePayer({ ...base, under18: true, callerId: 'player', verifiedParentId: 'player' }).ok).toBe(false);
  });
});

describe('renewal', () => {
  const end = day('2026-12-01');

  it('keeps the member rate until renewal, then moves to the individual price', () => {
    expect(renewalDecision({ now: day('2026-11-01'), periodEnd: end, onMemberRate: true, eligibleNow: false })).toMatchObject({ rate: 'club_member', switchNow: false, notify: false });
    expect(renewalDecision({ now: day('2026-11-20'), periodEnd: end, onMemberRate: true, eligibleNow: false })).toMatchObject({ rate: 'club_member', notify: true, switchNow: false });
    expect(renewalDecision({ now: day('2026-12-01'), periodEnd: end, onMemberRate: true, eligibleNow: false })).toMatchObject({ rate: 'individual', switchNow: true, notify: false });
  });

  it('keeps the discount when another registered club has confirmed them', () => {
    expect(renewalDecision({ now: day('2026-11-20'), periodEnd: end, onMemberRate: true, eligibleNow: true })).toEqual({ rate: 'club_member', notify: false, switchNow: false });
  });

  it('names both prices in the reminder and does not say players are free', () => {
    const mail = renewalEmail({ plan: 'pro', renewsOn: '2026-12-01' });
    expect(mail.text).toContain('£7.99');
    expect(mail.text).toContain('£9.99');
    expect(mail.text.toLowerCase()).not.toContain('free for players');
    expect(mail.text).toContain('£29.99');
  });
});

describe('Stripe price ids', () => {
  const env = {
    STRIPE_PRICE_PLAYER_PRO: 'price_pro',
    STRIPE_PRICE_PLAYER_PRO_MEMBER: 'price_pro_member',
    STRIPE_PRICE_CLUB_SEAT_ELITE: 'price_seat_elite',
  };

  it('reads configured ids and refuses to invent one', () => {
    expect(priceIdFor('individual', 'pro', env)).toBe('price_pro');
    expect(priceIdFor('club_member', 'pro', env)).toBe('price_pro_member');
    expect(priceIdFor('individual', 'elite', env)).toBeNull();
    expect(clubSeatLine('elite', env)?.price).toBe('price_seat_elite');
    expect(clubSeatLine('pro', env)).toBeNull();
  });

  it('prepares checkout from those ids and never asks for a new price', () => {
    const assessment = {
      claimedClubId: 'club-1',
      eligible: true,
      under18: false,
      clubPaysSeats: false,
      verifiedParentId: null,
      rate: 'club_member' as const,
      pence: { pro: 799, elite: 1199, legend: 1599 },
    };
    const prep = prepareMemberCheckout({ plan: 'pro', assessment, playerId: 'player', callerId: 'player', env });
    expect(prep).toMatchObject({ ok: true, priceId: 'price_pro_member', pence: 799, payer: 'player' });
    const source = fs.readFileSync(path.join(__dirname, '../lib/billing/member-pricing.ts'), 'utf8')
      + fs.readFileSync(path.join(__dirname, '../lib/billing/member-pricing-server.ts'), 'utf8');
    expect(source).not.toMatch(/prices\.create|products\.create/);
    expect(Object.values(STRIPE_PRICE_ENV.club_member)).toEqual([
      'STRIPE_PRICE_PLAYER_PRO_MEMBER',
      'STRIPE_PRICE_PLAYER_ELITE_MEMBER',
      'STRIPE_PRICE_PLAYER_LEGEND_MEMBER',
    ]);
  });

  it('switches a lapsed member subscription onto the individual price id', () => {
    const work = renewalWork({
      userId: 'player',
      email: 'player@example.com',
      plan: 'elite',
      onMemberRate: true,
      periodEnd: '2026-12-01T00:00:00Z',
      eligibleNow: false,
      stripeSubscriptionId: 'sub_1',
    }, day('2026-12-02'), );
    expect(work.switchTo).toBeNull();
    const withEnv = priceIdFor('individual', 'elite', { STRIPE_PRICE_PLAYER_ELITE: 'price_elite' });
    expect(withEnv).toBe('price_elite');
    const notified = renewalWork({
      userId: 'player',
      email: 'player@example.com',
      plan: 'elite',
      onMemberRate: true,
      periodEnd: '2026-12-01T00:00:00Z',
      eligibleNow: false,
      stripeSubscriptionId: 'sub_1',
    }, day('2026-11-20'));
    expect(notified.notify?.text).toContain('£11.99');
    expect(notified.switchTo).toBeNull();
  });
});

describe('pricing copy', () => {
  it('shows both rates when the flag is on, and keeps clubs from £29.99', () => {
    const on = pricingCopy(true);
    expect(on.sub).toContain('£7.99');
    expect(on.sub).toContain('£11.99');
    expect(on.sub).toContain('£15.99');
    expect(on.sub).toContain('£9.99');
    expect(on.title).toContain('£29.99');
    expect(pricingCopyAllows(on)).toBe(true);
    expect(pricingCopyAllows(pricingCopy(false))).toBe(true);
    expect(on.sub.toLowerCase()).not.toContain('free for players');
  });

  it('accepts a club code and rejects a name', () => {
    expect(normaliseClubCode(' ab12 ')).toBe('AB12');
    expect(normaliseClubCode('')).toBe('empty');
    expect(normaliseClubCode('Riverside Cricket Club')).toBeNull();
  });
});
