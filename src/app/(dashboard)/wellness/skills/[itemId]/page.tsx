import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { itemById } from '@/lib/wellness/skills';

export async function generateMetadata({ params }: { params: Promise<{ itemId: string }> }): Promise<Metadata> {
  const found = itemById((await params).itemId);
  return { title: found ? `${found.item.title} | Wellness` : 'Wellness' };
}

export default async function SkillPage({ params }: { params: Promise<{ itemId: string }> }) {
  await requireUser();
  const found = itemById((await params).itemId);
  if (!found) notFound();
  const { section, item } = found;
  const box = { padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', marginBottom: 16 } as const;
  return (
    <article style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <p><Link href="/wellness/skills">← Mental skills</Link> · {section.title}</p>
      <h1>{item.title}</h1>
      <p>{item.summary}</p>
      <p role="note" style={{ ...box, fontSize: 14 }}>This is general preparation, not medical advice.</p>

      {item.kind === 'read' && (<>{item.paragraphs.map((p, i) => <p key={i}>{p}</p>)}<h2>Try this</h2><ul>{item.points.map((p, i) => <li key={i}>{p}</li>)}</ul></>)}
      {item.kind === 'tips' && <ul>{item.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>}
      {item.kind === 'checklist' && (<><p>{item.intro}</p><ul>{item.items.map((t, i) => <li key={i}>{t}</li>)}</ul></>)}
      {item.kind === 'guided' && (
        <>
          <p>About {item.minutes} minute{item.minutes === 1 ? '' : 's'}. Read each step, take the time shown, then move on. Stop at any point if you feel unwell or light-headed.</p>
          <ol>{item.steps.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s.say} <span style={{ opacity: 0.7 }}>({s.seconds} seconds)</span></li>)}</ol>
        </>
      )}
      {item.kind === 'week' && (
        <>
          <h2>The idea</h2>{item.learn.map((p, i) => <p key={i}>{p}</p>)}
          <h2>At the nets: {item.drill.title}</h2><ol>{item.drill.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          <h2>Each day</h2>
          <p>{item.daily.id ? <Link href={`/wellness/skills/${item.daily.id}`}>{item.daily.label}</Link> : item.daily.route ? <Link href={item.daily.route}>{item.daily.label}</Link> : item.daily.label}</p>
          <h2>At the end of the week</h2><p>{item.check}</p>
        </>
      )}
      <p style={{ marginTop: 32, fontSize: 14, opacity: 0.8 }}>Not feeling right? <Link href="/wellness/support">Where to get support</Link>.</p>
    </article>
  );
}
