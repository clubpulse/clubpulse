import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { communityOpen, getViewer } from '@/lib/community/service';
import { isScope, WITHIN_MILES, type Scope } from '@/lib/community/rules';
import { listShortages } from '@/lib/community/shortages';
import { ShortageForm, ShortageList } from '@/components/community/ShortageBoard';
import { ClosedNotice, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Looking for players' };

export default async function ShortagesPage({ searchParams }: { searchParams: Promise<{ scope?: string; within?: string }> }) {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const sp = await searchParams;
  const scope: Scope = isScope(sp.scope) ? sp.scope : 'miles';
  const within = (WITHIN_MILES as readonly number[]).includes(Number(sp.within)) ? Number(sp.within) : undefined;
  const admin = createAdminClient();
  const viewer = await getViewer(admin, user.id);
  if (viewer.junior) return <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}><h1>Looking for players</h1><p>This is for adult games. Your coach will tell you about junior fixtures.</p></div>;
  const [r, { data: staffClubs }] = await Promise.all([
    listShortages(user.id, scope, within),
    admin.from('club_members').select('club_id, clubs ( id, name )').eq('user_id', user.id).eq('is_active', true).in('role', ['coach', 'club_admin']),
  ]);
  const clubs = (staffClubs ?? []).flatMap((m) => { const c = (Array.isArray(m.clubs) ? m.clubs[0] : m.clubs) as { id: string; name: string } | null; return c ? [c] : []; });
  const chip = (href: string, label: string, on: boolean) => <Link key={href} href={href} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: on ? 'rgba(96,165,250,0.25)' : 'transparent' }}>{label}</Link>;
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>Looking for players</h1>
      <p>Clubs that need players for a game. Say you can play and they will see your name and club. Adults only.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {chip('/community/shortages?scope=club', 'My club', scope === 'club')}{chip('/community/shortages?scope=miles', 'Near me', scope === 'miles')}{chip('/community/shortages?scope=county', 'My county', scope === 'county')}
        {WITHIN_MILES.map((m) => chip(`/community/shortages?scope=${scope}&within=${m}`, `${m} miles`, within === m))}
      </div>
      {r.success ? <ShortageList shortages={r.data.shortages} /> : <p>{r.error}</p>}
      {clubs.length > 0 && <div style={{ ...cardStyle, marginTop: 24 }}><h2 style={{ marginTop: 0 }}>Short of players?</h2><ShortageForm clubs={clubs} /></div>}
    </div>
  );
}
