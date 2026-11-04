/**
 * Tango Card RaaS (Rewards as a Service) API client.
 *
 * SERVER-SIDE ONLY — TANGO_PLATFORM_NAME and TANGO_PLATFORM_KEY must
 * never reach the browser.
 *
 * Docs: https://dev.tangocard.com/docs/
 *
 * Key concepts:
 *   - Each gift card brand is a "catalog item" with a UTID (unique token ID).
 *   - To issue a voucher we POST to /v2/orders with the UTID + amount + recipient.
 *   - The API returns a redemption token the player uses to claim their gift card.
 *
 * Environment variables required:
 *   TANGO_PLATFORM_NAME  — your platform name (from Tango dashboard)
 *   TANGO_PLATFORM_KEY   — your platform API key
 *   TANGO_ACCOUNT_ID     — your Tango account identifier
 *   TANGO_SANDBOX        — set to "true" to use sandbox endpoint
 */

const TANGO_BASE = process.env.TANGO_SANDBOX === 'true'
  ? 'https://sandbox.tangocard.com/raas/v2'
  : 'https://integration-api.tangocard.com/raas/v2';

function tangoHeaders(): HeadersInit {
  const name = process.env.TANGO_PLATFORM_NAME;
  const key  = process.env.TANGO_PLATFORM_KEY;
  if (!name || !key) throw new Error('Tango Card credentials not configured');
  return {
    'Content-Type':  'application/json',
    'Authorization': 'Basic ' + Buffer.from(`${name}:${key}`).toString('base64'),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type TangoCatalogItem = {
  utid:         string;
  rewardName:   string;
  brandName:    string;
  currencyCode: string;
  minValue:     number;
  maxValue:     number;
  imageUrls:    { 84: string; 278: string; pngUrl?: string };
  rewardType:   'variable' | 'fixed';
  status:       'active' | 'inactive';
};

export type TangoOrderResult =
  | { ok: true;  utid: string; referenceOrderID: string; reward: { token: string; credentialsRequired: boolean; redemptionInstructions: string; expirationDate?: string } }
  | { ok: false; error: string };

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch the full gift card catalogue.
 * Cache for 1 hour — the catalogue rarely changes.
 */
export async function getTangoCatalogue(): Promise<TangoCatalogItem[]> {
  const res = await fetch(`${TANGO_BASE}/catalogs`, {
    headers: tangoHeaders(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Tango catalogue fetch failed: ${res.status}`);
  const json = await res.json();
  // Tango returns { brands: [{ brandName, items: [...] }] }
  const brands: Array<{ brandName: string; items: TangoCatalogItem[] }> = json.brands ?? [];
  return brands.flatMap(b => b.items.map(i => ({ ...i, brandName: b.brandName })));
}

/**
 * Place an order to issue a gift card voucher.
 *
 * @param utid          Tango UTID for the reward (e.g. "U386185")
 * @param amountGBP     Face value in GBP (e.g. 5.00 for a £5 voucher)
 * @param recipientEmail  Player's email — Tango may also send directly
 * @param externalRefId   Our redemption_id for idempotency / audit trail
 */
export async function placeTangoOrder(
  utid:           string,
  amountGBP:      number,
  recipientEmail: string,
  externalRefId:  string,
): Promise<TangoOrderResult> {
  const accountId = process.env.TANGO_ACCOUNT_ID;
  if (!accountId) return { ok: false, error: 'Tango account ID not configured' };

  let res: Response;
  try {
    res = await fetch(`${TANGO_BASE}/orders`, {
      method:  'POST',
      headers: tangoHeaders(),
      body: JSON.stringify({
        accountIdentifier: accountId,
        amount:            amountGBP,
        utid,
        // Tango sends the voucher directly to the player's email as well
        recipient: {
          email:     recipientEmail,
          firstName: 'ClubPulse',
          lastName:  'Player',
        },
        // Our ID for deduplication — Tango is idempotent on this per platform
        externalRefID: externalRefId,
        sendEmail:     true,
      }),
    });
  } catch (err) {
    return { ok: false, error: `Network error: ${err instanceof Error ? err.message : 'unknown'}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ok: false, error: `Tango order failed (${res.status}): ${body}` };
  }

  const json = await res.json();
  return {
    ok:               true,
    utid:             json.reward?.utid ?? utid,
    referenceOrderID: json.referenceOrderID,
    reward:           json.reward,
  };
}
