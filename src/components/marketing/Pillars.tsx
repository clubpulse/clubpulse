// The four pillars of ClubPulse, for the home page. Each says plainly what is available now and
// what is coming, so the page never promises more than the app does today.

import Link from 'next/link';

type Item = { text: string; soon?: boolean };
type Pillar = { name: string; tag: string; colour: string; icon: string; line: string; items: Item[] };

const PILLARS: Pillar[] = [
  {
    name: 'The Nets', tag: 'Technique', colour: '#FBBF24', icon: '🎥',
    line: 'Film a shot or a delivery and see exactly what to work on.',
    items: [
      { text: 'AI shot and bowling analysis from your phone video' },
      { text: 'Compare with your previous attempts: what got better, what did not' },
      { text: 'Coach AI that knows your progress' },
      { text: 'Book a coach your club approves, who can follow your progress' },
    ],
  },
  {
    name: 'Pavilion', tag: 'Community', colour: '#60A5FA', icon: '🤝',
    line: 'A social network for cricketers: find players and clubs near you, share, and connect.',
    items: [
      { text: 'Club feed with photos and video', soon: true },
      { text: 'Find cricketers and clubs by miles, club, league or county', soon: true },
      { text: 'Open to a new club, and clubs looking for players', soon: true },
      { text: 'Every post checked by ClubPulse before it appears', soon: true },
    ],
  },
  {
    name: 'Warm-Up', tag: 'Wellness', colour: '#F472B6', icon: '🧘',
    line: 'Mental preparation for the game: mindset, mindfulness and match-day routines.',
    items: [
      { text: 'Mind Nets: a six-week programme of mental skills', soon: true },
      { text: 'Guided breathing, focus and meditation sessions', soon: true },
      { text: 'Match-day checklists and a pre-ball routine builder', soon: true },
      { text: 'A thought for the day, and where to get support', soon: true },
    ],
  },
  {
    name: 'Academy', tag: 'Learning', colour: '#2DD4BF', icon: '🎓',
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
    <section style={{ padding: '88px 24px', background: '#05080f', borderTop: '1px solid rgba(255,255,255,0.06)' }} aria-labelledby="pillars-h">
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EFC84A', marginBottom: 12 }}>One app, four pillars</p>
        <h2 id="pillars-h" style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800, lineHeight: 1.1, color: '#E8EDF5', maxWidth: 720 }}>
          Technique, community, mindset and learning, in one place.
        </h2>
        <p style={{ marginTop: 16, maxWidth: 640, fontSize: 16, lineHeight: 1.6, color: 'rgba(232,237,245,0.6)' }}>
          Everything you do on ClubPulse earns Scores, and milestones earn badges you can share. Scores are earned by taking part. They are never sold.
        </p>

        <div style={{ marginTop: 44, display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          {PILLARS.map((p) => (
            <article key={p.name} style={{ borderRadius: 18, border: `1px solid ${p.colour}55`, background: `linear-gradient(160deg, ${p.colour}1F, rgba(7,16,43,0.9) 60%)`, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 30 }} aria-hidden>{p.icon}</span>
                <div>
                  <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: p.colour, lineHeight: 1.1 }}>{p.name}</h3>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(232,237,245,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{p.tag}</p>
                </div>
              </div>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#E8EDF5' }}>{p.line}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, padding: 0, margin: 0 }}>
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
            </article>
          ))}
        </div>

        <div style={{ marginTop: 32, borderRadius: 18, border: '1px solid rgba(239,200,74,0.3)', background: 'rgba(239,200,74,0.06)', padding: '22px 24px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 28 }} aria-hidden>🏅</span>
          <p style={{ flex: 1, minWidth: 240, fontSize: 14.5, lineHeight: 1.55, color: '#E8EDF5' }}>
            <strong style={{ color: '#EFC84A' }}>Run Chase and the Honours Board.</strong> Daily, weekly and monthly tasks earn Scores, and 108 badges mark what you have achieved. Share a badge with your friends. It never shows your name or your club. <span style={{ color: 'rgba(232,237,245,0.55)' }}>Badges in the app are coming soon.</span>
          </p>
          <Link href="/features" style={{ fontSize: 14, fontWeight: 700, color: '#EFC84A', textDecoration: 'none' }}>See all features →</Link>
        </div>
      </div>
    </section>
  );
}
