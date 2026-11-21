'use client';

import Link from 'next/link';
import type { SessionCard } from '@/lib/community/sessions';
import { joinSessionAction, cancelSessionAction, reportProfileAction } from '@/lib/actions/community-social';
import { ActionButton, ReportButton, cardStyle } from './ui';

export function SessionList({ sessions }: { sessions: SessionCard[] }) {
  if (!sessions.length) return <p>Nothing set up yet.</p>;
  return (
    <>
      {sessions.map((s) => (
        <div key={s.id} style={{ ...cardStyle, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{s.kind === 'nets' ? 'Nets' : 'Pick-up game'}{s.band === 'junior' ? ' · juniors' : ''}</p>
          <h3 style={{ margin: '4px 0' }}>{s.title}</h3>
          <p style={{ margin: 0 }}>{new Date(s.startsAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {s.place}</p>
          <p style={{ margin: '4px 0' }}>{s.club}{s.distance ? ` · ${s.distance}` : ''} · hosted by <Link href={`/community/people/${s.hostId}`}>{s.host}</Link> · {s.taken}/{s.capacity} places</p>
          {s.note && <p style={{ margin: '4px 0' }}>{s.note}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {s.canJoin && <ActionButton label="Join" run={() => joinSessionAction(s.id, true)} />}
            {s.joined && <ActionButton quiet label="Leave" run={() => joinSessionAction(s.id, false)} />}
            {s.mine && <ActionButton quiet label="Cancel session" confirm="Cancel this session?" run={() => cancelSessionAction(s.id)} />}
            {!s.mine && <ReportButton run={(reason) => reportProfileAction(s.hostId, `Session "${s.title}": ${reason}`)} />}
          </div>
        </div>
      ))}
    </>
  );
}
