import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getAcademy } from '@/lib/academy/service';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Academy track' };

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  const user = await requireUser();
  const academy = await getAcademy(user.id);
  const t = academy.tracks.find((x) => x.key === track);
  if (!t) notFound();
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <p><Link href="/academy">← Academy</Link></p>
      <h1>{t.icon} {t.title}</h1>
      <p>{t.blurb}</p>
      <p>{t.done} of {t.total} passed. Do the lessons in any order.</p>
      <ol style={{ padding: 0, listStyle: 'none' }}>
        {t.lessons.map((l, i) => (
          <li key={l.id} style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Link href={`/academy/lessons/${l.id}`}><strong>{i + 1}. {l.title}</strong></Link> <span style={{ opacity: 0.7 }}>· {l.minutes} min</span>
            <div>{l.passed ? `Passed${l.bestScore !== null ? ` (${l.bestScore}/3)` : ''}` : l.bestScore !== null ? `Best so far ${l.bestScore}/3` : 'Not started'}</div>
          </li>
        ))}
      </ol>
      {t.done === t.total && <p><Link href={`/academy/certificate/${t.key}`}>Open your certificate</Link></p>}
    </div>
  );
}
