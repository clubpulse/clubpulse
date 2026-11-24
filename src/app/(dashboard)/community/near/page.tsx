import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, getViewer } from '@/lib/community/service';
import { createAdminClient } from '@/lib/supabase/admin';
import { listSessions, responsibleAdultOptions } from '@/lib/community/sessions';
import { isScope, type Scope } from '@/lib/community/rules';
import { ClosedNotice, cardStyle } from '@/components/community/ui';
import { SessionList } from '@/components/community/SessionList';
import { SessionForm } from '@/components/community/SessionForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Near me' };

export default async function NearPage({ searchParams }: { searchParams: Promise<{ scope?: string; kind?: string }> }) {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const sp = await searchParams;
  const scope: Scope = isScope(sp.scope) ? sp.scope : 'miles';
  const kind = sp.kind === 'nets' || sp.kind === 'pickup' ? sp.kind : null;
  const admin = createAdminClient();
  const viewer = await getViewer(admin, user.id);
  const [r, { data: clubs }, { data: staff }] = await Promise.all([
    listSessions(user.id, scope, kind),
    viewer.clubIds.length ? admin.from('clubs').select('id, name').in('id', viewer.clubIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    admin.from('club_members').select('role, club_id').eq('user_id', user.id).eq('is_active', true).in('role', ['coach', 'club_admin']),
  ]);
  const adults = await responsibleAdultOptions(admin, [...new Set((staff ?? []).map((m) => m.club_id as string))]);
  const chip = (href: string, label: string, on: boolean) => <Link key={href} href={href} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: on ? 'rgba(96,165,250,0.25)' : 'transparent' }}>{label}</Link>;
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>Nets and games near me</h1>
      <p>Sessions are at club grounds or public venues. Under-18s see only their own club’s junior sessions.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {chip(`/community/near?scope=club`, 'My club', scope === 'club')}{chip(`/community/near?scope=miles`, 'Near me', scope === 'miles')}{chip(`/community/near?scope=county`, 'My county', scope === 'county')}
        {chip(`/community/near?scope=${scope}&kind=nets`, 'Nets', kind === 'nets')}{chip(`/community/near?scope=${scope}&kind=pickup`, 'Pick-up', kind === 'pickup')}
      </div>
      {r.success ? <SessionList sessions={r.data} /> : <p>{r.error}</p>}
      {!viewer.junior && (clubs ?? []).length > 0 && (
        <div style={{ ...cardStyle, marginTop: 24 }}><h2 style={{ marginTop: 0 }}>Set one up</h2>
          <SessionForm clubs={clubs ?? []} canHostJunior={(staff ?? []).length > 0} adults={adults} /></div>
      )}
    </div>
  );
}
