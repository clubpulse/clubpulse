// Pure rules for merchandise orders: what a delivery address must contain. No database, no
// network, so it can be tested directly. UK addresses only for now.

export type Delivery = {
  size: string | null;
  name: string;
  line1: string;
  line2: string | null;
  town: string;
  postcode: string;
};

export type MerchState = 'to_order' | 'ordered';

// Standard UK postcode shapes (A9 9AA, A99 9AA, AA9 9AA, AA99 9AA, A9A 9AA, AA9A 9AA) and GIR 0AA
const UK_POSTCODE = /^(GIR 0AA|[A-PR-UWYZ][A-HK-Y]?[0-9][0-9A-HJKPSTUW]? [0-9][ABD-HJLNP-UW-Z]{2})$/;

/** "sl13gy" → "SL1 3GY". Returns null when it is not a UK postcode. */
export function normalisePostcode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const squashed = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (squashed.length < 5 || squashed.length > 7) return null;
  const spaced = `${squashed.slice(0, -3)} ${squashed.slice(-3)}`;
  return UK_POSTCODE.test(spaced) ? spaced : null;
}

const text = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export type ParsedDelivery = { ok: true; value: Delivery } | { ok: false; error: string };

/** Checks and tidies what the member typed. `sizes` is what the item comes in; empty = no sizes. */
export function parseDelivery(raw: unknown, sizes: readonly string[]): ParsedDelivery {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  let size: string | null = null;
  if (sizes.length > 0) {
    if (typeof body.size !== 'string' || !sizes.includes(body.size)) return { ok: false, error: 'Choose a size.' };
    size = body.size;
  }

  const name = text(body.name, 80);
  if (name.length < 2) return { ok: false, error: 'Enter the name to put on the parcel.' };

  const line1 = text(body.line1, 100);
  if (line1.length < 3) return { ok: false, error: 'Enter the first line of the address.' };

  const town = text(body.town, 60);
  if (town.length < 2) return { ok: false, error: 'Enter the town or city.' };

  const postcode = normalisePostcode(body.postcode);
  if (!postcode) return { ok: false, error: 'Enter a UK postcode. We can only post within the UK for now.' };

  return { ok: true, value: { size, name, line1, line2: text(body.line2, 100) || null, town, postcode } };
}

/** The address as lines for a label. */
export function addressLines(d: Delivery): string[] {
  return [d.name, d.line1, d.line2, d.town, d.postcode].filter((l): l is string => !!l);
}
