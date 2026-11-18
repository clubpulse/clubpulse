// Pure. Who may use the paid features: analysis on their own phone, coaching and AI sessions.

export type AccessReason = 'open' | 'staff' | 'free_list' | 'plan' | 'club_staff' | 'none';
export type Access = { allowed: boolean; reason: AccessReason };

export type AccessFacts = {
  /** False until online payment is switched on: until then everything stays open, as it is today. */
  paymentsOn: boolean;
  platformAdmin: boolean;
  /** On the list of accounts ClubPulse gives free access to (testers, founders, demos). */
  onFreeList: boolean;
  /** The player's own plan or club add-on is paid up. */
  hasLivePlan: boolean;
  /** A coach or admin at a club that has a paid plan: they analyse players as part of the club's plan. */
  staffOfPayingClub: boolean;
};

export function decideAccess(f: AccessFacts): Access {
  if (!f.paymentsOn) return { allowed: true, reason: 'open' };
  if (f.platformAdmin) return { allowed: true, reason: 'staff' };
  if (f.onFreeList) return { allowed: true, reason: 'free_list' };
  if (f.hasLivePlan) return { allowed: true, reason: 'plan' };
  if (f.staffOfPayingClub) return { allowed: true, reason: 'club_staff' };
  return { allowed: false, reason: 'none' };
}

/** "A@x.org, b@y.org" → a set of lower-case addresses. */
export function parseFreeList(raw: string | undefined): Set<string> {
  return new Set((raw ?? '').split(',').map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@')));
}

export const PAID_FEATURE_MESSAGE = 'This is part of a paid plan. See My plan on the ClubPulse website.';
