// POST /api/scratch-cards/reveal  { cardId }  → { prize }
// Opens one of the member's own earned cards. The draw is made in the database, not in the app.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { revealCardForUser } from '@/lib/scratch/service';
import { isUuid } from '@/lib/utils/validate';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const cardId = ((await readJson(req)) as { cardId?: unknown } | null)?.cardId;
  if (typeof cardId !== 'string' || !isUuid(cardId)) return fail('Send the id of the card to open.', 400);

  const res = await revealCardForUser(user.id, cardId);
  if (!res.success) return fail(res.error, /18 or over|junior/i.test(res.error) ? 403 : undefined);
  return NextResponse.json({ prize: res.data.prize });
}
