import Link from 'next/link';
import type { AcademyResponse } from '@/lib/academy/service';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 } as const;

export function Catalogue({ academy }: { academy: AcademyResponse }) {
  const finished = academy.tracks.filter((t) => t.done === t.total).length;
  return (
    <section aria-label="Academy courses" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {academy.unavailable && <p role="alert" style={card}>{academy.unavailable}</p>}
      <div style={card}>
        <p style={{ margin: 0 }}><strong>{academy.level.title}</strong> · {academy.tracks.reduce((n, t) => n + t.done, 0)} of {academy.tracks.reduce((n, t) => n + t.total, 0)} lessons passed · {finished} of {academy.tracks.length} tracks finished</p>
        {finished === academy.tracks.length && <p style={{ marginBottom: 0 }}><Link href="/academy/certificate/graduate">Open your Academy Graduate certificate</Link></p>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {academy.tracks.map((t) => (
          <Link key={t.key} href={`/academy/tracks/${t.key}`} style={{ ...card, textDecoration: 'none', color: 'inherit' }}>
            <p style={{ fontSize: 28, margin: 0 }} aria-hidden>{t.icon}</p>
            <h2 style={{ margin: '4px 0' }}>{t.title}</h2>
            <p style={{ margin: '0 0 8px', opacity: 0.85 }}>{t.blurb}</p>
            <progress value={t.done} max={t.total} aria-label={`${t.title} progress`} style={{ width: '100%' }} />
            <p style={{ margin: '4px 0 0' }}>{t.done} of {t.total} passed</p>
          </Link>
        ))}
      </div>
      <p style={{ margin: 0 }}><Link href="/academy/plan">Make a practice plan</Link> · <Link href="/games">Games</Link> · <Link href="/qualifications">Qualifications</Link></p>
    </section>
  );
}
