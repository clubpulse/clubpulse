import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, getNearby } from '@/lib/community/service';
import { isScope, LOOKING_FOR, type LookingFor, type Scope } from '@/lib/community/rules';
import { connectAction } from '@/lib/actions/community-social';
import { ActionButton, ClosedNotice, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Find a teammate' };

const LABEL: Record<LookingFor, string> = { net_partner: 'Net partner', club: 'A club', coach: 'A coach', teammates: 'Teammates' };

export default async function MatchPage({ searchParams }: { searchParams: Promise<{ scope?: string; want?: string }> }) {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const sp = await searchParams;
  const scope: Scope = isScope(sp.scope) ? sp.scope : 'miles';
  const want = (LOOKING_FOR as readonly string[]).includes(sp.want ?? '') ? (sp.want as LookingFor) : 'net_partner';
  const r = await getNearby(user.id, scope, want);
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>Find a teammate</h1>
      <p>People who have said they are looking for the same thing. Adults and under-18s are matched only within their own age group.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {LOOKING_FOR.map((w) => <Link key={w} href={`/community/match?scope=${scope}&want=${w}`} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: w === want ? 'rgba(96,165,250,0.25)' : 'transparent' }}>{LABEL[w]}</Link>)}
      </div>
      {r.success && r.data.people.length === 0 && <p>Nobody matching yet. Add what you are looking for on <Link href="/community/profile">your profile</Link>.</p>}
      {r.success && r.data.people.map((p) => (
        <div key={p.id} style={{ ...cardStyle, marginBottom: 12 }}>
          <Link href={`/community/people/${p.id}`}><strong>{p.name}</strong></Link>{p.club ? ` · ${p.club}` : ''}{p.distance ? ` · ${p.distance}` : ''}
          {p.headline && <p style={{ margin: '4px 0' }}>{p.headline}</p>}
          <ActionButton label="Say yes" run={connectAction.bind(null, p.id, true)} />
        </div>
      ))}
    </div>
  );
}
