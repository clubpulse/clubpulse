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
