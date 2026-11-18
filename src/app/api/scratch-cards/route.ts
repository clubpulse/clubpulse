// GET /api/scratch-cards → the member's waiting and opened cards, the prize chances, and any age gate

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getMyScratchCards } from '@/lib/scratch/service';
import { unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getMyScratchCards(user.id));
}
