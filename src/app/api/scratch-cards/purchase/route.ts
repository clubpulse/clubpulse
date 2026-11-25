// POST /api/scratch-cards/purchase
// Paid scratch cards (£0.49 and £0.99) are switched off.
// TODO: Gambling Act review and age verification before PAID_SCRATCH_CARDS_ENABLED is turned on.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { PAID_SCRATCH_CARDS_ENABLED } from '@/lib/nav/menu';
import { unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!PAID_SCRATCH_CARDS_ENABLED) {
    return NextResponse.json({ error: 'Paid scratch cards are switched off.' }, { status: 403 });
  }
  return NextResponse.json({ error: 'Paid scratch cards are not on sale.' }, { status: 403 });
}
