// GET /api/admin/sport-configs            → { configs, canEdit }   (any club admin)
// PUT /api/admin/sport-configs  { id, earning_rules, is_active? } → { config }   (platform admins only)
// Sport configs are global: changing a rate changes it for every club, hence the stricter PUT.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getAdminContext } from '@/lib/auth/admin';
import { listSportConfigs, updateSportConfig } from '@/lib/admin/service';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const ctx = await getAdminContext(user.id);
  if (ctx.adminClubIds.length === 0 && !ctx.isPlatformAdmin) return fail('Forbidden', 403);

  const result = await listSportConfigs();
  if (!result.success) return fail(result.error, 500);
  return NextResponse.json({ configs: result.data, canEdit: ctx.isPlatformAdmin });
}

export async function PUT(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { id?: unknown; earning_rules?: unknown; is_active?: unknown } | null;
  if (typeof body?.id !== 'string') return fail('id is required', 400);

  const result = await updateSportConfig(user.id, body.id, body.earning_rules, body.is_active);
  if (!result.success) return fail(result.error);
  return NextResponse.json({ config: result.data });
}
