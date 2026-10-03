// ─────────────────────────────────────────────
// GET + POST /api/awin/webhook
// Awin postback URL — receives commission events and awards Creds.
// Register in Awin dashboard: https://yourdomain.com/api/awin/webhook?token=<AWIN_WEBHOOK_SECRET>
// (or send the secret in an x-webhook-secret header)
// ─────────────────────────────────────────────

import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { commissionToCreds, calcShoppingSplit } from '@/lib/awin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Parse params from either GET (query string) or POST (JSON body)
async function parseAwinParams(req: NextRequest): Promise<Record<string, string>> {
  if (req.method === 'GET') {
    const params: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((v, k) => { params[k] = v; });
    return params;
  }
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function secretMatches(provided: string, secret: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handleWebhook(req: NextRequest) {
  const secret = process.env.AWIN_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const { token, ...params } = await parseAwinParams(req);
  const provided = req.headers.get('x-webhook-secret') ?? token ?? '';
  if (!secretMatches(provided, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Awin sends: clickref (our user_id), transactionid, commissionamount, currency, status
  const {
    clickref:        userId,
    transactionid:   awinTransactionId,
    commissionamount,
    currency = 'GBP',
    status   = 'pending',
    advertiserid:    advertiserId,
    orderref:        orderRef,
    saleamount:      saleAmount,
  } = params;

  if (!userId || !awinTransactionId || !commissionamount) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  if (!UUID_RE.test(userId)) {
    return NextResponse.json({ error: 'Invalid clickref' }, { status: 400 });
  }

  const commissionGBP = parseFloat(commissionamount);
  if (!Number.isFinite(commissionGBP) || commissionGBP < 0) {
    return NextResponse.json({ error: 'Invalid commission amount' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Idempotent — Awin may resend
  const { data: existing } = await supabase
    .from('awin_transactions')
    .select('id, user_id, status, creds_awarded')
    .eq('awin_transaction_id', awinTransactionId)
    .maybeSingle();

  if (existing) {
    // Pending → confirmed/approved with nothing awarded yet: award the Creds now
    const lateCreds = (status === 'confirmed' || status === 'approved') && existing.creds_awarded === 0
      ? calcShoppingSplit(commissionToCreds(commissionGBP)).athleteCreds
      : 0;

    if (lateCreds > 0) {
      // Claim first: only the request that flips creds_awarded from 0 awards the Creds
      const { data: claimed } = await supabase
        .from('awin_transactions')
        .update({
          status,
          commission_gbp: commissionGBP,
          creds_awarded:  lateCreds,
          updated_at:     new Date().toISOString(),
        })
        .eq('awin_transaction_id', awinTransactionId)
        .eq('creds_awarded', 0)
        .select('id');

      if (!claimed?.length) return NextResponse.json({ ok: true, duplicate: true });

      const { error: lateAwardError } = await supabase.rpc('increment_creds_balance', {
        p_user_id: existing.user_id,
        p_amount:  lateCreds,
      });

      if (lateAwardError) {
        // Release the claim so Awin's retry can try again
        await supabase
          .from('awin_transactions')
          .update({ status: existing.status, creds_awarded: 0, updated_at: new Date().toISOString() })
          .eq('awin_transaction_id', awinTransactionId);
        return NextResponse.json({ error: 'Failed to award Creds' }, { status: 500 });
      }

      return NextResponse.json({ ok: true, lateAward: true, athleteCreds: lateCreds, status });
    }

    // Otherwise just record a status change (e.g. pending → declined)
    if (existing.status !== status) {
      await supabase
        .from('awin_transactions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('awin_transaction_id', awinTransactionId);
    }
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Calculate Creds — only award on confirmed/approved transactions
  const totalCreds = status === 'confirmed' || status === 'approved'
    ? commissionToCreds(commissionGBP)
    : 0;

  const { athleteCreds, clubCreds } = calcShoppingSplit(totalCreds);

  // Insert transaction record (token already stripped from the stored payload)
  const { error: insertError } = await supabase.from('awin_transactions').insert({
    user_id:             userId,
    awin_transaction_id: awinTransactionId,
    advertiser_id:       advertiserId ?? null,
    order_ref:           orderRef ?? null,
    sale_amount_gbp:     saleAmount ? parseFloat(saleAmount) : null,
    commission_gbp:      commissionGBP,
    currency,
    status,
    creds_awarded:       athleteCreds,
    raw_payload:         params,
  });

  if (insertError) {
    if (insertError.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
    if (insertError.code === '23503') return NextResponse.json({ error: 'Unknown user' }, { status: 400 });
    return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
  }

  // Award athlete Creds (club split handled separately when club wallet exists)
  if (athleteCreds > 0) {
    const { error: awardError } = await supabase.rpc('increment_creds_balance', {
      p_user_id: userId,
      p_amount:  athleteCreds,
    });

    if (awardError) {
      // Roll back the record so Awin's retry is processed instead of treated as a duplicate
      await supabase.from('awin_transactions').delete().eq('awin_transaction_id', awinTransactionId);
      return NextResponse.json({ error: 'Failed to award Creds' }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok:           true,
    athleteCreds,
    clubCreds,
    totalCreds,
    status,
  });
}

export async function GET(req: NextRequest) {
  return handleWebhook(req);
}

export async function POST(req: NextRequest) {
  return handleWebhook(req);
}
