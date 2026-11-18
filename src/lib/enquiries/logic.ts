// What the contact form can send, and the checks on it. No database here, so it can be tested.

export const NEEDS = [
  { value: 'membership', label: 'Members and fees' },
  { value: 'selection', label: 'Availability and team selection' },
  { value: 'volunteers', label: 'Volunteers and shifts' },
  { value: 'juniors', label: 'Juniors, parents and safeguarding' },
  { value: 'coaching', label: 'Coaching and video analysis' },
  { value: 'rewards', label: 'Scores and rewards for members' },
  { value: 'sponsors', label: 'Sponsors and local businesses' },
  { value: 'custom', label: 'Something built for our club' },
] as const;

export const CLUB_SIZES = ['Under 50 members', '50 to 150', '150 to 300', 'Over 300', 'A league or federation'] as const;

export type Enquiry = {
  name: string;
  email: string;
  club_name: string | null;
  role: string | null;
  members: string | null;
  needs: string[];
  message: string | null;
};

type Parsed = { ok: true; value: Enquiry } | { ok: false; error: string; silent?: boolean };

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export function parseEnquiry(body: unknown): Parsed {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request' };
  const input = body as Record<string, unknown>;

  // A field people cannot see. Only a script fills it in, and it is told all went well.
  if (text(input.website, 200)) return { ok: false, error: 'spam', silent: true };

  const name = text(input.name, 100);
  if (name.length < 2) return { ok: false, error: 'Please tell us your name' };
  const email = text(input.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'That email address does not look right' };

  const allowed = NEEDS.map((n) => n.value) as readonly string[];
  const needs = Array.isArray(input.needs) ? [...new Set(input.needs.filter((n): n is string => typeof n === 'string' && allowed.includes(n)))] : [];
  const message = text(input.message, 3000);
  if (needs.length === 0 && message.length < 10) return { ok: false, error: 'Tick what you need, or tell us a little in the message' };

  const members = text(input.members, 60);
  return {
    ok: true,
    value: {
      name, email, needs,
      club_name: text(input.club, 120) || null,
      role: text(input.role, 60) || null,
      members: (CLUB_SIZES as readonly string[]).includes(members) ? members : null,
      message: message || null,
    },
  };
}
