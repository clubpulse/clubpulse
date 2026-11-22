// The Community's written rules, as plain functions with no database or network. The safety
// check (moderation.ts) runs these first; the service uses the rest to decide who may see and
// message whom.

export type Verdict = { ok: true } | { ok: false; reason: string };

export type CheckContext = {
  /** Where the text will be seen: by everyone, or by one other person */
  place: 'public' | 'private';
  /** The writer is under 18 */
  authorJunior: boolean;
  /** Someone under 18 can read it. Always true in public. */
  readerJunior: boolean;
};

export const MAX_POST = 1000;
export const MAX_MESSAGE = 1000;
export const MAX_COMMENT = 500;

// Words that are never posted. Matched as whole words, with common letter swaps undone first.
const VULGAR = [
  'fuck', 'fucking', 'fucker', 'fucked', 'motherfucker', 'shit', 'shite', 'bullshit', 'cunt', 'twat', 'wanker', 'wank',
  'bastard', 'bitch', 'bollocks', 'dickhead', 'prick', 'arsehole', 'asshole', 'slut', 'whore', 'piss off', 'tosser',
];
const SEXUAL = ['nude', 'nudes', 'naked', 'porn', 'porno', 'sex', 'sexy', 'sexting', 'horny', 'boobs', 'tits', 'penis', 'vagina', 'onlyfans', 'xxx'];
const THREATS = [
  /\b(i('|’)?ll|i will|i('|’)?m going to|im going to|gonna)\s+(kill|hurt|stab|beat|batter|find)\s+(you|u|him|her|them)\b/,
  /\b(kill|hang|hurt)\s+your?self\b/,
  /\bkys\b/,
  /\bi know where you live\b/,
];

/** Lower case, with the usual tricks for dodging a word filter undone ("f.u.c.k", "sh1t", "fuuuck"). */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@4]/g, 'a').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/3/g, 'e').replace(/[$5]/g, 's')
    .replace(/(?<=\b\w)[.\-_*](?=\w\b|\w[.\-_*])/g, '')   // f.u.c.k → fuck
    .replace(/(\w)\1{2,}/g, '$1');                           // fuuuck → fuck
}

const hasWord = (text: string, words: string[]) =>
  words.some((w) => new RegExp(`(^|[^a-z])${w.replace(/ /g, '\\s+')}([^a-z]|$)`).test(text));

// A UK or international phone number: 10 or more digits once spaces and dashes are taken out
const PHONE = /(?:\+?\d[\s\-().]*){10,}/;
const EMAIL = /[a-z0-9._%+-]+\s*(@|\(at\)|\sat\s)\s*[a-z0-9.-]+\s*(\.|\sdot\s)\s*[a-z]{2,}/i;
const POSTCODE = /\b[a-z]{1,2}\d[a-z\d]?\s*\d[a-z]{2}\b/i;
const OTHER_APPS = /\b(whats\s?app|snap\s?chat|snap me|telegram|insta(gram)?|tik\s?tok|discord|kik|add me on|dm me on|my (number|mobile|snap|insta) is)\b/i;

/** Whether the text gives a way to reach someone outside the app. */
export function hasPersonalDetails(text: string): boolean {
  return PHONE.test(text) || EMAIL.test(text) || POSTCODE.test(text) || OTHER_APPS.test(text);
}

/**
 * The first check, with no AI: length, banned words, threats and personal details.
 * Anything that fails here never reaches the second check.
 */
export function screenText(raw: string, context: CheckContext, max = MAX_POST): Verdict {
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'Write something first.' };
  if (text.length > max) return { ok: false, reason: `Keep it under ${max} characters.` };

  const plain = normalise(text);
  if (THREATS.some((t) => t.test(plain))) return { ok: false, reason: 'This reads as a threat, so it was not sent.' };
  if (hasWord(plain, VULGAR)) return { ok: false, reason: 'Swearing is not allowed in the Community.' };
  if (hasWord(plain, SEXUAL)) return { ok: false, reason: 'Sexual content is not allowed in the Community.' };

  if (hasPersonalDetails(text)) {
    // Under-18s share contact details only with a parent's agreement, which the app cannot take yet
    if (context.authorJunior) return { ok: false, reason: 'Phone numbers, addresses and other accounts need your parent to agree first.' };
    // An adult's contact details never reach someone under 18. The public feed is read by juniors.
    if (context.place === 'public') return { ok: false, reason: 'Contact details cannot go on the public feed, because under-18s read it. Send them in a private message.' };
    if (context.readerJunior) return { ok: false, reason: 'Contact details cannot be sent to someone under 18.' };
  }
  return { ok: true };
}

/** Private messages are only between two adults or two juniors: never an adult with a junior. */
export function mayMessage(aJunior: boolean, bJunior: boolean): boolean {
  return aJunior === bJunior;
}

/** Miles between two points on the map (clubs' grounds), rounded so a place cannot be worked out. */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/** "about 3 miles away": never more exact than a whole mile, and never under one. */
export function roughDistance(miles: number): string {
  const whole = Math.max(1, Math.round(miles));
  return whole === 1 ? 'about a mile away' : `about ${whole} miles away`;
}

export const SCOPES = ['club', 'miles', 'league', 'county', 'all'] as const;
export type Scope = (typeof SCOPES)[number];
export const isScope = (v: unknown): v is Scope => typeof v === 'string' && (SCOPES as readonly string[]).includes(v);
export const NEAR_MILES = 10;

export const LOOKING_FOR = ['net_partner', 'club', 'coach', 'teammates'] as const;
export type LookingFor = (typeof LOOKING_FOR)[number];

/** A junior is shown by first name only. */
export function shownName(fullName: string | null | undefined, junior: boolean): string {
  const name = (fullName ?? '').trim() || 'Member';
  return junior ? name.split(/\s+/)[0] : name;
}

// ── Who may see and follow whom across the age line ─────────────────────────────────────────────

export type CrossBandContext = {
  viewerJunior: boolean;
  subjectJunior: boolean;
  /** They belong to at least one club in common */
  sharesClub: boolean;
  /** For an adult looking at a junior: the adult is a coach or club admin of a shared club. For a junior looking at an adult: that adult is one. */
  adultIsStaffOfSharedClub: boolean;
  /** The viewer is the linked parent of the junior */
  isLinkedParent: boolean;
};

/**
 * Whether one person may open another person's Community profile. Adults and juniors see their own
 * age band freely. Across the line it takes a shared club and the adult being a coach or club
 * admin there, or the adult being the junior's linked parent.
 */
export function mayViewProfile(c: CrossBandContext): boolean {
  if (c.viewerJunior === c.subjectJunior) return true;
  if (c.isLinkedParent && !c.viewerJunior) return true;
  return c.sharesClub && c.adultIsStaffOfSharedClub;
}

/**
 * Following is one-way and never opens private messaging. A club can be followed by anyone. A
 * junior may follow another junior, not an adult player. An adult may follow a junior only as that
 * junior's coach or club admin (sharing a club) or as their linked parent.
 */
export function mayFollow(subject: 'player' | 'club', c: CrossBandContext): boolean {
  if (subject === 'club') return true;
  if (c.viewerJunior) return c.subjectJunior;
  if (!c.subjectJunior) return true;
  return c.isLinkedParent || (c.sharesClub && c.adultIsStaffOfSharedClub);
}

// ── Nets and pick-up games ──────────────────────────────────────────────────────────────────────

export const SESSION_KINDS = ['nets', 'pickup'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];
export type AgeBand = 'adult' | 'junior';
export const SESSION_MAX_DAYS = 60;

export type SessionContext = {
  viewerJunior: boolean;
  viewerClubIds: string[];
  /** The viewer is a coach or club admin at the session's club */
  viewerIsClubStaff: boolean;
};

/**
 * Who may host. Adults host adult sessions. Under-18s never host. A junior session is hosted only
 * by a coach or club admin of the club it is for, so it is always a club session with an adult
 * responsible, never a stranger's pick-up game.
 */
export function mayHost(band: AgeBand, c: SessionContext, clubId: string): boolean {
  if (c.viewerJunior) return false;
  if (!c.viewerClubIds.includes(clubId)) return false;
  return band === 'adult' ? true : c.viewerIsClubStaff;
}

/** Who may sign up. Adult sessions are for adults. Junior sessions are for juniors of that club only. */
export function maySignUp(band: AgeBand, c: Pick<SessionContext, 'viewerJunior' | 'viewerClubIds'>, clubId: string): boolean {
  if (band === 'adult') return !c.viewerJunior;
  return c.viewerJunior && c.viewerClubIds.includes(clubId);
}

/** Whether a session is shown to someone at all. Junior sessions are invisible outside the club's own juniors and staff. */
export function maySeeSession(band: AgeBand, c: SessionContext, clubId: string): boolean {
  if (band === 'adult') return !c.viewerJunior;
  return c.viewerClubIds.includes(clubId) && (c.viewerJunior || c.viewerIsClubStaff);
}

const HOMEISH = /\b(my|our)\s+(house|home|flat|place|garden|address)\b|\bat\s+mine\b|\bcome\s+to\s+mine\b|\bmy\s+(road|street)\b/i;

/** The place must be a club ground or a public venue, never someone's home. */
export function checkPlace(place: string): Verdict {
  const t = place.trim();
  if (t.length < 3) return { ok: false, reason: 'Say where it is: the club ground or a public venue.' };
  if (t.length > 120) return { ok: false, reason: 'Keep the place short.' };
  if (HOMEISH.test(t)) return { ok: false, reason: 'Sessions must be at a club ground or a public venue, not at someone’s home.' };
  if (hasPersonalDetails(t)) return { ok: false, reason: 'Do not put phone numbers, emails or links in the place.' };
  return { ok: true };
}

export function checkWhen(startsAt: Date, now: Date = new Date()): Verdict {
  if (!(startsAt.getTime() > now.getTime())) return { ok: false, reason: 'Pick a time in the future.' };
  if (startsAt.getTime() > now.getTime() + SESSION_MAX_DAYS * 86_400_000) return { ok: false, reason: `Sessions can be set up to ${SESSION_MAX_DAYS} days ahead.` };
  return { ok: true };
}

export const checkCapacity = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 2 && n <= 30;

// ── Cricket Connect ─────────────────────────────────────────────────────────────────────────────

export const STANDARDS = ['social', 'club', 'league', 'county'] as const;
export type Standard = (typeof STANDARDS)[number];
export const AVAILABILITY = ['weekday_evenings', 'weekends'] as const;
export type Availability = (typeof AVAILABILITY)[number];
/** How far away, in miles, a card may be. Rough on purpose. */
export const WITHIN_MILES = [5, 10, 25] as const;
export const ROLE_FILTERS = ['player', 'coach'] as const;
export type RoleFilter = (typeof ROLE_FILTERS)[number];

export type ConnectFilters = { role?: RoleFilter; standard?: Standard; availability?: Availability; within?: number };

export const isStandard = (v: unknown): v is Standard => typeof v === 'string' && (STANDARDS as readonly string[]).includes(v);
export const isAvailability = (v: unknown): v is Availability => typeof v === 'string' && (AVAILABILITY as readonly string[]).includes(v);
export const isRole = (v: unknown): v is RoleFilter => typeof v === 'string' && (ROLE_FILTERS as readonly string[]).includes(v);

export type Card = { roles: string[]; standard: Standard | null; availability: Availability[]; miles: number | null };

/** Whether a card passes the filters. A card with nothing filled in for a filter does not match it. */
export function matchesFilters(c: Card, f: ConnectFilters): boolean {
  if (f.role && !c.roles.includes(f.role)) return false;
  if (f.standard && c.standard !== f.standard) return false;
  if (f.availability && !c.availability.includes(f.availability)) return false;
  if (f.within !== undefined && (c.miles === null || c.miles > f.within)) return false;
  return true;
}

/**
 * Two people under 18 may connect only when each has a linked account with a parent link the club has
 * verified, so a parent is always there to be told. Adults need nothing extra.
 */
export function mayConnectJuniors(aCleared: boolean, bCleared: boolean): boolean {
  return aCleared && bCleared;
}

// ── Adult-to-junior contact, parent first ───────────────────────────────────────────────────────

export type DbsRow = { check_type: string; status: string; expiry_date: string | null };

/** A current enhanced DBS check: verified valid, enhanced (with or without the barred list), not past its expiry. */
export function dbsIsCurrent(rows: DbsRow[], today: string): boolean {
  return rows.some((r) => r.status === 'valid' && (r.check_type === 'enhanced' || r.check_type === 'enhanced_barred') && (!r.expiry_date || r.expiry_date >= today));
}

export type GuardianContext = {
  adultJunior: boolean;
  subjectJunior: boolean;
  /** The adult is a coach or club admin of a club the junior belongs to */
  staffOfSharedClub: boolean;
  /** The adult holds a current enhanced DBS check at one of those shared clubs */
  currentDbs: boolean;
  /** The junior has a linked account and at least one club-verified parent */
  juniorHasParent: boolean;
};

/** Why an adult may not ask to connect with a junior, or null if they may. */
export function guardianBlock(c: GuardianContext): string | null {
  if (c.adultJunior || !c.subjectJunior) return 'This is only for an adult asking to connect with someone under 18.';
  if (!c.staffOfSharedClub) return 'You can only ask a young person from a club where you are a coach or club admin.';
  if (!c.currentDbs) return 'You need a current enhanced DBS check recorded at that club first.';
  if (!c.juniorHasParent) return 'This young person has no verified parent linked yet.';
  return null;
}

export const GUARDIAN_NOTE_MAX = 300;
/** An adult may have this many requests waiting on a parent at once, so it cannot be used to contact many children. */
export const GUARDIAN_PENDING_MAX = 5;
/** After a parent says no, the same adult cannot ask again for this long. */
export const GUARDIAN_COOLDOWN_DAYS = 90;
