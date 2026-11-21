'use client';

// The four pillars of ClubPulse as a bento grid. Each card says plainly what is available now and
// what is coming, so the page never promises more than the app does today.

import Link from 'next/link';
import { BentoCard, BentoGrid, BorderBeam, NumberTicker } from '@/components/magic';

type Item = { text: string; soon?: boolean };
type Pillar = { name: string; tag: string; colour: string; icon: string; line: string; items: Item[]; col: number };

const PILLARS: Pillar[] = [
  {
    name: 'The Nets', tag: 'Technique', colour: '#FBBF24', icon: '🎥', col: 4,
    line: 'Film a shot or a delivery and see exactly what to work on.',
    items: [
      { text: 'AI shot and bowling analysis from your phone video' },
      { text: 'Compare with your previous attempts: what got better, what did not' },
      { text: 'Coach AI that knows your progress' },
      { text: 'Book a coach your club approves, who can follow your progress' },
    ],
  },
  {
    name: 'Pavilion', tag: 'Community', colour: '#60A5FA', icon: '🤝', col: 2,
    line: 'A social network for cricketers: find players and clubs near you.',
    items: [
      { text: 'Club feed with photos and video', soon: true },
      { text: 'Find people by miles, club, league or county', soon: true },
      { text: 'Every post checked before it appears', soon: true },
    ],
  },
  {
    name: 'Warm-Up', tag: 'Wellness', colour: '#F472B6', icon: '🧘', col: 2,
    line: 'Mental preparation: mindset, mindfulness and match-day routines.',
    items: [
      { text: 'Mind Nets: a six-week programme', soon: true },
      { text: 'Guided breathing and meditation', soon: true },
      { text: 'Match-day checklists and a pre-ball routine', soon: true },
    ],
  },
  {
    name: 'Academy', tag: 'Learning', colour: '#2DD4BF', icon: '🎓', col: 4,
    line: 'Short lessons, daily questions and games that make you a better cricketer.',
    items: [
      { text: 'Two-minute lessons on skills, the game, fitness and the wider game' },
      { text: 'A practice plan built for you' },
      { text: 'A daily cricket question, and games such as the Auction Room' },
      { text: 'Safeguarding-aware by design for junior cricketers' },
    ],
  },
];

export function Pillars() {
  return (
    <section id="pillars" style={{ padding: '96px 24px', background: '#05080f', borderTop: '1px solid rgba(255,255,255,0.06)' }} aria-labelledby="pillars-h">
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EFC84A', marginBottom: 12 }}>One app, four pillars</p>
        <h2 id="pillars-h" style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, lineHeight: 1.08, color: '#E8EDF5', maxWidth: 720 }}>
          Technique, community, mindset and learning, in one place.
        </h2>
        <p style={{ marginTop: 16, maxWidth: 640, fontSize: 16, lineHeight: 1.6, color: 'rgba(232,237,245,0.6)' }}>
          Everything you do on ClubPulse earns Scores, and milestones earn badges you can share. Scores are earned by taking part. They are never sold.
        </p>

        <div style={{ marginTop: 44 }}>
          <BentoGrid>
            {PILLARS.map((p, idx) => (
              <BentoCard key={p.name} colour={p.colour} col={p.col} row={1} beam={idx === 0}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="mu-float" style={{ fontSize: 34, animationDelay: `${idx * 0.6}s` }} aria-hidden>{p.icon}</span>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontSize: 26, fontWeight: 800, color: p.colour, lineHeight: 1.05 }}>{p.name}</h3>
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
                        {i.soon && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#EFC84A', border: '1px solid rgba(239,200,74,0.4)', borderRadius: 99, padding: '1px 8px', whiteSpace: 'nowrap' }}>Coming soon</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </BentoCard>
            ))}

            <article className="mu-bento-card" style={{ gridColumn: 'span 6', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 28, borderColor: 'rgba(239,200,74,0.35)', background: 'radial-gradient(120% 140% at 0% 50%, rgba(239,200,74,0.14), transparent 60%), rgba(7,16,43,0.85)' }}>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontSize: 'clamp(54px, 8vw, 88px)', fontWeight: 800, lineHeight: 1, color: '#EFC84A' }}>
                <NumberTicker value={108} />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <h3 style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#E8EDF5' }}>badges on the Honours Board</h3>
                <p style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(232,237,245,0.7)' }}>
                  Daily, weekly and monthly Run Chase tasks earn Scores, and every milestone earns a badge. Share one with your friends. It never shows your name or your club.
                  <span style={{ color: 'rgba(232,237,245,0.5)' }}> Badges in the app are coming soon.</span>
                </p>
              </div>
              <Link href="/features" style={{ fontSize: 14, fontWeight: 700, color: '#EFC84A', textDecoration: 'none' }}>See all features →</Link>
              <BorderBeam from="#EFC84A" to="#F472B6" duration={10} />
            </article>
          </BentoGrid>
        </div>
      </div>
    </section>
  );
}
