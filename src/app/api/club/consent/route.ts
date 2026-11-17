import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { recordConsent, getConsentHistory } from '@/lib/admin/parent-service';
import { childAccess } from '@/lib/mobile/club-data';
import type { ConsentType, ConsentAction } from '@/lib/types/parent';

// GET — consent history for a child
export async function GET(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const childId = url.searchParams.get('childId');
    if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

    // The service below uses the service role, so access is checked here: only a linked
    // parent or an admin of the child's club may see a child's consent history
    if (!(await childAccess(user.id, childId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const history = await getConsentHistory(childId);
    return NextResponse.json({ history });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST — record consent grant or withdrawal
export async function POST(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { childId, consentType, action, notes } = body as {
      childId: string;
      consentType: ConsentType;
      action: ConsentAction;
      notes?: string;
    };

    if (!childId || !consentType || !action) {
      return NextResponse.json({ error: 'childId, consentType, and action required' }, { status: 400 });
    }

    // Consent is the parent's decision: only someone linked to the child can give or withdraw it
    if ((await childAccess(user.id, childId)) !== 'parent') return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const ua = req.headers.get('user-agent') ?? undefined;

    const result = await recordConsent(childId, user.id, consentType, action, {
      ip_address: ip,
      user_agent: ua,
      notes,
    });

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
