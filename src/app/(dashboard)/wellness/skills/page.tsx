import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { SECTIONS } from '@/lib/wellness/skills';

export const metadata: Metadata = { title: 'Mental skills | Wellness' };

export default async function SkillsPage() {
  await requireUser();
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>Mental skills</h1>
      <p>Breathing, focus, routines and pressure, written for cricketers. This is general preparation, not medical advice. If something is weighing on you, see <Link href="/wellness/support">where to get support</Link>.</p>
      {SECTIONS.map((s) => (
        <section key={s.key} style={{ marginBottom: 24 }}>
          <h2>{s.icon} {s.title} <span style={{ fontSize: 14, opacity: 0.7 }}>· {s.plain}</span></h2>
          <p>{s.intro}</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {s.items.map((i) => (
              <li key={i.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Link href={`/wellness/skills/${i.id}`}><strong>{i.title}</strong></Link> <span style={{ opacity: 0.7 }}>· {i.minutes} min</span>
                <div style={{ opacity: 0.85 }}>{i.summary}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
