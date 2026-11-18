// Pure rules for joining a club and posting a shift. No database here, so it can be tested.

import type { ShiftRole } from '@/lib/types/volunteer-shifts';

/* ── Join codes ────────────────────────────────────────────────────────────── */

// No 0/O, 1/I/L or 5/S: codes are read out and typed on phones
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ2346789';
export const CODE_LENGTH = 6;

/** A new join code. `random` returns 0 to 1 and is swapped out in tests. */
export function newJoinCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  return code;
}

/**
 * Tidies what someone typed: capitals, no spaces or dashes. Returns null if it cannot be a code.
 * Older codes made in the database use 0 to 9 and A to F, so any letter or digit is accepted here.
 */
export function normaliseJoinCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return /^[A-Z0-9]{6}$/.test(code) ? code : null;
}

/* ── Posting a shift ───────────────────────────────────────────────────────── */

export const SHIFT_ROLES: ShiftRole[] = ['scorer', 'umpire', 'groundskeeper', 'tea_duty', 'first_aid', 'general'];

export type ShiftInput = {
  title: string;
  description?: string;
  role: ShiftRole;
  shift_date: string;
  start_time: string;
  end_time: string;
  location?: string;
  max_volunteers: number;
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** Checks a shift sent from the app. `today` is the club's date as YYYY-MM-DD. */
export function parseShiftInput(body: unknown, today: string): Parsed<ShiftInput> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request' };
  const input = body as Record<string, unknown>;

  const title = text(input.title, 80);
  if (title.length < 3) return { ok: false, error: 'Give the shift a title of at least 3 letters' };

  if (!SHIFT_ROLES.includes(input.role as ShiftRole)) return { ok: false, error: 'Choose what kind of shift this is' };

  const date = text(input.shift_date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))
    || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    return { ok: false, error: 'Choose a date' };
  }
  if (date < today) return { ok: false, error: 'The date is in the past' };

  const time = (value: unknown) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text(value, 5));
    return match ? `${match[1]}:${match[2]}` : null;
  };
  const start = time(input.start_time);
  const end = time(input.end_time);
  if (!start || !end) return { ok: false, error: 'Times must be like 09:30' };
  if (end <= start) return { ok: false, error: 'The shift has to end after it starts' };

  const needed = Number(input.max_volunteers ?? 1);
  if (!Number.isInteger(needed) || needed < 1 || needed > 50) return { ok: false, error: 'Volunteers needed must be between 1 and 50' };

  const description = text(input.description, 500);
  const location = text(input.location, 120);
  return {
    ok: true,
    value: {
      title, role: input.role as ShiftRole, shift_date: date, start_time: start, end_time: end, max_volunteers: needed,
      ...(description ? { description } : {}),
      ...(location ? { location } : {}),
    },
  };
}
