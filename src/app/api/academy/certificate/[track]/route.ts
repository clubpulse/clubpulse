// GET /api/academy/certificate/<track | graduate> → { name, title, completedOn, graduate }, only for someone who has passed every lesson it covers

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, unauthorized } from '@/lib/utils/http';
import { isCertificateKey } from '@/lib/academy/logic';
import { getCertificate } from '@/lib/academy/service';

export async function GET(req: NextRequest, ctx: { params: Promise<{ track: string }> }) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const { track } = await ctx.params;
  if (!isCertificateKey(track)) return fail('Certificate not found.');
  const cert = await getCertificate(user.id, track);
  return cert ? NextResponse.json(cert) : fail('Certificate not found.');
}
