import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, getNearby, getNearbyClubs } from '@/lib/community/service';
import { isScope, LOOKING_FOR, WITHIN_MILES, type LookingFor, type Scope } from '@/lib/community/rules';
import { filtersFrom } from '@/lib/community/filters';
import { CardStack } from '@/components/community/CardStack';
import { ClosedNotice, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Find a teammate' };

const LABEL: Record<LookingFor, string> = { net_partner: 'Net partner', club: 'A club', coach: 'A coach', teammates: 'Teammates' };
type Q = { scope?: string; want?: string; role?: string; standard?: string; availability?: string; within?: string };

export default async function MatchPage({ searchParams }: { searchParams: Promise<Q> }) {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const sp = await searchParams;
  const scope: Scope = isScope(sp.scope) ? sp.scope : 'miles';
  const want = (LOOKING_FOR as readonly string[]).includes(sp.want ?? '') ? (sp.want as LookingFor) : 'net_partner';
  const filters = filtersFrom((k) => sp[k as keyof Q]);
  const [r, clubs] = await Promise.all([getNearby(user.id, scope, want, filters), getNearbyClubs(user.id, scope, filters.within)]);

  // A link that changes one filter and keeps the rest
  const href = (change: Partial<Record<keyof Q, string | null>>) => {
    const next: Record<string, string> = { scope, want, ...Object.fromEntries(Object.entries({ role: sp.role, standard: sp.standard, availability: sp.availability, within: sp.within }).filter(([, v]) => v)) } as Record<string, string>;
    for (const [k, v] of Object.entries(change)) { if (v === null) delete next[k]; else if (v !== undefined) next[k] = v; }
    return `/community/match?${new URLSearchParams(next).toString()}`;
  };
  const chip = (on: boolean) => ({ padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: on ? 'rgba(96,165,250,0.25)' : 'transparent' }) as const;
  const group = (title: string, items: Array<{ label: string; to: string; on: boolean }>) => (
    <div style={{ marginBottom: 10 }}>
      <span style={{ fontSize: 13, opacity: 0.7, marginRight: 8 }}>{title}</span>
      {items.map((i) => <Link key={i.label} href={i.to} style={{ ...chip(i.on), marginRight: 6, display: 'inline-block', marginBottom: 6 }}>{i.label}</Link>)}
    </div>
  );

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>Find a teammate</h1>
      <p>People who have said they are looking for the same thing. Adults and under-18s are matched only within their own age group.</p>
      {group('Looking for', LOOKING_FOR.map((w) => ({ label: LABEL[w], to: href({ want: w }), on: w === want })))}
      {group('Who', [{ label: 'Players', to: href({ role: sp.role === 'player' ? null : 'player' }), on: sp.role === 'player' }, { label: 'Coaches', to: href({ role: sp.role === 'coach' ? null : 'coach' }), on: sp.role === 'coach' }])}
      {group('Standard', (['social', 'club', 'league', 'county'] as const).map((s) => ({ label: s[0].toUpperCase() + s.slice(1), to: href({ standard: sp.standard === s ? null : s }), on: sp.standard === s })))}
      {group('Free', [{ label: 'Weekday evenings', to: href({ availability: sp.availability === 'weekday_evenings' ? null : 'weekday_evenings' }), on: sp.availability === 'weekday_evenings' }, { label: 'Weekends', to: href({ availability: sp.availability === 'weekends' ? null : 'weekends' }), on: sp.availability === 'weekends' }])}
      {group('Within', WITHIN_MILES.map((m) => ({ label: `${m} miles`, to: href({ within: sp.within === String(m) ? null : String(m) }), on: sp.within === String(m) })))}

      {r.success && r.data.notice && <p style={cardStyle}>{r.data.notice}</p>}
      {r.success && <CardStack key={JSON.stringify(sp)} people={r.data.people} />}

      {clubs.success && clubs.data.clubs.length > 0 && (
        <>
          <h2 style={{ marginTop: 32 }}>Clubs near you</h2>
          {clubs.data.clubs.map((c) => (
            <Link key={c.id} href={`/community/clubs/${c.id}`} style={{ ...cardStyle, display: 'block', marginBottom: 12 }}>
              <strong>{c.name}</strong>
              <div style={{ opacity: 0.7 }}>{[c.county, c.league, c.distance].filter(Boolean).join(' · ')}</div>
              {c.headline && <p style={{ margin: '6px 0 0' }}>{c.headline}</p>}
              {c.netsNotes && <p style={{ margin: '4px 0 0', opacity: 0.8 }}>Nets: {c.netsNotes}</p>}
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
