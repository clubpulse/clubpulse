'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { connectAnswerAction } from '@/lib/actions/community-social';

export type CardPerson = { id: string; name: string; club: string | null; roles: string[]; distance: string | null; headline: string; lookingFor: string[]; openToClub: boolean; standard: string | null; availability: string[] };

const LABEL: Record<string, string> = {
  net_partner: 'Net partner', club: 'A club', coach: 'A coach', teammates: 'Teammates',
  weekday_evenings: 'Weekday evenings', weekends: 'Weekends', social: 'Social', league: 'League', county: 'County',
};
const pill = { padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', fontSize: 13 } as const;

/** One person at a time. Connect or Not now, and the next card slides up. */
export function CardStack({ people }: { people: CardPerson[] }) {
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const p = people[index];

  const answer = (yes: boolean) => {
    if (!p || pending) return;
    start(async () => {
      const r = await connectAnswerAction(p.id, yes);
      if (!r.success) { setNote(r.error ?? 'That did not work.'); return; }
      setNote(yes ? (r.link === 'connected' ? `You and ${p.name} are connected.` : r.link === 'awaiting_parents' ? `You both said yes. Your parents need to say yes before you can message ${p.name}.` : `Sent. You will be connected if ${p.name} says yes too.`) : null);
      setIndex((i) => i + 1);
    });
  };

  return (
    <div>
      {note && <p role="status" style={{ background: 'rgba(96,165,250,0.14)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: 10, padding: 10 }}>{note}</p>}
      {!p ? <p>That is everyone for now. Try a wider area, or add more to <Link href="/community/profile">your profile</Link> so others can find you.</p> : (
        <div style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 18, padding: 20, background: 'rgba(255,255,255,0.04)' }}>
          <h2 style={{ margin: 0 }}>{p.name}</h2>
          <p style={{ opacity: 0.75, margin: '4px 0 12px' }}>{[p.roles.map((r) => r[0].toUpperCase() + r.slice(1)).join(' and '), p.club, p.distance].filter(Boolean).join(' · ')}</p>
          {p.headline && <p>{p.headline}</p>}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {p.openToClub && <span style={{ ...pill, background: '#60A5FA', color: '#0B1220', fontWeight: 600 }}>Open to a new club</span>}
            {p.standard && <span style={pill}>{LABEL[p.standard] ?? p.standard}</span>}
            {p.lookingFor.map((k) => <span key={k} style={pill}>{LABEL[k] ?? k}</span>)}
            {p.availability.map((k) => <span key={k} style={pill}>{LABEL[k] ?? k}</span>)}
          </div>
          <p><Link href={`/community/people/${p.id}`}>See full profile</Link></p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" disabled={pending} onClick={() => answer(false)} style={{ flex: 1, padding: 12, borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'inherit', fontWeight: 600 }}>Not now</button>
            <button type="button" disabled={pending} onClick={() => answer(true)} style={{ flex: 1, padding: 12, borderRadius: 999, border: 0, background: '#60A5FA', color: '#0B1220', fontWeight: 700 }}>Connect</button>
          </div>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 0 }}>{people.length - index - 1} more after this. Distance is rough and club to club.</p>
        </div>
      )}
    </div>
  );
}
