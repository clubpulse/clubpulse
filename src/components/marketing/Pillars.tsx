'use client';

import Link from 'next/link';
import { Glyph } from '@/components/icons/Glyph';
// The four pillars of ShiftUp as a bento grid. Each card says plainly what is available now and
// what is coming, so the page never promises more than the app does today.

import { BentoCard, BentoGrid } from '@/components/magic';

type Status = 'live' | 'app' | 'soon';
type Item = { text: string; status: Status };
type Pillar = { name: string; tag: string; colour: string; icon: string; line: string; items: Item[]; col: number; href: string };

const STATUS_LABEL: Record<Status, string> = { live: 'Live now', app: 'In the app', soon: 'Coming soon' };
const STATUS_COLOUR: Record<Status, string> = { live: '#4ADE80', app: '#60A5FA', soon: '#EFC84A' };

// Every bullet carries a status, so the page never promises more than the product does today.
const PILLARS: Pillar[] = [
  {
    name: 'Player Analysis', href: '/players/analysis', tag: 'Technique', colour: '#FBBF24', icon: '🎥', col: 4,
    line: 'Film a shot or a delivery and see exactly what to work on.',
    items: [
      { text: 'Video analysis of your batting and bowling', status: 'live' },
      { text: 'Coach AI is in development and being validated, not biomechanically validated', status: 'soon' },
      { text: 'Your stats and a shareable Cricket CV', status: 'live' },
    ],
  },
  {
    name: 'Community', href: '/players/community', tag: 'Connection', colour: '#60A5FA', icon: '🤝', col: 2,
    line: 'A social network for cricketers: find players, clubs and games near you.',
    items: [
      { text: 'Club noticeboard and dressing room, inside your club', status: 'live' },
      { text: 'Feed, connections, follows, and nets and games near you, built with safeguarding and moderation. Opening to clubs once final safety checks are complete', status: 'soon' },
    ],
  },
  {
    name: 'Wellness', href: '/players/wellness', tag: 'Preparation', colour: '#F472B6', icon: '🧘', col: 2,
    line: 'Look after your body and your head, and arrive ready to play.',
    items: [
      { text: 'Pre-match readiness check-in and trend, match-day checklist and your own routine, weekly check-in, match mood and injury log', status: 'live' },
      { text: 'Mental-skills guides and a private recovery log, with where to get support', status: 'live' },
      { text: 'Animated breathing circle and timer', status: 'app' },
    ],
  },
  {
    name: 'Academy', href: '/players/academy', tag: 'Learning', colour: '#2DD4BF', icon: '🎓', col: 4,
    line: 'Short lessons, daily questions and games that make you a better cricketer.',
    items: [
      { text: 'Two-minute lessons, a practice plan and ShiftUp certificates for finishing a track', status: 'live' },
      { text: 'Daily games, and a log for your ECB qualifications', status: 'live' },
      { text: 'Courses written by your coach', status: 'soon' },
    ],
  },
];

export function Pillars() {
  return (
    <section id="pillars" style={{ padding: '96px 24px', background: '#05080f', borderTop: '1px solid rgba(255,255,255,0.06)' }} aria-labelledby="pillars-h">
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EFC84A', marginBottom: 12 }}>Four pillars for every player</p>
        <h2 id="pillars-h" style={{ fontFamily: 'var(--font-syne), Bricolage Grotesque, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, lineHeight: 1.08, color: '#E8EDF5', maxWidth: 720 }}>
          Analysis, community, wellness and learning, in one place.
        </h2>
        <p style={{ marginTop: 16, maxWidth: 640, fontSize: 16, lineHeight: 1.6, color: 'rgba(232,237,245,0.6)' }}>
          Scores run across all four pillars. You earn them by taking part, and they are never sold. They are not a fifth pillar.
        </p>

        <div style={{ marginTop: 44 }}>
          <BentoGrid>
            {PILLARS.map((p, idx) => (
              <BentoCard key={p.name} colour={p.colour} col={p.col} row={1} beam={idx === 0}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="mu-float" style={{ fontSize: 34, animationDelay: `${idx * 0.6}s` }} aria-hidden><Glyph e={p.icon} /></span>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-syne), Bricolage Grotesque, sans-serif', fontSize: 26, fontWeight: 800, color: p.colour, lineHeight: 1.05 }}><Link href={p.href} style={{ color: 'inherit', textDecoration: 'none' }}>{p.name}</Link></h3>
                    <p style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(232,237,245,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p.tag}</p>
                  </div>
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: '#E8EDF5' }}>{p.line}</p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: 0, margin: 0 }}>
                  {p.items.map((i) => (
                    <li key={i.text} style={{ display: 'flex', gap: 8, fontSize: 13.5, lineHeight: 1.45, color: 'rgba(232,237,245,0.72)' }}>
                      <span style={{ color: p.colour }} aria-hidden>●</span>
                      <span>
                        {i.text}
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: STATUS_COLOUR[i.status], border: `1px solid ${STATUS_COLOUR[i.status]}66`, borderRadius: 99, padding: '1px 8px', whiteSpace: 'nowrap' }}>{STATUS_LABEL[i.status]}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </BentoCard>
            ))}

          </BentoGrid>
        </div>
      </div>
    </section>
  );
}
